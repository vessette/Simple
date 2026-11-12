import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadCatalog } from '../enrollment-checkout/checkoutExplainer.js';
import { creditPreview, explainSubscription, BILLING_RULE } from './memberAnswers.js';

const catalog = loadCatalog(JSON.parse(readFileSync(new URL('../enrollment-checkout/fixtures/plans.json', import.meta.url), 'utf8')));
const fx = JSON.parse(readFileSync(new URL('./fixtures/members.json', import.meta.url), 'utf8'));
const row = (k) => structuredClone(fx.rows[k]);
const credits = (k) => structuredClone(fx.credits[k]);
const field = (r, name) => r.fields.find((f) => f.field === name);

// Acceptance: every price and date traces to code or to the member's row; an unknown is
// reported as unknown rather than computed from an assumption.
test('every price and date traces to code or to the member\'s row', () => {
  for (const k of Object.keys(fx.rows)) {
    for (const f of explainSubscription(row(k), catalog).fields) {
      if (f.status === 'known') assert.ok(/^PLANS \(|^the member's subscription row$/.test(f.source), `${k}/${f.field}: untraced source "${f.source}"`);
      else assert.ok(f.value === null && f.reason, `${k}/${f.field}: an unknown carries a value or no reason`);
    }
  }
  const p = creditPreview('annual', credits('open_house'), catalog);
  assert.match(p.sources.price, /^PLANS \(/);
  assert.equal(p.sources.credit, 'accountCreditService.ts:22-59');
  assert.match(BILLING_RULE.source, /billingPeriod\.ts/);
});

test('missing dates are unknown, never worked out from other dates', () => {
  const r = explainSubscription(row('pending_monthly'), catalog);
  assert.equal(r.status, 'partly_unknown');
  for (const name of ['started', 'paid_through']) {
    assert.equal(field(r, name).status, 'unknown');
    assert.equal(field(r, name).value, null);
    assert.match(field(r, name).reason, /set when the payment settles/);
  }
  const z = explainSubscription(row('zoneless'), catalog);
  assert.match(field(z, 'started').reason, /no time zone/);
  assert.equal(field(z, 'paid_through').status, 'unknown');
});

test('an unrecognised plan is unknown, not assumed to be monthly', () => {
  const r = explainSubscription(row('unknown_plan'), catalog);
  assert.equal(field(r, 'plan').status, 'unknown');
  assert.match(field(r, 'plan').reason, /not assumed to be monthly/);
  assert.equal(field(r, 'price'), undefined);
  assert.ok(!JSON.stringify(r).includes('$199'));
});

test('happy path: an active annual member, every field from PLANS or the row, dates in Central', () => {
  const r = explainSubscription(row('active_annual'), catalog);
  assert.equal(r.status, 'known');
  assert.equal(field(r, 'price').value, '$149 a month, billed annually as $1,788 a year');
  assert.equal(field(r, 'started').value, 'October 30, 2026 at 11:00 AM CDT');
  assert.equal(field(r, 'paid_through').value, 'October 30, 2027 at 11:00 AM CDT');
  assert.equal(field(r, 'credit_on_first_charge').value, '$50');
});

test('a row charged at an older price says so instead of hiding the difference', () => {
  const r = explainSubscription(row('legacy_price'), catalog);
  assert.match(field(r, 'charged_amount').value, /\$149 \(differs from today's price of \$199\)/);
  assert.equal(field(r, 'charged_amount').source, "the member's subscription row");
});

test('credit preview: whole rows, first charge only, at least $1 left to pay', () => {
  const a = creditPreview('annual', credits('open_house'), catalog);
  assert.deepEqual([a.full_price, a.credit_applied, a.first_charge], [1788, 50, 1738]);
  const m = creditPreview('monthly', credits('open_house'), catalog);
  assert.deepEqual([m.full_price, m.credit_applied, m.first_charge], [199, 50, 149]);
  const big = creditPreview('monthly', credits('too_big'), catalog);
  assert.deepEqual([big.credit_applied, big.first_charge, big.credit_rows_used], [25, 174, ['c5']]);
  assert.match(a.note, /only spent when the payment settles/);
});

test('an annual-only scholarship never reduces a monthly charge', () => {
  const m = creditPreview('monthly', credits('scholarship'), catalog);
  assert.deepEqual([m.credit_applied, m.first_charge, m.credit_rows_not_usable], [50, 149, ['c2']]);
  const a = creditPreview('annual', credits('scholarship'), catalog);
  assert.deepEqual([a.credit_applied, a.first_charge], [944, 844]);
});

test('the comped plan has no checkout, and unknown credit stays unknown', () => {
  assert.equal(creditPreview('comp', credits('open_house'), catalog).status, 'refused');
  const b = creditPreview('monthly', credits('broken'), catalog);
  assert.equal(b.status, 'unknown');
  assert.equal(b.value, null);
  assert.equal(creditPreview('monthly', null, catalog).status, 'unknown');
});

test('the billing rule is the current one: signup day, not class start', () => {
  assert.match(BILLING_RULE.text, /starts on the day the payment settles/);
  assert.match(BILLING_RULE.text, /does not start on the class start date/);
});

test('failure paths: no row, a bad status, no catalogue', () => {
  assert.equal(explainSubscription(null, catalog).status, 'unknown');
  assert.equal(field(explainSubscription({ ...row('active_annual'), status: 'paused' }, catalog), 'status').status, 'unknown');
  assert.equal(field(explainSubscription(row('active_annual'), null), 'plan').status, 'unknown');
  assert.equal(creditPreview('annual', credits('open_house'), null).status, 'refused');
});

test('idempotent and read-only: same answers, inputs untouched', () => {
  const r = row('active_annual'), c = credits('scholarship');
  const before = JSON.stringify([r, c]);
  assert.deepEqual(explainSubscription(r, catalog), explainSubscription(row('active_annual'), catalog));
  assert.deepEqual(creditPreview('annual', c, catalog), creditPreview('annual', credits('scholarship'), catalog));
  assert.equal(JSON.stringify([r, c]), before);
});
