import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explain, describe, CHECKS } from './billingExplainer.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/watchResults.json', import.meta.url), 'utf8'));
const r = (k) => structuredClone(fx[k]);
const STATES = ['read', 'unreadable', 'empty', 'not_wired'];

// Acceptance: every finding cites the check that produced it; an unreadable source yields
// unknown rather than a pass.
test('every finding cites the check that produced it', () => {
  const e = explain(r('busy'), fx.all_read);
  assert.equal(e.findings.length, 4);
  for (const f of e.findings) {
    assert.ok(CHECKS[f.check], f.check);
    assert.equal(f.cites, CHECKS[f.check].cite);
    assert.match(f.cites, /^billingHealthCheck\.ts:\d+$/);
    assert.ok(f.severity_means && f.what_a_person_does, f.check);
  }
  assert.deepEqual(e.findings.map((f) => f.check), ['pastDueScheduled', 'scheduleMatch', 'lapsedNoFollowup', 'duplicateActive']);
});

test('an unreadable source never yields a pass, in any combination', () => {
  for (const database of STATES) for (const gateway_schedules of STATES) for (const card_expiry of STATES) for (const reminder_history of STATES) {
    const sources = { database, gateway_schedules, card_expiry, reminder_history };
    const e = explain(r('quiet'), sources);
    for (const c of e.checks) {
      const own = CHECKS[c.check].source;
      const needsDb = own !== 'database'; // every check also reads our subscriptions table
      const readable = sources[own] === 'read' && (!needsDb || database === 'read');
      assert.equal(c.status, readable ? 'passed' : 'unknown', `${c.check} with ${JSON.stringify(sources)}`);
    }
    const allRead = STATES.slice(0, 1).includes(database) && [gateway_schedules, card_expiry, reminder_history].every((s) => s === 'read');
    assert.equal(e.healthy, allRead);
    assert.equal(e.say_nothing, allRead, 'a run with an unknown check is never silent');
  }
});

test('as production runs today, card expiry is never read, so the watch is never fully healthy', () => {
  const e = explain(r('quiet'), fx.as_production_runs);
  assert.equal(e.healthy, false);
  assert.deepEqual(e.unknown, ['expiringCards']);
  assert.match(e.checks.find((c) => c.check === 'expiringCards').why, /never fetches them/);
});

test('a gateway that cannot be read leaves the schedule check unknown, not passed', () => {
  const e = explain(r('quiet'), { ...fx.all_read, gateway_schedules: 'unreadable' });
  const c = e.checks.find((x) => x.check === 'scheduleMatch');
  assert.equal(c.status, 'unknown');
  assert.match(c.why, /looks like a pass/);
});

test('a reminder history with no sends is unknown, not healthy', () => {
  const c = explain(r('quiet'), { ...fx.all_read, reminder_history: 'empty' }).checks.find((x) => x.check === 'reminderAlive');
  assert.equal(c.status, 'unknown');
  assert.match(c.why, /treats "never" as healthy/);
});

test('a check that threw is unknown, and its error is not mistaken for a finding', () => {
  const e = explain(r('one_check_failed'), fx.all_read);
  assert.equal(e.findings.length, 0);
  assert.equal(e.checks.find((c) => c.check === 'lapsedNoFollowup').status, 'unknown');
  assert.equal(e.healthy, false);
});

test('every severity is explained, and a person, not Vick, acts', () => {
  const e = explain(r('busy'), fx.all_read);
  const by = Object.fromEntries(e.findings.map((f) => [f.check, f]));
  assert.match(by.pastDueScheduled.severity_means, /^Act now/);
  assert.match(by.lapsedNoFollowup.severity_means, /^This week/);
  assert.match(by.duplicateActive.severity_means, /^Keep an eye/);
  assert.match(by.pastDueScheduled.what_a_person_does, /Do NOT send a payment link/);
  for (const f of e.findings) assert.match(f.vick_does, /^Nothing/);
});

test('a recurring finding is marked, never hidden', () => {
  const e = explain(r('busy'), fx.all_read, ['scheduled_charge_failed']);
  assert.equal(e.findings.length, 4);
  assert.equal(e.findings.find((f) => f.check === 'pastDueScheduled').recurring, true);
  assert.match(describe(e), /Also reported last run/);
});

test('an unrecognised finding is escalated, not cited to a guessed check', () => {
  const res = r('quiet');
  res.findings.push({ severity: 'soon', code: 'something_new', headline: 'New thing' });
  const e = explain(res, fx.all_read);
  assert.deepEqual([e.unrecognised.length, e.unrecognised[0].cites, e.healthy], [1, null, false]);
});

test('healthy only when every source was read and nothing was found', () => {
  const e = explain(r('quiet'), fx.all_read);
  assert.deepEqual([e.healthy, e.say_nothing, e.unknown], [true, true, []]);
  assert.ok(e.checks.every((c) => c.status === 'passed'));
  assert.match(describe(e), /All six billing checks ran/);
});

test('malformed input is refused, and the result is not modified', () => {
  assert.throws(() => explain(null, fx.all_read), RangeError);
  assert.throws(() => explain({}, fx.all_read), RangeError);
  assert.throws(() => explain(r('quiet'), null), RangeError);
  assert.throws(() => explain(r('quiet'), { ...fx.all_read, card_expiry: 'maybe' }), RangeError);
  assert.throws(() => explain({ findings: [{ code: 'x', severity: 'urgent' }] }, fx.all_read), RangeError);
  const res = r('busy'); const copy = structuredClone(res);
  assert.deepEqual(explain(res, fx.all_read), explain(res, fx.all_read));
  assert.deepEqual(res, copy);
});
