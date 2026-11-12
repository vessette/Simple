import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainPayment, assertNoHedge, paidTime } from './scopeExplainer.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/reconcile.json', import.meta.url), 'utf8'));
const run = (k, over = {}) => explainPayment({ payment: structuredClone(fx.payments[k]), candidates: structuredClone(fx.candidates), claims: structuredClone(fx.claims), linkedPaymentIds: [...fx.linked], ...over });
const CHECKS = ['amount_match', 'time_window', 'customer_id_scope'];

// Acceptance: every in-scope or out-of-scope verdict cites the amount match, the time
// window and the customer-id scope; the agent never says a payment 'should probably' be linked.
test('every verdict cites the amount match, the time window and the customer-id scope', () => {
  const extra = { pathB: { payerEmail: 'b@example.com' }, shared: { payerEmail: 'c@example.com' } };
  const seen = new Set();
  for (const k of Object.keys(fx.payments)) {
    const r = run(k, extra[k] || {});
    seen.add(r.verdict);
    assert.ok(r.decided_by, `${k}: no deciding guard named`);
    assert.deepEqual(Object.keys(r.checks).sort(), [...CHECKS].sort(), k);
    for (const name of CHECKS) {
      const c = r.checks[name];
      assert.ok(['pass', 'fail', 'unknown'].includes(c.result), `${k}/${name}: ${c.result}`);
      assert.ok(c.detail, `${k}/${name}: no detail`);
      assert.match(c.rule, /\.ts:\d+/, `${k}/${name}: no file:line`);
    }
  }
  assert.deepEqual([...seen].sort(), ['in_scope', 'out_of_scope', 'unknown']);
});

test('path A: our customer id, an amount we asked for, inside the window', () => {
  const r = run('pathA');
  assert.equal(r.verdict, 'in_scope');
  assert.equal(r.path, 'customer_id');
  assert.equal(r.enrolment, 'Person A');
  assert.equal(r.decided_by, 'origin guard (path A)');
  assert.deepEqual(CHECKS.map((n) => r.checks[n].result), ['pass', 'pass', 'pass']);
  assert.match(r.checks.time_window.detail, /Paid Oct 1, 2026, 10:20 AM CDT, within 10 minutes before to 6 hours after the checkout opened Oct 1, 2026, 10:00 AM CDT/);
  assert.match(r.notes.join(' '), /not a promise of a link/);
});

test('our customer id alone is not enough: wrong amount, or outside the window, is out', () => {
  const amt = run('pathA_wrong_amount');
  assert.equal(amt.verdict, 'out_of_scope');
  assert.equal(amt.decided_by, 'origin guard');
  assert.equal(amt.checks.customer_id_scope.result, 'pass');
  assert.equal(amt.checks.amount_match.result, 'fail');
  assert.match(amt.checks.amount_match.detail, /No pending checkout asked for \$250\. Asked for: \$199/);
  const late = run('pathA_late');
  assert.equal(late.verdict, 'out_of_scope');
  assert.deepEqual(CHECKS.map((n) => late.checks[n].result), ['pass', 'fail', 'pass']);
});

test('a bootcamp or manual charge with no matching checkout never comes into scope', () => {
  const r = run('bootcamp', { payerEmail: 'a@example.com' });
  assert.equal(r.verdict, 'out_of_scope');
  assert.equal(r.decided_by, 'origin guard');
  assert.equal(r.checks.customer_id_scope.result, 'fail');
  assert.equal(r.checks.amount_match.result, 'fail');
  assert.match(r.text, /keeps bootcamp and manual charges out/);
});

test('path B: the hosted page made its own customer, so amount, window and payer email decide', () => {
  const r = run('pathB', { payerEmail: 'B@Example.com' });
  assert.equal(r.verdict, 'in_scope');
  assert.equal(r.path, 'checkout_window');
  assert.equal(r.enrolment, 'Person B');
  assert.match(r.checks.amount_match.detail, /\$149 is an amount we asked for \(\$199 or \$149 after credit\)/);
  assert.equal(r.checks.customer_id_scope.result, 'fail');
  assert.match(r.notes.join(' '), /webhook missed this payment/);
  const other = run('pathB', { payerEmail: 'someone@example.com' });
  assert.equal(other.verdict, 'out_of_scope');
  assert.equal(other.decided_by, 'payer identity (path B)');
  const none = run('pathB');
  assert.equal(none.verdict, 'unknown');
  assert.match(none.text, /needs the payer's email on PaySimple customer 777\. A person has to look it up/);
});

test('a shared customer id fails closed for path A, and the path B gap is flagged', () => {
  const r = run('shared', { payerEmail: 'c@example.com' });
  assert.equal(r.checks.customer_id_scope.result, 'fail');
  assert.match(r.checks.customer_id_scope.detail, /claimed by 2 enrolments, so path A refuses it/);
  assert.equal(r.verdict, 'in_scope');
  assert.equal(r.path, 'checkout_window');
  assert.match(r.notes.join(' '), /path B does not check the payment's customer id/);
  const noClaims = run('pathA', { claims: null });
  assert.equal(noClaims.checks.customer_id_scope.result, 'unknown');
  assert.equal(noClaims.verdict, 'unknown');
});

test('the reconciler counts Authorized as collected; Vick says the agreed rule does not', () => {
  const r = run('authorized');
  assert.equal(r.verdict, 'in_scope');
  assert.match(r.notes.join(' '), /counts "Authorized" as collected, but under the rule agreed on 2026-11-12 only Settled or Posted counts as paid: this payment has not settled yet/);
  assert.ok(!run('pathA').notes.some((n) => /agreed on/.test(n)));
});

test('early exits name their guard: status, the $100 floor, already linked, the reconcile start', () => {
  assert.equal(run('returned').decided_by, 'status');
  assert.equal(run('deposit').decided_by, 'membership minimum');
  assert.match(run('deposit').text, /\$50 is under the \$100 membership floor/);
  assert.equal(run('already').decided_by, 'already linked');
  assert.equal(run('early').decided_by, 'reconcile start');
  // With an earlier start date the payment gets past that check, and the window then rules it out.
  const moved = run('early', { reconcileStart: '2026-05-01' });
  assert.equal(moved.decided_by, 'origin guard', 'a different start date is honoured');
  assert.equal(moved.checks.time_window.result, 'fail');
});

test('a date with no time of day leaves the window unknown, never guessed', () => {
  assert.equal(paidTime('2026-10-01'), null);
  assert.equal(paidTime('2026-10-01T15:05:00Z'), Date.parse('2026-10-01T15:05:00Z'));
  const r = run('date_only');
  assert.equal(r.verdict, 'unknown');
  assert.equal(r.checks.time_window.result, 'unknown');
  assert.match(r.checks.time_window.detail, /no time of day/);
});

test('never says a payment should probably be linked', () => {
  for (const bad of ['This payment should probably be linked.', 'It likely belongs to Person A.', 'Looks like it should go to B.', "I'd link it.", 'We recommend linking it.', 'Should be linked.']) {
    assert.throws(() => assertNoHedge([bad]), /hedges toward a link/, bad);
  }
  for (const k of Object.keys(fx.payments)) {
    const r = run(k, { payerEmail: 'b@example.com' });
    assert.doesNotMatch(JSON.stringify(r), /should|probably|likely/i, k);
  }
  // Text from the rows passes the same guard.
  const cands = structuredClone(fx.candidates); cands[0].name = 'Person A, who should probably be linked';
  assert.throws(() => run('pathA', { candidates: cands }), /hedges toward a link/);
});

test('failure paths: missing payment, unreadable candidates, no amount, no candidates, no linked list', () => {
  assert.throws(() => explainPayment({ payment: null, candidates: [] }), RangeError);
  assert.throws(() => explainPayment({ payment: { Id: 1 }, candidates: null }), RangeError);
  assert.throws(() => explainPayment({ payment: { Id: 1, Amount: 'x' }, candidates: [] }), RangeError);
  const empty = run('pathA', { candidates: [] });
  assert.equal(empty.verdict, 'out_of_scope');
  assert.equal(empty.checks.amount_match.result, 'fail');
  const noLinked = run('pathA', { linkedPaymentIds: null });
  assert.equal(noLinked.verdict, 'unknown');
  assert.match(noLinked.notes.join(' '), /already-linked payment ids was given/);
});

test('idempotent and read-only: same answer twice, inputs untouched', () => {
  const input = { payment: structuredClone(fx.payments.pathB), candidates: structuredClone(fx.candidates), claims: structuredClone(fx.claims), linkedPaymentIds: [...fx.linked], payerEmail: 'b@example.com' };
  const before = JSON.stringify(input);
  assert.deepEqual(explainPayment(input), explainPayment(input));
  assert.equal(JSON.stringify(input), before);
});
