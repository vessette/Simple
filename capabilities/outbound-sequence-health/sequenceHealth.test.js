import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WEIGHTS, explainScore, isStalled, proposeRepairs, newFindings } from './sequenceHealth.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/sequences.json', import.meta.url), 'utf8'));
const seq = (id) => structuredClone(fx.sequences.find((s) => s.id === id));

// Acceptance: every score is traceable to its input components, and an unreachable
// component yields unknown rather than a passing default.
test('every score is traceable to its input components', () => {
  for (const s of fx.sequences) {
    const r = explainScore(s);
    assert.equal(r.components.length, 5);
    for (const c of r.components) {
      assert.equal(c.weight, WEIGHTS[c.component]);
      assert.ok(c.inputs && typeof c.inputs === 'object', `${s.id}/${c.component}: inputs missing`);
      assert.match(c.source, /^campaignHealthScanner\.ts:\d+-\d+$/);
      assert.ok(c.rule.length > 0);
    }
    if (r.score !== null) {
      const sum = Math.round(r.components.reduce((a, c) => a + c.credited_points, 0));
      assert.equal(r.score, sum, `${s.id}: score is not the sum of its components`);
    }
  }
});

test('an unreachable component makes the score unknown, never a passing default', () => {
  const r = explainScore(seq('sms-lost'));
  assert.equal(r.score, null);
  assert.equal(r.status, 'unknown');
  assert.match(r.reason, /sms/);
  const failed = explainScore(seq('lookup-failed'));
  assert.equal(failed.status, 'unknown');
  assert.equal(failed.components.find((c) => c.component === 'engagement').state, 'unreachable');
});

test('happy path: a healthy sequence earns all 100 points on evidence', () => {
  const r = explainScore(seq('healthy'));
  assert.equal(r.score, 100);
  assert.equal(r.status, 'healthy');
  assert.deepEqual(r.credited_without_evidence, []);
  assert.equal(r.evidenced_points, 100);
});

test('a sequence that stopped sending still scores 100 on the platform, and the credit is named', () => {
  const r = explainScore(seq('silent'));
  assert.equal(r.score, 100, 'matches the platform score');
  assert.deepEqual(r.credited_without_evidence, ['delivery', 'ai_generation', 'engagement']);
  assert.equal(r.evidenced_max, 45);
  assert.match(r.reason, /full credit with no data/);
  assert.equal(isStalled(seq('silent')), true);
});

test('port matches the platform arithmetic: degraded and critical bands', () => {
  assert.deepEqual([explainScore(seq('misconfigured')).score, explainScore(seq('misconfigured')).status], [70, 'degraded']);
  assert.deepEqual([explainScore(seq('outage')).score, explainScore(seq('outage')).status], [53, 'critical']);
});

test('a provider outage is reported as an outage, with no retry proposed', () => {
  const f = proposeRepairs(seq('outage'));
  assert.deepEqual(f.map((x) => x.kind), ['provider_outage']);
  assert.match(f[0].proposal, /Do not retry/);
});

test('a configuration fault and failed sends get their own named proposals', () => {
  const kinds = proposeRepairs(seq('misconfigured')).map((x) => x.kind);
  assert.deepEqual(kinds, ['config_fault', 'failed_sends']);
});

test('every proposal is unexecuted', () => {
  for (const s of fx.sequences) for (const f of proposeRepairs(s)) assert.equal(f.executed, false);
});

test('stall detection: stalled, not stalled, and unknown when a count is missing', () => {
  assert.equal(isStalled(seq('silent')), true);
  assert.equal(isStalled(seq('healthy')), false);
  assert.equal(isStalled(seq('lookup-failed')), null);
  assert.equal(proposeRepairs(seq('lookup-failed'))[0].kind, 'stall_check');
  assert.equal(isStalled({ active_leads: 0, pending_actions: 0 }), false);
});

test('a repeated finding is de-duplicated, a new one still comes through', () => {
  const first = proposeRepairs(seq('misconfigured'));
  assert.deepEqual(newFindings(first, first.map((f) => f.key)), []);
  const next = proposeRepairs({ ...seq('misconfigured'), active_leads: 20, pending_actions: 0 });
  const fresh = newFindings(next, first.map((f) => f.key));
  assert.deepEqual(fresh.map((f) => f.kind), ['stalled']);
});

test('failure paths: bad channel state, missing channels, bad counts, no record', () => {
  assert.equal(explainScore({ ...seq('healthy'), channels: { email: 'fine' } }).status, 'unknown');
  assert.equal(explainScore({ ...seq('healthy'), channels: {} }).status, 'unknown');
  assert.equal(explainScore({ ...seq('healthy'), sent_24h: -1 }).status, 'unknown');
  assert.equal(explainScore({ ...seq('healthy'), ai_failed_24h: '0' }).status, 'unknown');
  assert.throws(() => explainScore(null), TypeError);
});

test('idempotent and read-only: same input, same answer, input untouched', () => {
  const before = JSON.stringify(fx.sequences);
  for (const s of fx.sequences) {
    assert.deepEqual(explainScore(s), explainScore(s));
    assert.deepEqual(proposeRepairs(s), proposeRepairs(s));
  }
  assert.equal(JSON.stringify(fx.sequences), before);
});
