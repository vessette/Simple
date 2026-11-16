import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explain, lists } from './checkoutExplainer.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/roster.json', import.meta.url), 'utf8'));
const row = (p) => structuredClone(fx.rows.find((r) => r.person === p).row);

// Acceptance: every verdict names the payment_status and the latest subscription status;
// a paid former member is explicitly excluded with the reason.
test('every verdict names the payment_status and the latest subscription status', () => {
  const shapes = [];
  for (const ps of ['paid', 'pending', 'pending_invoice', 'failed', 'refunded', '', undefined]) {
    for (const st of [null, 'pending', 'active', 'canceled', 'failed', 'past_due', 'trialing']) {
      shapes.push({ payment_status: ps, subscription: st === null ? null : { plan: 'monthly', status: st, created_at: '2026-11-01T10:00:00Z' } });
    }
  }
  for (const r of [...shapes, ...fx.rows.map((x) => x.row)]) {
    const v = explain('P', r);
    assert.ok('payment_status' in v && 'latest_subscription_status' in v);
    assert.equal(v.latest_subscription_status, r.subscription ? r.subscription.status : null);
    assert.match(v.why, v.payment_status === null ? /payment_status is missing/ : new RegExp(`payment_status is "${v.payment_status}"`));
    assert.match(v.why, r.subscription ? new RegExp(`status "${r.subscription.status}"`) : /no subscription row/);
    assert.ok(v.cites.length > 0);
  }
});

test('a paid former member with a pending renewal checkout is excluded, with the reason', () => {
  const v = explain('P3', row('P3'));
  assert.equal(v.verdict, 'excluded_paid');
  assert.equal(v.excluded_reason, 'paid_former_member_with_pending_renewal');
  assert.equal(v.on_abandoned_list, false);
  assert.equal(v.on_not_paid_list, false);
  assert.match(v.why, /paid former member with a pending renewal checkout, not a prospect/);
  assert.equal(explain('P4', row('P4')).excluded_reason, 'paid');
});

test('pending with a pending latest subscription is an abandoned checkout, with its start date', () => {
  const v = explain('P1', row('P1'));
  assert.deepEqual([v.verdict, v.on_abandoned_list, v.on_not_paid_list, v.checkout_started], ['abandoned_checkout', true, true, '2026-11-02T15:04:00.000Z']);
  const noDate = row('P1'); delete noDate.subscription.created_at;
  assert.equal(explain('P1', noDate).checkout_started, null);
  assert.match(explain('P1', noDate).why, /checkout date is missing/);
});

test('a free Explorer signup never appears on the abandoned list', () => {
  const v = explain('P2', row('P2'));
  assert.deepEqual([v.verdict, v.excluded_reason, v.on_abandoned_list, v.on_not_paid_list], ['excluded_explorer', 'free_explorer_signup', false, true]);
});

test('a checkout later completed leaves the list once the payment is linked', () => {
  const before = row('P1');
  assert.equal(explain('P1', before).on_abandoned_list, true);
  const after = { ...before, payment_status: 'paid', subscription: { ...before.subscription, status: 'active' } };
  assert.equal(explain('P1', after).on_abandoned_list, false);
  // Even if the subscription row lags behind, a paid status alone takes them off.
  assert.equal(explain('P1', { ...before, payment_status: 'paid' }).on_abandoned_list, false);
});

test('the two lists, from the roster: abandoned by checkout date, not-paid includes Explorers', () => {
  const l = lists(fx.rows);
  assert.deepEqual(l.abandoned.map((v) => v.person), ['P5', 'P1']);
  assert.deepEqual(l.not_paid_any.map((v) => v.person), ['P1', 'P2', 'P5', 'P6']);
  assert.deepEqual(l.excluded.map((v) => v.person), ['P2', 'P3', 'P4']);
  assert.equal(l.unknown.length, 0);
});

test('missing or unknown values are unknown, never guessed', () => {
  assert.equal(explain('X', { subscription: null }).verdict, 'unknown');
  assert.match(explain('X', { payment_status: '' }).why, /badge shows them as "Failed"/);
  assert.equal(explain('X', { payment_status: 'pending', subscription: { status: 'trialing' } }).verdict, 'unknown');
  assert.equal(explain('X', { payment_status: 'refunded', subscription: null }).verdict, 'unknown');
  assert.equal(explain('X', { payment_status: 'pending', subscription: { plan: 'm', status: 'pending', created_at: 'Nov 2' } }).checkout_started, null);
});

test('malformed input is refused', () => {
  assert.throws(() => explain('', row('P1')), RangeError);
  assert.throws(() => explain('P', null), RangeError);
  assert.throws(() => explain('P', []), RangeError);
  assert.throws(() => explain('P', { payment_status: 'pending', subscription: 'pending' }), RangeError);
  assert.throws(() => explain('P', { payment_status: 'pending', subscription: {} }), RangeError);
  assert.throws(() => lists('x'), RangeError);
  assert.deepEqual(lists([]), { abandoned: [], not_paid_any: [], excluded: [], unknown: [] });
});

test('read-only and deterministic: same row, same answer; the row is untouched', () => {
  const r = row('P1'); const copy = structuredClone(r);
  assert.deepEqual(explain('P1', r), explain('P1', r));
  assert.deepEqual(r, copy);
  assert.deepEqual(lists(fx.rows), lists([...fx.rows].reverse()));
});
