import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainPerson, healthClaims, PATHS, preflightList } from './paymentState.js';
import { classifyStatus, countsAsPaid, PAID_RULE } from './paidRule.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/people.json', import.meta.url), 'utf8'));
const run = (k, over = {}) => explainPerson({ ...structuredClone(fx.people[k]), samples: structuredClone(fx.samples), now: fx.now, ...over });
const get = (r, name) => r.claims.filter((c) => c.claim === name);
const SOURCES = ['enrolment row', 'subscription row', 'webhook health samples', 'gateway read'];

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

// The decided rule (program lead, 2026-11-12): only Settled or Posted counts as paid.
test('the paid rule: settled or posted only, any case, and an unknown status is never guessed', () => {
  assert.equal(countsAsPaid('Settled'), true);
  assert.equal(countsAsPaid('posted'), true);
  assert.equal(countsAsPaid('authorized'), false, 'Authorized does not count, though the sync says it does');
  assert.equal(countsAsPaid('Pending'), false);
  for (const s of ['Returned', 'ReturnedNSF', 'Reversed', 'Refunded', 'ChargeBack', 'Voided']) assert.equal(classifyStatus(s), 'reversed', s);
  assert.equal(classifyStatus('Declined'), 'failed');
  assert.equal(countsAsPaid('Captured'), null);
  assert.equal(countsAsPaid(undefined), null);
  assert.equal(PAID_RULE.decided, '2026-11-12');
});

const pay = (status, id = 55501) => ({ gatewayRead: { payment_id: id, status } });

test('counts_as_paid is unknown without a gateway read, and names the payment to look up', () => {
  const c = get(run('paid_enrolment'), 'counts_as_paid')[0];
  assert.equal(c.status, 'unknown');
  assert.match(c.reason, /does not store the payment's own status.*payment 55501.*Only Settled or Posted counts as paid/);
  assert.match(get(run('paid_by_hand'), 'counts_as_paid')[0].reason, /No payment id/);
});

test('a gateway read applies the rule, cites the read, and flags disagreement for a person', () => {
  const ok = run('paid_enrolment', pay('Settled'));
  assert.deepEqual(get(ok, 'counts_as_paid')[0], { claim: 'counts_as_paid', value: 'yes: the payment provider reads it as Settled', status: 'known', source: 'gateway read', field: 'status' });
  assert.deepEqual(ok.flags, []);
  const auth = run('paid_enrolment', pay('authorized'));
  assert.match(get(auth, 'counts_as_paid')[0].value, /^no: .*authorized, which has not settled/);
  assert.match(auth.flags[0], /Marked paid, but .* authorized\. .* does not count as paid yet/);
  const back = run('paid_enrolment', pay('Returned'));
  assert.match(back.flags[0], /access is removed and the seat freed\. A person does that; Vick changes nothing\./);
});

test('failure paths: a read for another payment, or an uncovered status, stays unknown', () => {
  const other = run('paid_enrolment', pay('Settled', 99999));
  assert.equal(get(other, 'counts_as_paid')[0].status, 'unknown');
  assert.match(get(other, 'counts_as_paid')[0].reason, /for payment 99999, not 55501/);
  assert.deepEqual(other.flags, []);
  assert.equal(get(run('paid_enrolment', pay('Captured')), 'counts_as_paid')[0].status, 'unknown');
});

test('pre-flight list: both groups by name, and every paid enrolment lands somewhere', () => {
  const e = (name, payment_status, id) => ({ name, enrolment: { payment_status, paysimple_payment_id: id } });
  const enrolments = [e('Person P', 'paid', 1), e('Person Q', 'paid', 2), e('Person R', 'paid', 3), e('Person S', 'paid', null),
    e('Person T', 'paid', 4), e('Person U', 'paid', 5), e('Person V', 'pending', 6), e('Person W', 'paid', 7)];
  const reads = [{ payment_id: 1, status: 'Returned' }, { payment_id: 2, status: 'Authorized' }, { payment_id: 3, status: 'Posted' },
    { payment_id: 4, error: 'timeout' }, { payment_id: 5, status: 'Mystery' }, { payment_id: 6, status: 'Authorized' }];
  const before = JSON.stringify({ enrolments, reads });
  const p = preflightList({ enrolments, reads });
  assert.deepEqual(p.reversed.map((r) => r.name), ['Person P']);
  assert.deepEqual(p.waiting.map((r) => r.name), ['Person Q'], 'the group the dry run cannot see');
  assert.deepEqual(p.keeps.map((r) => r.name), ['Person R']);
  assert.deepEqual(p.unknown.map((r) => [r.name, r.reason]), [['Person S', 'no payment id recorded'], ['Person T', 'lookup failed: timeout'],
    ['Person U', 'status "Mystery" is not covered by the rule'], ['Person W', 'not looked up']]);
  const total = p.reversed.length + p.waiting.length + p.keeps.length + p.unknown.length;
  assert.equal(total, enrolments.filter((x) => x.enrolment.payment_status === 'paid').length, 'no paid enrolment dropped');
  assert.deepEqual(preflightList({ enrolments, reads }), p, 'same answer twice');
  assert.equal(JSON.stringify({ enrolments, reads }), before, 'inputs untouched');
  assert.throws(() => preflightList({ enrolments: null }), RangeError);
  assert.equal(preflightList({ enrolments: [], reads: [] }).keeps.length, 0);
});
