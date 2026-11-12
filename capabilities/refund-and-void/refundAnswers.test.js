import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { answer, ledgerAnswer, policyAnswer, escalation, draftRecommendation, platformRule, assertNoPromise, POLICY } from './refundAnswers.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/ledger.json', import.meta.url), 'utf8'));
const ledger = () => structuredClone(fx.ledger);
const pay = (k) => structuredClone(fx.payments[k]);
const PROMISE = /\bwill (?:be )?(?:refunded|issued|voided|reversed|approved)\b|\bwill (?:get|receive) (?:a|an|the|your|their) (?:refund|money)/i;

// Every answer the agent can give, across the ledger, policy, escalation and recommendation paths.
function everyAnswer() {
  const qs = ['Was payment 900101 refunded?', 'What is the refund policy?', 'Can you refund me?', 'Will they get their money back?', 'What happened to 900303?', 'Is there a 30 day guarantee?', 'hello'];
  const out = [];
  for (const q of qs) for (const id of ['900101', '900202', '900303', '999999']) out.push(answer(q, { paymentId: id, ledger: ledger() }));
  for (const k of Object.keys(fx.payments)) out.push(draftRecommendation({ paymentId: String(fx.payments[k].Id), ledger: ledger(), payment: pay(k), now: fx.now }));
  out.push(draftRecommendation({ paymentId: '900404', ledger: ledger(), now: fx.now }));
  return out;
}

// Acceptance: every answer cites the ledger row or the approved policy text; where the policy is
// unapproved the agent says so rather than stating terms; it never asserts that a refund will be issued.
test('every answer cites a ledger row, the ledger query, or the policy text', () => {
  for (const a of everyAnswer()) {
    assert.ok(a.citations.length > 0, `${a.kind}: no citation`);
    if (a.kind === 'ledger') assert.ok(a.citations.every((c) => c.source === 'refunds ledger' && (c.row || c.query)));
    if (a.kind === 'policy' || a.kind === 'escalate_to_human') assert.deepEqual(a.citations, [{ source: POLICY.source, text: POLICY.text }]);
    if (a.kind === 'recommendation') assert.ok(a.citations.some((c) => c.text === POLICY.text));
  }
});

test('the unapproved policy is said to be unapproved, and no terms are stated', () => {
  const p = policyAnswer();
  assert.match(p.lines[0], /not approved yet/);
  assert.match(p.lines[0], /no terms to quote/);
  for (const a of everyAnswer()) for (const l of a.lines) assert.doesNotMatch(l, /\b\d+[- ]days?\b|full refund within|non-refundable|pro-?rat/i, l);
  const approved = policyAnswer({ approved: true, text: 'Example approved text.', source: 'example.md:1' });
  assert.match(approved.lines[0], /^The approved refund policy reads: "Example approved text\."/);
});

test('no answer asserts that a refund will be issued', () => {
  for (const a of everyAnswer()) for (const l of a.lines) assert.doesNotMatch(l, PROMISE, l);
  assert.throws(() => assertNoPromise(['Your refund will be issued tomorrow.']), /asserts a refund outcome/);
  assert.throws(() => assertNoPromise(['They will get their money back.']), /asserts a refund outcome/);
});

test('ledger: each row is described from its fields, in Central dates', () => {
  const a = ledgerAnswer('900101', ledger());
  assert.match(a.lines[0], /Refund row rf-001: refund of \$1788\.00 recorded 2026-11-02 \(Central\), issued by admin\.one@example\.com\. Succeeded, gateway reference RV-5501, and \$50\.00 of account credit voided\./);
  assert.match(a.lines[1], /Refunded so far on payment 900101: \$1788\.00/);
  assert.deepEqual(a.citations, [{ source: 'refunds ledger', row: 'rf-001', fields: 'method, amount_cents, status, issued_by, created_at' }]);
  const failed = ledgerAnswer('900202', ledger());
  assert.match(failed.lines[0], /Failed, with an error recorded on the row\. Check the payment in PaySimple before saying no money moved/);
  assert.match(failed.lines[1], /Refunded so far on payment 900202: \$0\.00/);
  assert.match(ledgerAnswer('900303', ledger()).lines[0], /issued by nobody recorded\. Still pending: .*outcome is unknown/);
});

test('ledger: no row means no refund recorded here, not that none happened', () => {
  const a = ledgerAnswer('999999', ledger());
  assert.match(a.lines[0], /no row for payment 999999.*does not rule out a reversal made directly in PaySimple/);
  assert.deepEqual(a.citations, [{ source: 'refunds ledger', query: 'paysimple_payment_id = 999999', rows: 0 }]);
});

test('requests and entitlement questions go to a person', () => {
  for (const q of ['Please issue a refund for 900404', 'Can you refund me?', 'Am I eligible?', 'I want my money back', 'Will I get a refund?']) {
    const a = answer(q, { paymentId: '900404', ledger: ledger() });
    assert.equal(a.kind, 'escalate_to_human', q);
    assert.match(a.lines[0], /a person's decision/);
  }
  assert.equal(answer('What is the cancellation policy?').kind, 'policy');
  assert.equal(answer('What happened to 900303?', { paymentId: '900303', ledger: ledger() }).kind, 'ledger');
});

test('platform rule: void inside the window, reverse once settled, refuse otherwise', () => {
  assert.equal(platformRule(pay('voidable'), [], null, fx.now).method, 'void');
  assert.equal(platformRule(pay('settled'), [], null, fx.now).method, 'reverse');
  assert.equal(platformRule(pay('unsettled'), [], null, fx.now).blocker, 'not_settled');
  assert.equal(platformRule(pay('reversed'), [], null, fx.now).blocker, 'already_reversed');
  assert.equal(platformRule(pay('settled'), [], 100, fx.now).blocker, 'partial_unsupported');
  assert.equal(platformRule(pay('settled'), [], 5000, fx.now).blocker, 'invalid_amount');
  assert.equal(platformRule(pay('settled'), [{ status: 'succeeded', amount_cents: 178800 }], null, fx.now).blocker, 'invalid_amount');
  assert.equal(platformRule(pay('settled'), [{ status: 'pending', amount_cents: 178800 }], null, fx.now).blocker, 'pending_row');
  assert.equal(platformRule(null, [], null, fx.now).blocker, 'payment_unknown');
});

test('a recommendation is a draft with no decision, and says what a refund does not change', () => {
  const r = draftRecommendation({ paymentId: '900404', ledger: ledger(), payment: pay('settled'), reason: 'class cancelled', now: fx.now });
  assert.equal(r.status, 'draft');
  assert.equal(r.decision, null);
  assert.equal(r.decided_by, null);
  assert.deepEqual([...r.options], ['accept', 'reject']);
  assert.ok(r.lines.some((l) => /For the person to consider: a reverse of the full \$1788\.00/.test(l)));
  assert.ok(r.lines.some((l) => /does not change the enrolment/.test(l)));
  assert.ok(r.lines.some((l) => /already spent is not recovered/.test(l)));
  assert.ok(Object.isFrozen(r));
  assert.throws(() => { 'use strict'; r.decision = 'accept'; }, TypeError);
});

test('failure paths: unreadable ledger, no payment id, no question, no time', () => {
  const a = ledgerAnswer('900101', null);
  assert.match(a.lines[0], /could not be read/);
  const r = draftRecommendation({ paymentId: '900101', ledger: undefined, payment: pay('settled'), now: fx.now });
  assert.equal(r.rule.blocker, 'ledger_unreadable');
  assert.throws(() => ledgerAnswer('', ledger()), RangeError);
  assert.throws(() => answer('', {}), RangeError);
  assert.throws(() => draftRecommendation({ paymentId: '900404', ledger: ledger() }), RangeError);
});

test('idempotent and read-only: same answer twice, inputs untouched', () => {
  const l = ledger();
  const p = pay('voidable');
  const before = JSON.stringify([l, p]);
  const args = { paymentId: '900202', ledger: l, payment: p, now: fx.now };
  assert.deepEqual(draftRecommendation(args), draftRecommendation(args));
  assert.equal(JSON.stringify([l, p]), before);
  assert.equal(escalation('refund me').kind, 'escalate_to_human');
});
