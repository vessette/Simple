import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CITE, tokens, checkSource, classify } from './citationMatch.mjs';

// A small fictional source file. Line numbers are 1-based in citations.
const SRC = [
  'import { x } from "./y";',                                  // 1
  '',                                                          // 2
  'export async function grantFreeAccess(id: string) {',       // 3
  '  return id;',                                              // 4
  '}',                                                         // 5
  '',                                                          // 6
  '// The hosted checkout page mints its own',                 // 7
  '// customer when the payer pays.',                          // 8
  'export async function cancelSubscription(id: string) {',    // 9
  "  const status = 'unavailable'; // ROAS",                   // 10
  '}',                                                         // 11
];

test('happy path: a label inside the cited range is ok', () => {
  assert.equal(checkSource(SRC, 9, 11, 'cancelSubscription').verdict, 'ok');
});

test('a label outside the range is reported as moved, pointing at its definition', () => {
  const r = checkSource(SRC, 3, 5, 'cancelSubscription');
  assert.equal(r.verdict, 'moved');
  assert.equal(r.detail, 'cancelSubscription at :9');
});

test('plain English words are not treated as code names', () => {
  assert.deepEqual(tokens('temperature history and update'), []);
  assert.equal(checkSource(SRC, 3, 3, 'sponsor link and verify').verdict, 'unlabelled');
  assert.deepEqual(tokens('canceled_at, cancel_reason'), ['canceled_at', 'cancel_reason']);
  assert.deepEqual(tokens('revokeFreeAccess'), ['revokeFreeAccess']);
});

test('case and punctuation do not decide a match', () => {
  assert.equal(checkSource(SRC, 10, 10, 'ROAS unavailable').verdict, 'ok');
});

test('a quote that wraps across comment lines still matches, on its first five words', () => {
  assert.equal(checkSource(SRC, 7, 8, "'The hosted checkout page mints its own customer, paraphrased after this'").verdict, 'ok');
});

test('failure paths: no file, past the end, label not in the file', () => {
  assert.equal(checkSource(null, 1, 1, 'x').verdict, 'no_file');
  assert.equal(checkSource(SRC, 500, 500, 'cancelSubscription').verdict, 'out_of_range');
  assert.equal(checkSource(SRC, 9, 9, 'refundPayment').verdict, 'missing');
});

test('boundary: the cited line counts with two lines of slack, not three', () => {
  assert.equal(checkSource(SRC, 7, 7, 'cancelSubscription').verdict, 'ok');
  assert.equal(checkSource(SRC, 6, 6, 'cancelSubscription').verdict, 'moved');
});

test('classify separates drift, never right, no baseline and uncommitted files', () => {
  assert.equal(classify('ok', 'moved'), 'drifted');
  assert.equal(classify('moved', 'moved'), 'never right');
  assert.equal(classify('no_file', 'moved'), 'wrong now');
  assert.equal(classify('no_file', 'no_file'), 'not in repo');
  assert.equal(classify('moved', 'ok'), 'correct');
  assert.equal(classify('unlabelled', 'unlabelled'), 'unverifiable');
});

test('the citation pattern reads path, range and label', () => {
  const [m] = 'see backend/src/models/Subscription.ts:85 (canceled_at, cancel_reason).'.matchAll(CITE);
  assert.deepEqual([m[1], m[2], m[3], m[4]], ['backend/src/models/Subscription.ts', '85', undefined, 'canceled_at, cancel_reason']);
});

test('idempotent: the same input gives the same verdict, source untouched', () => {
  const before = JSON.stringify(SRC);
  assert.deepEqual(checkSource(SRC, 3, 5, 'cancelSubscription'), checkSource(SRC, 3, 5, 'cancelSubscription'));
  assert.equal(JSON.stringify(SRC), before);
});
