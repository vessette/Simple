import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GRACE_RULES, VERDICTS, toInstant, explainCall, explainCalls, compareRules } from './noShow.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/calls.json', import.meta.url), 'utf8'));
const byId = (res, id) => res.rows.find((r) => r.call_id === id);

// The acceptance criterion: every answer names the scheduled time, the grace threshold
// and the current status, and no answer asserts a count without the underlying rows.
test('every answer names the scheduled time, the grace threshold and the current status', () => {
  for (const rule of Object.keys(GRACE_RULES)) {
    const res = explainCalls(fx.calls, { now: fx.now, rule });
    for (const row of res.rows) {
      assert.ok(row.scheduled_at, `call ${row.call_id}: scheduled time missing`);
      assert.equal(row.grace_minutes, GRACE_RULES[rule].minutes);
      assert.equal(row.grace_rule, rule);
      assert.ok(row.grace_source);
      assert.ok(row.current_status, `call ${row.call_id}: status missing`);
      assert.ok(VERDICTS.includes(row.verdict));
      assert.ok(row.reason.length > 0);
    }
  }
});

test('counts are derived from the rows returned with them', () => {
  const res = explainCalls(fx.calls, { now: fx.now, rule: 'spec' });
  assert.equal(res.total, res.rows.length);
  for (const v of VERDICTS) assert.equal(res.counts[v], res.rows.filter((r) => r.verdict === v).length);
  assert.equal(Object.values(res.counts).reduce((a, b) => a + b, 0), res.rows.length);
  const empty = explainCalls([], { now: fx.now, rule: 'spec' });
  assert.deepEqual(empty.rows, []);
  assert.equal(empty.counts.no_show, 0);
});

test('happy path: the fixture under the 30-minute spec rule', () => {
  const res = explainCalls(fx.calls, { now: fx.now, rule: 'spec' });
  assert.deepEqual(res.counts, { no_show: 4, not_yet: 2, already_no_show: 1, not_a_no_show: 2, unknown: 1 });
  assert.deepEqual(res.rows.filter((r) => r.verdict === 'no_show').map((r) => r.call_id), [1, 2, 8, 9]);
  assert.equal(byId(res, 1).minutes_past, 60);
  assert.match(byId(res, 1).scheduled_at_central, /2:00\s?PM CST/);
});

test('the running code waits 2 hours, so a call 60 minutes late is not yet a no-show there', () => {
  const res = explainCalls(fx.calls, { now: fx.now, rule: 'running_code' });
  assert.equal(byId(res, 1).verdict, 'not_yet');
  assert.equal(res.counts.no_show, 3);
});

test('compareRules lists exactly the calls whose verdict depends on the rule', () => {
  const diff = compareRules(fx.calls, { now: fx.now });
  assert.equal(diff.total, 1);
  assert.deepEqual(diff.rows[0], { call_id: 1, scheduled_at: '2026-11-11T20:00:00.000Z', current_status: 'scheduled', minutes_past: 60, spec: 'no_show', running_code: 'not_yet' });
});

test('boundary: exactly at the grace threshold is not a no-show; one minute past is', () => {
  const now = '2026-11-11T21:00:00Z';
  const at = explainCall({ id: 'a', lead_id: 1, scheduled_at: '2026-11-11T20:30:00Z', status: 'scheduled' }, { now, rule: 'spec' });
  assert.equal(at.verdict, 'not_yet');
  const past = explainCall({ id: 'b', lead_id: 1, scheduled_at: '2026-11-11T20:29:00Z', status: 'scheduled' }, { now, rule: 'spec' });
  assert.equal(past.verdict, 'no_show');
  assert.equal(past.minutes_past, 31);
});

test('daylight saving ends: 1:30 AM CDT to 1:45 AM CST is 75 minutes, not 15', () => {
  const r = explainCall({ id: 'dst', lead_id: 1, scheduled_at: '2026-11-01T01:30:00-05:00', status: 'scheduled' },
    { now: '2026-11-01T01:45:00-06:00', rule: 'spec' });
  assert.equal(r.minutes_past, 75);
  assert.equal(r.verdict, 'no_show');
  assert.match(r.scheduled_at_central, /CDT/);
});

test('daylight saving starts: 1:50 AM CST to 3:10 AM CDT is 20 minutes, not 80', () => {
  const r = explainCall({ id: 'dst2', lead_id: 1, scheduled_at: '2027-03-14T01:50:00-06:00', status: 'scheduled' },
    { now: '2027-03-14T03:10:00-05:00', rule: 'spec' });
  assert.equal(r.minutes_past, 20);
  assert.equal(r.verdict, 'not_yet');
});

test('a scheduled time with no zone is unknown, never guessed', () => {
  const res = explainCalls(fx.calls, { now: fx.now, rule: 'spec' });
  const r = byId(res, 10);
  assert.equal(r.verdict, 'unknown');
  assert.equal(r.minutes_past, null);
  assert.match(r.reason, /no time zone/);
  assert.equal(toInstant('2026-11-11T14:00:00'), null);
});

test('a call in the future (or a clock running behind) is not yet a no-show', () => {
  const res = explainCalls(fx.calls, { now: fx.now, rule: 'spec' });
  const r = byId(res, 4);
  assert.equal(r.verdict, 'not_yet');
  assert.equal(r.minutes_past, -60);
  assert.match(r.reason, /after the current time/);
});

test('completed, cancelled and already-marked calls are never no-shows again', () => {
  const res = explainCalls(fx.calls, { now: fx.now, rule: 'spec' });
  assert.equal(byId(res, 5).verdict, 'not_a_no_show');
  assert.equal(byId(res, 7).verdict, 'not_a_no_show');
  assert.equal(byId(res, 6).verdict, 'already_no_show');
});

test('a lead already on the recovery queue is not added twice; a call with no lead has nobody to queue', () => {
  const res = explainCalls(fx.calls, { now: fx.now, rule: 'spec' });
  assert.match(byId(res, 9).reason, /already on the recovery queue/);
  assert.match(byId(res, 8).reason, /No lead is linked/);
});

test('failure paths: missing time, unknown status, unknown rule, missing now, bad input', () => {
  assert.equal(explainCall({ id: 1, status: 'scheduled' }, { now: fx.now, rule: 'spec' }).verdict, 'unknown');
  assert.equal(explainCall({ id: 1, scheduled_at: '2026-11-11T20:00:00Z', status: 'rescheduled' }, { now: fx.now, rule: 'spec' }).verdict, 'unknown');
  assert.equal(explainCall({ id: 1, scheduled_at: 'not a date Z', status: 'scheduled' }, { now: fx.now, rule: 'spec' }).verdict, 'unknown');
  assert.throws(() => explainCalls(fx.calls, { now: fx.now, rule: 'fifteen' }), RangeError);
  assert.throws(() => explainCalls(fx.calls, { now: fx.now }), RangeError);
  assert.throws(() => explainCalls(fx.calls, { rule: 'spec' }), RangeError);
  assert.throws(() => explainCalls(fx.calls, { now: '2026-11-11T21:00:00', rule: 'spec' }), RangeError);
  assert.throws(() => explainCalls(null, { now: fx.now, rule: 'spec' }), TypeError);
});

test('idempotent and read-only: same input, same answer, input untouched', () => {
  const before = JSON.stringify(fx.calls);
  const a = explainCalls(fx.calls, { now: fx.now, rule: 'spec' });
  const b = explainCalls(fx.calls, { now: fx.now, rule: 'spec' });
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(fx.calls), before);
});
