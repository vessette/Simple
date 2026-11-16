import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readiness, gaps, scope } from './dutyList.js';

const draft = JSON.parse(readFileSync(new URL('./dutyList.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(draft);

// The story's acceptance is a written duty list from interviewing the sales manager. Until that
// exists, the capability must report its scope as unknown. These tests hold it there.
test('the committed draft is candidates only: it does not meet the bar, and scope is unknown', () => {
  const p = readiness(draft);
  assert.ok(p.includes('No interview recorded (who and when). Candidates are not a duty list.'));
  assert.equal(p.filter((x) => /is not confirmed by the interview/.test(x)).length, 4);
  assert.equal(scope(draft), 'unknown');
});

test('every candidate already names a data source or an explicit "unsourced"', () => {
  for (const d of draft.duties) {
    assert.ok(d.reports.length >= 1, d.duty);
    for (const r of d.reports) assert.match(r.data_source, /^(unsourced|GET \/api\/.+\.ts:\d)/, r.name);
  }
});

test('a list meets the bar once it is interviewed and every report is confirmed', () => {
  const done = clone();
  done.interviewed = { who: 'the sales manager and admissions ops', on: '2026-11-20' };
  for (const d of done.duties) for (const r of d.reports) r.confirmed = true;
  assert.deepEqual(readiness(done), []);
  assert.equal(scope(done), 'known');
});

test('the bar catches each way a list can fall short', () => {
  const base = clone();
  base.interviewed = { who: 'x', on: '2026-11-20' };
  for (const d of base.duties) for (const r of d.reports) r.confirmed = true;
  const noReport = structuredClone(base); noReport.duties[0].reports = [];
  assert.match(readiness(noReport).join(), /names no report/);
  const noSource = structuredClone(base); noSource.duties[1].reports[0].data_source = '';
  assert.match(readiness(noSource).join(), /neither a data source nor "unsourced"/);
  const empty = structuredClone(base); empty.duties = [];
  assert.match(readiness(empty).join(), /No duties listed/);
  assert.throws(() => readiness(null), RangeError);
});

test('the interview checklist: what each report still needs', () => {
  const g = gaps(draft);
  assert.equal(g.length, 4);
  for (const x of g) for (const k of ['recipient', 'timezone', 'channel', 'done_by_today']) assert.ok(x.missing.includes(k), `${x.report} ${k}`);
  assert.ok(!g.find((x) => x.report === 'Daily enrollment dashboard').missing.includes('cadence'));
});
