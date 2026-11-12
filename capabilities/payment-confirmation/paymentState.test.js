import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainPerson, healthClaims, PATHS } from './paymentState.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/people.json', import.meta.url), 'utf8'));
const run = (k, over = {}) => explainPerson({ ...structuredClone(fx.people[k]), samples: structuredClone(fx.samples), now: fx.now, ...over });
const get = (r, name) => r.claims.filter((c) => c.claim === name);
const SOURCES = ['enrolment row', 'subscription row', 'webhook health samples'];

// Acceptance: every claim traces to the enrolment, subscription or health sample it came
// from; the agent reports unknown where no record exists.
test('every claim traces to the enrolment, subscription or health sample it came from', () => {
  for (const k of Object.keys(fx.people)) {
    for (const c of run(k).claims) {
      if (c.status === 'known') {
        assert.ok(SOURCES.includes(c.source), `${k}/${c.claim}: source "${c.source}"`);
        assert.ok(c.field, `${k}/${c.claim}: no field named`);
      } else {
        assert.equal(c.source, null);
        assert.equal(c.value, null);
        assert.ok(c.reason, `${k}/${c.claim}: unknown without a reason`);
      }
    }
  }
});

test('unknown where no record exists', () => {
  const r = run('nobody');
  assert.equal(get(r, 'payment')[0].status, 'unknown');
  assert.match(get(r, 'payment')[0].reason, /No enrolment row/);
  assert.equal(get(r, 'webhook_path')[0].status, 'unknown');
  const none = run('paid_enrolment', { samples: [] });
  assert.equal(get(none, 'webhook_deliveries')[0].status, 'unknown');
  assert.match(get(none, 'webhook_deliveries')[0].reason, /lost on restart/);
});

test('happy path: a paid enrolment, its seat and the enrolment webhook path', () => {
  const r = run('paid_enrolment');
  assert.equal(get(r, 'payment')[0].value, 'paid');
  assert.equal(get(r, 'portal_access')[0].value, 'on');
  assert.match(get(r, 'seat')[0].value, /counted once in cohort-jan/);
  assert.equal(get(r, 'webhook_path')[0].value, PATHS.enrolment.handler);
  assert.equal(get(r, 'webhook_path')[0].source, 'enrolment row');
  assert.deepEqual(r.flags, []);
});

test('a member on a payment schedule: first payment by reference, renewals by schedule', () => {
  const r = run('member_on_schedule');
  const p = get(r, 'webhook_path')[0];
  assert.match(p.value, /activateByRef\(\) for the first payment, then handleScheduledChargeEvent\(\) for each renewal \(schedule SCH-9\)/);
  assert.equal(p.source, 'subscription row');
  assert.match(get(r, 'membership')[0].value, /annual active, paid through 2027-10-30/);
});

test('a pending payment: no seat counted, and the missing payment id is unknown', () => {
  const r = run('pending');
  assert.match(get(r, 'seat')[0].value, /not counted/);
  assert.equal(get(r, 'payment_id')[0].status, 'unknown');
  assert.equal(get(r, 'amount_paid')[0].status, 'unknown');
});

test('records that do not fit together are flagged for a person', () => {
  const r = run('paid_by_hand');
  assert.deepEqual(r.flags, ['Marked paid, but portal access is off.', 'Marked paid with no payment id, so it was not marked by a payment webhook.']);
  assert.equal(get(r, 'webhook_path')[0].status, 'unknown');
  const odd = run('pending', { subscriptions: [{ plan: 'monthly', status: 'active', payment_ref: 'SUB-1-1' }] });
  assert.ok(odd.flags.includes('A membership is active but the enrolment is not marked paid.'));
});

test('webhook health: last hour only, accepted and rejected counted from the samples', () => {
  const h = healthClaims(fx.samples, fx.now);
  assert.equal(h[0].value, '1 accepted and 1 rejected for a bad signature in the last hour');
  assert.equal(h[1].value, '20 minutes ago');
  const old = healthClaims([{ at: fx.now - 2 * 3600000, outcome: 'accepted' }], fx.now);
  assert.equal(old[1].status, 'unknown');
});

test('failure paths: bad status, unreadable subscriptions, no name, no time', () => {
  const r = run('paid_enrolment', { enrolment: { ...fx.people.paid_enrolment.enrolment, payment_status: 'refunded' } });
  assert.equal(get(r, 'payment')[0].status, 'unknown');
  assert.equal(get(run('paid_enrolment', { subscriptions: null }), 'membership')[0].status, 'unknown');
  assert.throws(() => run('paid_enrolment', { name: '' }), RangeError);
  assert.throws(() => run('paid_enrolment', { now: undefined }), RangeError);
});

test('idempotent and read-only: same answer, records untouched', () => {
  const input = { ...structuredClone(fx.people.member_on_schedule), samples: structuredClone(fx.samples), now: fx.now };
  const before = JSON.stringify(input);
  assert.deepEqual(explainPerson(input), explainPerson(input));
  assert.equal(JSON.stringify(input), before);
});
