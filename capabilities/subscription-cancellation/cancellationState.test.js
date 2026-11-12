import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainMember, escalation, assertNoAllClear, currentRow, TERMS } from './cancellationState.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/members.json', import.meta.url), 'utf8'));
const run = (k, over = {}) => explainMember({ ...structuredClone(fx.members[k]), ...over });
const get = (r, name) => r.claims.find((c) => c.claim === name);
const SOURCES = ['subscription row', 'gateway read'];
const text = (r) => [...r.claims.map((c) => c.value ?? c.reason), ...r.flags].join('\n');

// Acceptance, part 1: every claim traces to the subscription row or a gateway read.
test('every claim traces to the subscription row or a gateway read', () => {
  for (const k of Object.keys(fx.members)) {
    for (const c of run(k).claims) {
      if (c.status === 'known') {
        assert.ok(SOURCES.includes(c.source), `${k}/${c.claim}: source "${c.source}"`);
        assert.ok(c.field, `${k}/${c.claim}: no field named`);
      } else {
        assert.equal(c.source, null, `${k}/${c.claim}`);
        assert.equal(c.value, null, `${k}/${c.claim}`);
        assert.ok(c.reason, `${k}/${c.claim}: unknown without a reason`);
      }
    }
  }
});

// Acceptance, part 2: no schedule id means the suspend is a no-op, said as such, and
// nothing in the answer implies the member is clear of charges.
test('no schedule id: the suspend is called a no-op, never an all-clear', () => {
  const r = run('active_manual');
  assert.equal(get(r, 'schedule').value, 'no schedule id on the row');
  const s = get(r, 'suspend_on_cancel');
  assert.equal(s.source, 'subscription row');
  assert.match(s.value, /^a no-op/);
  assert.match(s.value, /cannot show whether anything else charges them/);
  assert.equal(get(r, 'gateway_schedule').status, 'unknown');
  for (const k of Object.keys(fx.members)) assert.doesNotThrow(() => assertNoAllClear(text(run(k)).split('\n')), k);
});

test('the all-clear guard refuses lines that say the member is clear of charges', () => {
  for (const l of ['The member will not be charged again.', 'They are safe from further charges.', 'Billing has stopped.', "You won't be billed."]) {
    assert.throws(() => assertNoAllClear([l]), /Refused/, l);
  }
  assert.doesNotThrow(() => assertNoAllClear(['The gateway reads schedule SCH-41 as Suspended.']));
});

test('happy path: an active member on a schedule, confirmed at the gateway', () => {
  const r = run('active_on_schedule');
  assert.equal(get(r, 'subscription').value, 'monthly active');
  assert.equal(get(r, 'schedule').value, 'schedule SCH-41 is on the row');
  assert.match(get(r, 'gateway_schedule').value, /^Active, read Nov 11, 2026, 2:00 PM CST$/);
  assert.equal(get(r, 'gateway_schedule').source, 'gateway read');
  assert.equal(get(r, 'cancellation').value, 'not cancelled');
  assert.equal(get(r, 'suspend_on_cancel'), undefined);
  assert.deepEqual(r.flags, []);
});

test('a cancelled member: time in Central, reason as entered, access until the period end', () => {
  const r = run('cancelled_clean');
  // 1 Nov 2026 is the day daylight time ends; both sides of the change are checked.
  assert.equal(get(r, 'canceled_at').value, 'Nov 1, 2026, 7:30 PM CST');
  assert.equal(get(run('cancelled_schedule_live'), 'canceled_at').value, 'Oct 25, 2026, 1:00 PM CDT');
  assert.equal(get(r, 'cancel_reason').value, '"Changing roles; no time this quarter", as entered when the member cancelled');
  assert.equal(get(r, 'access_until').value, 'Nov 30, 2026, 10:00 AM CST');
  assert.equal(get(r, 'suspend_on_cancel'), undefined, 'a cancelled row is not described as a pending suspend');
});

test('cancel_reason written by something other than the member is named as such', () => {
  assert.match(get(run('comp_revoked'), 'cancel_reason').value, /an admin revoking free access \(subscriptionService\.ts:689\)/);
  const pd = run('past_due');
  assert.match(get(pd, 'cancellation').value, /^not cancelled\. The reason field holds a failed-payment note/);
  assert.equal(get(pd, 'cancel_reason'), undefined);
});

test('records that do not fit together are flagged for a person', () => {
  const live = run('cancelled_schedule_live');
  assert.equal(live.flags.length, 2);
  assert.match(live.flags[1], /gateway reads schedule SCH-77 as Active\. The member may still be charged: urgent/);
  assert.match(run('suspended_book_live').flags[0], /book shows schedule SCH-90 live, but the gateway reads it as Suspended/);
  assert.match(run('past_due').flags[0], /cannot be taken down from the portal/);
});

test('the current row is chosen as the platform does: newest active, else newest not failed', () => {
  assert.equal(get(run('older_active_newer_failed'), 'subscription').value, 'monthly active');
  assert.equal(currentRow([{ status: 'failed', created_at: '2026-01-01' }]), null);
  // The 2026-08-12 trap: a newer cancelled duplicate must not hide an older active row.
  const rows = [{ status: 'canceled', created_at: '2026-08-12T00:00:00Z' }, { status: 'active', created_at: '2026-07-01T00:00:00Z' }];
  assert.equal(currentRow(rows).status, 'active');
  assert.equal(get(run('nobody'), 'subscription').value, 'none on record');
});

test('cancellation terms are unapproved: what is owed is unknown and no terms are stated', () => {
  for (const k of Object.keys(fx.members)) {
    const o = get(run(k), 'owed_on_cancel');
    assert.equal(o.status, 'unknown');
    assert.match(o.reason, /pending final approval.*salesHubCoryController\.ts:33/);
  }
  assert.equal(TERMS.approved, false);
  assert.doesNotMatch(text(run('cancelled_clean')), /\b\d+[- ]day\b|pro-?rat|refund of/i);
});

test('cancel requests go to a person; the agent never cancels', () => {
  const e = escalation('Please cancel my membership');
  assert.match(e.to, /person with admin access/);
  assert.match(e.lines[0], /does not cancel, suspend a schedule or change a subscription/);
  assert.throws(() => escalation(''), RangeError);
});

test('failure paths: gateway read missing, for the wrong schedule, or without a status; rows unreadable; bad status; no name', () => {
  assert.match(get(run('active_on_schedule', { gatewayRead: null }), 'gateway_schedule').reason, /cannot reach PaySimple/);
  assert.match(get(run('active_on_schedule', { gatewayRead: { schedule_id: 'SCH-99', ScheduleStatus: 'Active' } }), 'gateway_schedule').reason, /not SCH-41/);
  assert.equal(get(run('active_on_schedule', { gatewayRead: { schedule_id: 'SCH-41' } }), 'gateway_schedule').status, 'unknown');
  assert.equal(run('active_on_schedule', { gatewayRead: { schedule_id: 'SCH-99', ScheduleStatus: 'Suspended' } }).flags.length, 0);
  assert.equal(get(run('nobody', { subscriptions: null }), 'subscription').status, 'unknown');
  const odd = structuredClone(fx.members.active_on_schedule.subscriptions); odd[0].status = 'paused';
  assert.equal(get(run('active_on_schedule', { subscriptions: odd }), 'subscription').status, 'unknown');
  assert.throws(() => run('nobody', { name: ' ' }), RangeError);
});

test('idempotent and read-only: same answer, records untouched', () => {
  const input = structuredClone(fx.members.cancelled_schedule_live);
  const before = JSON.stringify(input);
  assert.deepEqual(explainMember(input), explainMember(input));
  assert.equal(JSON.stringify(input), before);
});
