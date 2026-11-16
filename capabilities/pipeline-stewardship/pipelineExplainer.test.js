import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainLead, explainStats, explainForecast, refuseRevenue, EP, REFUSED_FIELDS } from './pipelineExplainer.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/responses.json', import.meta.url), 'utf8'));
const r = (k) => structuredClone(fx[k]);
const ENDPOINTS = new Set(Object.values(EP));
const DOLLARS = [9000, 10800, 8100, 3600, 40500, 61875];

// Collect every { value, source } or level row in an output, so each figure can be traced.
function figures(o, out = []) {
  if (Array.isArray(o)) o.forEach((x) => figures(x, out));
  else if (o && typeof o === 'object') {
    if ('source' in o && o.source && typeof o.source === 'object') out.push(o);
    Object.values(o).forEach((x) => figures(x, out));
  }
  return out;
}

// Acceptance: every figure traces to a named endpoint; the forecast is described as a count
// projection and never as revenue.
test('every figure traces to a named endpoint and field', () => {
  const all = [explainLead(r('lead'), r('history')), explainStats(r('stats')), explainForecast(r('forecast'))];
  const found = figures(all);
  assert.ok(found.length >= 12);
  for (const f of found) {
    assert.ok(ENDPOINTS.has(f.source.endpoint), `untraced: ${JSON.stringify(f)}`);
    if (f.status === 'known') assert.ok(f.source.field, 'a known figure names its field');
  }
  const stats = explainStats(r('stats'));
  for (const row of stats.rows) assert.equal(row.value, fx.stats.stats[row.stage], 'the figure is the field itself');
  assert.equal(explainForecast(r('forecast')).total_projected_enrolments.value, 9);
});

test('the forecast is a count projection: no dollar figure, never called revenue', () => {
  const f = explainForecast(r('forecast'));
  assert.equal(f.kind, 'count projection: projected enrolments, not revenue');
  const text = JSON.stringify(f);
  for (const d of DOLLARS) assert.ok(!text.includes(String(d)), `${d} leaked`);
  // "revenue" may appear only inside refusals and the kind label, never as a reported value.
  for (const row of f.by_level) assert.deepEqual(Object.keys(row).filter((k) => /revenue|value/.test(k)), []);
  assert.deepEqual(f.refused.map((x) => x.field), ['forecast.total_projected_revenue', 'forecast.weighted_pipeline_value', 'forecast.by_level[].projected_revenue']);
  for (const x of f.refused) assert.match(x.reason, /hardcoded \$4,500/);
});

test('asking for forecast or pipeline revenue is refused, with the reason', () => {
  for (const field of [...REFUSED_FIELDS, undefined, 'revenue']) {
    const x = refuseRevenue(field);
    assert.deepEqual([x.status, x.value], ['refused', null]);
    assert.match(x.reason, /count projection: use total projected enrolments/);
  }
});

test('a lead: its stage, and a temperature with what it is based on', () => {
  const e = explainLead(r('lead'), r('history'));
  assert.deepEqual([e.stage.value, e.temperature.value, e.temperature.status], ['meeting_scheduled', 'warm', 'known']);
  assert.match(e.temperature.basis, /interaction outcomes in the last 90 days; last change triggered by "replied"/);
  const manual = r('history'); manual.history.unshift({ trigger_type: 'manual', trigger_detail: 'admin_override', created_at: '2026-11-12T10:00:00Z' });
  assert.match(explainLead(r('lead'), manual).temperature.basis, /^Set by hand by an admin on 2026-11-12/);
});

test('a lead with no recorded activity has an unknown temperature, not cold', () => {
  const lead = r('lead'); lead.lead.lead_temperature = 'cold';
  const e = explainLead(lead, { history: [] });
  assert.deepEqual([e.temperature.status, e.temperature.value, e.temperature.shown_on_platform], ['unknown', null, 'cold']);
  assert.match(e.temperature.basis, /cold by default/);
  assert.equal(explainLead(lead, undefined).temperature.status, 'known_basis_unknown');
});

test('missing or odd values are unavailable with a reason, never zero or guessed', () => {
  const blank = r('lead'); blank.lead.pipeline_stage = '';
  assert.match(explainLead(blank, r('history')).stage.reason, /blank.*count such leads as new_lead.*Vick does not/);
  assert.equal(explainLead(undefined).stage.status, 'unavailable');
  const s = r('stats'); delete s.stats.negotiation; s.stats.lost = '30';
  const rows = explainStats(s).rows;
  assert.deepEqual(rows.filter((x) => x.status === 'unavailable').map((x) => x.what), ['leads at negotiation', 'leads at lost']);
  assert.match(explainStats(r('stats')).caveat, /blank or not a defined stage/);
  const f = r('forecast'); f.total_projected_enrollments = null;
  assert.equal(explainForecast(f).total_projected_enrolments.status, 'unavailable');
  assert.equal(explainForecast(undefined).status, 'unavailable');
  assert.equal(explainStats({}).status, 'unavailable');
});

test('read-only and deterministic: inputs untouched, same answer twice', () => {
  const lead = r('lead'); const hist = r('history'); const copy = structuredClone([lead, hist]);
  assert.deepEqual(explainLead(lead, hist), explainLead(lead, hist));
  assert.deepEqual([lead, hist], copy);
});
