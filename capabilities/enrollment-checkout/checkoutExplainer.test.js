import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCatalog, quotePlan, quoteAll, checkAmount, explainPaymentState, PAYMENT_STATES, CHECKOUT_STEPS } from './checkoutExplainer.js';

const raw = JSON.parse(readFileSync(new URL('./fixtures/plans.json', import.meta.url), 'utf8'));
const catalog = loadCatalog(raw);
const prices = (q) => [q.per_month, q.charge].filter((n) => n !== undefined);

// Acceptance: every price quoted traces to PLANS; the agent refuses to state a price it
// cannot trace and never uses the 4500 default.
test('every price quoted traces to PLANS', () => {
  const quotes = quoteAll(catalog);
  assert.equal(quotes.length, 2);
  for (const q of quotes) {
    assert.equal(q.refused, false);
    assert.equal(q.source, raw.source);
    assert.match(q.source, /^PLANS \(subscriptionService\.ts:78-85\)/);
    assert.equal(q.per_month, raw.plans[q.plan].per_month);
    assert.equal(q.charge, raw.plans[q.plan].price);
  }
  assert.equal(quotePlan('annual', catalog).text, '$149 a month, billed annually as $1,788 a year');
  assert.equal(quotePlan('monthly', catalog).text, '$199 a month');
});

test('a price that cannot be traced is refused', () => {
  assert.equal(quotePlan('enterprise', catalog).refused, true);
  assert.equal(quotePlan('annual', null).refused, true);
  assert.equal(quoteAll(null)[0].refused, true);
  const r = checkAmount(250, catalog);
  assert.equal(r.refused, true);
  assert.match(r.reason, /does not match any price in PLANS/);
});

test('4500 is never quoted: asked about it, the answer is that it is not the price', () => {
  const r = checkAmount(4500, catalog);
  assert.equal(r.verdict, 'not_the_price');
  assert.equal(r.traced, false);
  assert.match(r.reason, /retired per-participant offer/);
  const quoted = [...quoteAll(catalog), ...r.prices].flatMap(prices);
  assert.ok(!quoted.includes(4500), 'a quote contains 4500');
  assert.equal(checkAmount(1700, catalog).verdict, 'not_the_price');
});

test('a catalogue that has 4500 slipped into a plan is refused, not quoted', () => {
  const bad = structuredClone(raw);
  bad.plans.monthly.per_month = 4500;
  assert.throws(() => loadCatalog(bad), /does not add up/);
});

test('real prices are confirmed against PLANS', () => {
  assert.deepEqual([checkAmount(149, catalog).verdict, checkAmount(149, catalog).plan], ['monthly_rate', 'annual']);
  assert.deepEqual([checkAmount(1788, catalog).verdict, checkAmount(1788, catalog).plan], ['charge', 'annual']);
  assert.deepEqual([checkAmount(199, catalog).verdict, checkAmount(199, catalog).plan], ['monthly_rate', 'monthly']);
});

test('the admin-only comped plan is never quoted as a checkout price', () => {
  const r = quotePlan('comp', catalog);
  assert.equal(r.refused, true);
  assert.match(r.reason, /granted by an admin/);
  assert.equal(checkAmount(0, catalog).refused, true);
  assert.ok(!quoteAll(catalog).some((q) => q.plan === 'comp'));
});

test('payment states are explained, and an unknown state is refused', () => {
  for (const s of ['pending', 'pending_invoice', 'paid', 'failed']) {
    const e = explainPaymentState(s);
    assert.equal(e.meaning, PAYMENT_STATES[s]);
    assert.equal(e.source, 'Enrollment.ts:203-204');
  }
  assert.equal(explainPaymentState('refunded').refused, true);
  assert.match(PAYMENT_STATES.pending, /not held until payment settles/);
});

test('the checkout flow says nothing is charged until the person pays', () => {
  assert.equal(CHECKOUT_STEPS.length, 6);
  assert.match(CHECKOUT_STEPS.at(-1), /Nothing is charged until they do/);
  assert.ok(CHECKOUT_STEPS.join(' ').indexOf('open and not full') < CHECKOUT_STEPS.join(' ').indexOf('hosted payment link'));
});

test('failure paths: missing or broken catalogue, bad amounts', () => {
  assert.throws(() => loadCatalog(null), TypeError);
  assert.throws(() => loadCatalog({ plans: {} }), TypeError);
  const noPrice = structuredClone(raw); noPrice.plans.annual.price = null;
  assert.throws(() => loadCatalog(noPrice), RangeError);
  assert.equal(checkAmount('149', catalog).refused, true);
  assert.equal(checkAmount(NaN, catalog).refused, true);
  assert.equal(checkAmount(149, null).refused, true);
});

test('idempotent and read-only: same answers, catalogue untouched', () => {
  const before = JSON.stringify(raw);
  assert.deepEqual(quoteAll(catalog), quoteAll(loadCatalog(raw)));
  assert.deepEqual(checkAmount(4500, catalog), checkAmount(4500, catalog));
  assert.equal(JSON.stringify(raw), before);
  assert.throws(() => { catalog.source = 'edited'; }, TypeError);
});
