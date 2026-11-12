import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng, allocate, sample, score, rank, wilson } from './citationSample.mjs';

const rows = Array.from({ length: 40 }, (_, i) => ({ cap: i < 30 ? 'a' : 'b', text: `f.ts:${i}`, path: 'f.ts', field: 'supporting_evidence' }));

test('the same seed draws the same sample; a different seed draws a different one', () => {
  assert.deepEqual(sample(rows, 10, 7), sample(rows, 10, 7));
  assert.notDeepEqual(sample(rows, 10, 7), sample(rows, 10, 8));
  assert.equal(rng(1)(), rng(1)());
});

test('input order does not change the draw', () => {
  assert.deepEqual(sample([...rows].reverse(), 10, 7), sample(rows, 10, 7));
});

test('the sample is spread in proportion to group size and totals exactly n', () => {
  const s = sample(rows, 10, 7);
  assert.equal(s.length, 10);
  // 30 of 40 rows are in a: 7.5 of 10, b gets 2.5. Equal remainders go to a by name.
  assert.equal(s.filter((r) => r.cap === 'a').length, 8);
  assert.equal(new Set(s.map((r) => r.text)).size, 10, 'no row drawn twice');
});

test('allocation boundaries: largest remainder, and n at or above the total takes everything', () => {
  assert.deepEqual(allocate({ a: 1, b: 1, c: 1 }, 2), { a: 1, b: 1, c: 0 });
  assert.deepEqual(allocate({ a: 3, b: 1 }, 10), { a: 3, b: 1 });
  assert.deepEqual(allocate({ a: 5, b: 5 }, 0), { a: 0, b: 0 });
});

test('ranking puts money, blockers and drifted files first', () => {
  const caps = { money: { financial_consequence: 'moves_money', human_decision: true }, none: { financial_consequence: 'none', human_decision: false } };
  const rs = [
    { cap: 'none', text: 'x.ts:1', path: 'x.ts', field: 'supporting_evidence' },
    { cap: 'money', text: 'y.ts:1', path: 'y.ts', field: 'blocked_by' },
    { cap: 'none', text: 'z.ts:1', path: 'z.ts', field: 'supporting_evidence' },
  ];
  const r = rank(rs, caps, new Set(['z.ts']));
  assert.deepEqual(r.map((x) => x.text), ['y.ts:1', 'z.ts:1', 'x.ts:1']);
  assert.equal(score(rs[1], caps.money, new Set()), 6);
});

test('failure path: an unknown consequence scores as none rather than throwing', () => {
  assert.equal(score({ field: 'other', path: 'q' }, { financial_consequence: 'surprise' }, new Set()), 0);
});

test('Wilson interval: known values, and none for an empty sample', () => {
  assert.deepEqual(wilson(10, 50), [11, 33]);
  assert.deepEqual(wilson(0, 50), [0, 7]);
  assert.equal(wilson(0, 0), null);
});
