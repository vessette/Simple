import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyReason, measure, MEASURE_SQL, PRESETS, CATEGORIES } from './reasonQuality.js';

// Acceptance: no risk figure is produced; the data-quality question about cancellation reasons
// is answered by measurement, not assumption. These tests prove the measurement is ready and
// produces no risk figure. The live run is a person's (see the write-up).
const SAMPLES = [
  ['canceled', null, 'missing'],
  ['canceled', 'superseded_by_renewal:abc', 'system_superseded_renewal'],
  ['canceled', 'comp_revoked', 'system_comp_revoked'],
  ['canceled', 'duplicate checkout submission (reconcile)', 'system_duplicate_checkout'],
  ['past_due', 'Insufficient funds', 'payment_decline'],
  ['canceled', 'No reason given', 'member_no_reason'],
  ['canceled', 'Too expensive', 'member_preset'],
  ['canceled', 'Moving abroad for work', 'member_free_text'],
];

test('every recorded reason maps to one category, system markers before member text', () => {
  for (const [status, reason, want] of SAMPLES) assert.equal(classifyReason(status, reason), want, `${status} ${reason}`);
  for (const p of PRESETS) assert.equal(classifyReason('canceled', p), 'member_preset');
});

test('the SQL lists the same categories, in the same order, and returns counts only', () => {
  const order = [...MEASURE_SQL.matchAll(/THEN '([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepEqual(order, ['missing', 'system_superseded_renewal', 'system_comp_revoked', 'system_duplicate_checkout', 'payment_decline', 'member_no_reason', 'member_preset']);
  assert.match(MEASURE_SQL, /ELSE 'member_free_text'/);
  assert.deepEqual([...new Set([...order, 'member_free_text'])].sort(), [...CATEGORIES].sort());
  assert.match(MEASURE_SQL, /COUNT\(\*\)/);
  assert.doesNotMatch(MEASURE_SQL.replace(/CASE[\s\S]*END AS category/, ''), /cancel_reason/, 'no reason text is selected');
  assert.doesNotMatch(MEASURE_SQL, /\b(UPDATE|INSERT|DELETE|DROP|ALTER)\b/i, 'read-only');
  for (const p of PRESETS) assert.ok(MEASURE_SQL.includes(`'${p}'`), p);
});

const rows = [
  { status: 'canceled', plan: 'monthly', category: 'member_preset', n: 6 },
  { status: 'canceled', plan: 'monthly', category: 'member_free_text', n: 2 },
  { status: 'canceled', plan: 'annual', category: 'member_no_reason', n: 4 },
  { status: 'canceled', plan: 'monthly', category: 'system_superseded_renewal', n: 30 },
  { status: 'canceled', plan: 'comp', category: 'system_comp_revoked', n: 5 },
  { status: 'past_due', plan: 'monthly', category: 'payment_decline', n: 3 },
];

test('no risk figure is ever produced', () => {
  for (const opt of [{}, { minPopulation: 5 }, { minPopulation: 50 }]) assert.equal(measure(rows, opt).risk_figure, null);
});

test('renewals, duplicates and free seats are never counted as churn', () => {
  const m = measure(rows);
  assert.equal(m.member_cancellations, 12, 'the 30 superseded renewals and 5 comps are not member cancellations');
  assert.equal(m.excluded_not_churn, 30, 'comp rows are dropped before counting, as non-paying');
  assert.deepEqual([m.with_a_reason, m.with_a_preset_reason, m.no_reason_given, m.payment_declines], [8, 6, 4, 3]);
});

test('small populations are counts, not rates; the threshold is the sales manager\'s', () => {
  assert.equal(measure(rows).report_as, 'counts');
  assert.match(measure(rows).verdict, /no minimum population has been set/);
  const small = measure(rows, { minPopulation: 20 });
  assert.deepEqual([small.report_as, small.share_with_reason], ['counts', undefined]);
  const big = measure(rows, { minPopulation: 10 });
  assert.deepEqual([big.report_as, big.share_with_reason], ['shares', 0.667]);
  assert.equal(measure([]).measured, false, 'an empty result is not a measurement');
});

test('coverage is reported by month, so a late arrival of the presets shows up', () => {
  assert.match(MEASURE_SQL, /AS month/);
  assert.match(MEASURE_SQL, /GROUP BY 1, 2, 3, 4/);
  const m = measure([
    { status: 'canceled', plan: 'monthly', category: 'member_free_text', month: '2026-08', n: 3 },
    { status: 'canceled', plan: 'monthly', category: 'member_no_reason', month: '2026-08', n: 5 },
    { status: 'canceled', plan: 'monthly', category: 'member_preset', month: '2026-11', n: 4 },
    { status: 'canceled', plan: 'monthly', category: 'system_superseded_renewal', month: '2026-11', n: 9 },
    { status: 'canceled', plan: 'annual', category: 'member_preset', n: 1 },
  ]);
  assert.deepEqual(m.by_month, {
    '2026-08': { member_cancellations: 8, with_a_reason: 3, with_a_preset_reason: 0 },
    '2026-11': { member_cancellations: 4, with_a_reason: 4, with_a_preset_reason: 4 },
    unknown: { member_cancellations: 1, with_a_reason: 1, with_a_preset_reason: 1 },
  });
  assert.equal(m.risk_figure, null);
});

test('malformed input is refused', () => {
  assert.throws(() => measure('x'), RangeError);
  assert.throws(() => measure([{ status: 'canceled', plan: 'monthly', category: 'vibes', n: 1 }]), RangeError);
  assert.throws(() => measure(rows, { minPopulation: 0 }), RangeError);
});
