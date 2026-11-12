import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPacket, approvalState, prospectKey } from './batchPacket.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/recommendations.json', import.meta.url), 'utf8'));
const input = (over = {}) => ({
  recommendations: structuredClone(fx.recommendations), threshold: fx.threshold, cap: fx.cap,
  approver: fx.approver, sequence: fx.sequence, suppressed: new Set(fx.suppressed), inOtherPackets: fx.in_other_packets, ...over,
});

// Acceptance: a fixture batch with fewer qualifying prospects than the cap produces the
// smaller real number; a test asserting padding must fail.
test('fewer qualifying prospects than the cap gives the smaller real number, never a padded batch', () => {
  const p = buildPacket(input());
  assert.equal(p.cap, 20);
  assert.equal(p.qualifying_count, 7);
  assert.equal(p.volume, 7);
  assert.equal(p.prospects.length, 7);
  assert.equal(p.shortfall, 13);
  assert.equal(new Set(p.prospects.map((x) => x.prospect_key)).size, 7, 'no prospect repeated to fill the batch');
  assert.match(p.summary, /13 short of the cap of 20; the batch is not padded/);
});

test('a test asserting padding fails against the real packet', () => {
  const p = buildPacket(input());
  assert.throws(() => assert.equal(p.prospects.length, p.cap), assert.AssertionError);
  assert.throws(() => assert.equal(p.volume, p.cap), assert.AssertionError);
});

test('happy path: best fit first, with scores, the sequence and the named approver', () => {
  const p = buildPacket(input());
  assert.deepEqual(p.prospects.map((x) => x.id), ['r1', 'r2', 'r3', 'r7', 'r4', 'r5', 'r6']);
  assert.deepEqual(p.prospects.map((x) => x.fit_score), [92, 81, 77, 71, 65, 58, 50]);
  assert.equal(p.approver, 'Roselyn');
  assert.equal(p.proposed_sequence, fx.sequence);
});

test('the cap holds when more prospects qualify than it allows', () => {
  const p = buildPacket(input({ cap: 3 }));
  assert.equal(p.volume, 3);
  assert.equal(p.shortfall, 0);
  assert.equal(p.excluded.filter((e) => /over the cap/.test(e.reason)).length, 4);
});

test('unsubscribed, suppressed and already-packeted prospects are excluded before the packet is built', () => {
  const p = buildPacket(input());
  const reason = (id) => p.excluded.find((e) => e.id === id)?.reason;
  assert.equal(reason('r10'), 'unsubscribed');
  assert.equal(reason('r11'), 'suppressed');
  assert.equal(reason('r12'), 'already in another open packet');
  for (const id of ['r10', 'r11', 'r12']) assert.ok(!p.prospects.some((x) => x.id === id));
});

test('the same prospect twice is de-duplicated before presentation, keeping the higher score', () => {
  const p = buildPacket(input());
  assert.equal(prospectKey({ email: ' Ada@Example.com ' }), 'ada@example.com');
  assert.equal(p.prospects.filter((x) => x.prospect_key === 'ada@example.com').length, 1);
  assert.equal(p.prospects[0].fit_score, 92);
  assert.match(p.excluded.find((e) => e.id === 'r8').reason, /duplicate of recommendation r1/);
});

test('below the threshold, not pending, or no score: excluded with the reason', () => {
  const p = buildPacket(input());
  const reason = (id) => p.excluded.find((e) => e.id === id)?.reason;
  assert.match(reason('r9'), /below the threshold of 50/);
  assert.match(reason('r13'), /not pending/);
  assert.match(reason('r14'), /no fit score/);
  assert.ok(p.prospects.some((x) => x.id === 'r6'), 'exactly at the threshold qualifies');
  assert.equal(p.prospects.length + p.excluded.length, fx.recommendations.length, 'every recommendation is accounted for');
});

test('nothing qualifies: an empty packet, with no fallback search or import', () => {
  const p = buildPacket(input({ threshold: 99 }));
  assert.equal(p.volume, 0);
  assert.equal(p.shortfall, 20);
  assert.deepEqual(p.prospects, []);
});

test('the packet waits: time never approves it, only the named approver can decide', () => {
  const p = buildPacket(input());
  assert.equal(p.approval.state, 'awaiting_approval');
  assert.equal(p.approval.expires_at, null);
  assert.equal(p.enrolled, false);
  assert.equal(p.sent, false);
  assert.equal(approvalState(p), 'awaiting_approval');
  assert.equal(approvalState(p, { by: 'system:auto_approve_timeout', outcome: 'approved' }), 'awaiting_approval');
  assert.equal(approvalState(p, { by: 'Someone else', outcome: 'approved' }), 'awaiting_approval');
  assert.equal(approvalState(p, { by: 'Roselyn', outcome: 'approved' }), 'approved');
  assert.equal(approvalState(p, { by: 'Roselyn', outcome: 'rejected' }), 'rejected');
});

test('failure paths: missing approver, sequence, suppression state, bad cap or threshold', () => {
  assert.throws(() => buildPacket(input({ approver: '' })), RangeError);
  assert.throws(() => buildPacket(input({ approver: null })), RangeError);
  assert.throws(() => buildPacket(input({ sequence: ' ' })), RangeError);
  assert.throws(() => buildPacket(input({ suppressed: undefined })), TypeError);
  assert.throws(() => buildPacket(input({ suppressed: ['blocked@example.com'] })), TypeError);
  assert.throws(() => buildPacket(input({ recommendations: [], suppressed: undefined })), /Suppression state is required/);
  assert.throws(() => buildPacket(input({ cap: 0 })), RangeError);
  assert.throws(() => buildPacket(input({ cap: 2.5 })), RangeError);
  assert.throws(() => buildPacket(input({ threshold: 101 })), RangeError);
  assert.throws(() => buildPacket(input({ recommendations: null })), TypeError);
});

test('idempotent and read-only: same input, same packet and key, input untouched', () => {
  const i = input();
  const before = JSON.stringify(i.recommendations);
  const a = buildPacket(i);
  const b = buildPacket(input());
  assert.deepEqual(a, b);
  assert.equal(a.packet_key, b.packet_key);
  assert.equal(JSON.stringify(i.recommendations), before);
});
