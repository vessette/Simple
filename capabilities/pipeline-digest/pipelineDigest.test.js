import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SOURCES, QUESTIONS, answer, figuresFor, listFor, composeDigest } from './pipelineDigest.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/sources.json', import.meta.url), 'utf8'));
const ok = () => structuredClone(fx.all_ok);
const partial = () => structuredClone(fx.partial);
const NOW = new Date('2026-11-12T14:00:00Z'); // 8:00 AM CST
const base = (over = {}) => ({ sources: ok(), settings: { digest_enabled: true }, now: NOW, recipient: 'roselyn@example.com', sentKeys: [], ...over });
const allFigures = (d) => d.sections.flatMap((s) => s.figures ?? []);

// Acceptance: every figure carries its source, and an unavailable source is reported as
// unavailable with the reason.
test('every figure carries its source', () => {
  for (const sources of [ok(), partial()]) {
    for (const q of Object.keys(QUESTIONS)) {
      const a = answer(q, sources);
      const items = a.figures ?? [a.list];
      for (const f of items) {
        assert.ok(SOURCES[f.source], `${q}: unknown source`);
        assert.equal(f.from, SOURCES[f.source].platform, `${q}: figure without its platform source`);
      }
    }
  }
});

test('an unavailable source is reported as unavailable with the reason, never as 0', () => {
  const d = composeDigest(base({ sources: partial() }));
  const enr = d.sections.find((s) => s.question === 'enrollment_state').figures;
  assert.equal(enr.length, 4);
  for (const f of enr) {
    assert.equal(f.status, 'unavailable');
    assert.equal(f.value, null);
    assert.match(f.reason, /Timed out/);
  }
  const rev = d.sections.find((s) => s.question === 'collected_revenue').figures[0];
  assert.equal(rev.status, 'unavailable');
  assert.notEqual(rev.value, 0);
  assert.match(rev.reason, /not yet wired/);
  const calls = d.sections.find((s) => s.question === 'upcoming_calls').list;
  assert.equal(calls.status, 'unavailable');
  assert.equal(calls.rows, null);
  assert.match(calls.reason, /503/);
});

test('a missing field is unavailable, but a real zero stays a zero', () => {
  const p = figuresFor(partial(), 'pipeline', 'all');
  assert.deepEqual(p.find((f) => f.field === 'qualified'), { source: 'pipeline', field: 'qualified', value: 0, status: 'available', reason: null, from: SOURCES.pipeline.platform, as_of: '2026-11-12T13:00:00Z' });
  const l = figuresFor(partial(), 'leads', ['total', 'thisMonth']);
  assert.equal(l[0].value, 310);
  assert.equal(l[1].status, 'unavailable');
  assert.match(l[1].reason, /no number for "thisMonth"/);
});

test('one failed source does not sink the digest: the rest still report', () => {
  const d = composeDigest(base({ sources: partial() }));
  assert.equal(d.produced, true);
  assert.equal(d.unavailable_count, 4 + 1 + 1 + 1);
  assert.equal(d.sections.find((s) => s.question === 'pipeline_by_stage').figures.length, 4);
  assert.match(d.headline, /^2 items need your attention/);
});

test('happy path: all sources answer and nothing needs attention, so it says so', () => {
  const d = composeDigest(base());
  assert.equal(d.produced, true);
  assert.equal(d.unavailable_count, 0);
  assert.equal(d.headline, 'Nothing needs your attention today.');
  assert.ok(allFigures(d).every((f) => f.status === 'available' && f.as_of));
});

test('"nothing to report" is never claimed when the attention list is unavailable', () => {
  const s = ok();
  s.needs_attention = { ok: false, reason: 'Query failed.' };
  const d = composeDigest(base({ sources: s }));
  assert.match(d.headline, /unavailable today/);
  assert.notEqual(d.headline, 'Nothing needs your attention today.');
});

test('digest disabled in settings: nothing produced, and it says so', () => {
  for (const settings of [{ digest_enabled: false }, {}, null]) {
    const d = composeDigest(base({ settings }));
    assert.equal(d.produced, false);
    assert.match(d.reason, /disabled in settings/);
  }
});

test('re-run on the same Central day: nothing a second time; the next day is new', () => {
  const first = composeDigest(base());
  assert.equal(first.key, '2026-11-12|roselyn@example.com');
  const again = composeDigest(base({ sentKeys: [first.key], recipient: 'Roselyn@Example.com' }));
  assert.equal(again.produced, false);
  assert.match(again.reason, /already sent/);
  const tomorrow = composeDigest(base({ sentKeys: [first.key], now: new Date('2026-11-13T14:00:00Z') }));
  assert.equal(tomorrow.produced, true);
});

test('the date key is the Central date, not the UTC date', () => {
  const lateEvening = composeDigest(base({ now: new Date('2026-11-13T03:30:00Z') })); // 9:30 PM CST on the 12th
  assert.equal(lateEvening.key, '2026-11-12|roselyn@example.com');
});

test('questions it cannot answer are refused with the list it can', () => {
  const a = answer('total_revenue_forecast', ok());
  assert.equal(a.answerable, false);
  assert.match(a.reason, /pipeline_by_stage/);
});

test('failure paths: malformed source results and bad inputs', () => {
  assert.equal(listFor({ needs_attention: { ok: true, data: { rows: 'none' } } }, 'needs_attention').status, 'unavailable');
  assert.equal(figuresFor({ leads: { ok: true } }, 'leads', ['total'])[0].status, 'unavailable');
  assert.equal(figuresFor({}, 'leads', ['total'])[0].status, 'unavailable');
  assert.equal(figuresFor({ pipeline: { ok: false } }, 'pipeline', 'all')[0].field, '*');
  assert.throws(() => composeDigest(base({ now: new Date('nope') })), RangeError);
  assert.throws(() => composeDigest(base({ recipient: '' })), RangeError);
});

test('idempotent and read-only: same input, same digest, sources untouched', () => {
  const s = partial();
  const before = JSON.stringify(s);
  assert.deepEqual(composeDigest(base({ sources: s })), composeDigest(base({ sources: partial() })));
  assert.equal(JSON.stringify(s), before);
});
