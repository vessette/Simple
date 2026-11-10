// Tests for sales.offer_pipeline_routing at autonomy:R2.
// Run: node --test capabilities/offer-pipeline-routing/offerTaxonomy.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CANNOT_PLACE, TAXONOMY, explainPipeline, qualificationLevel, checkRule } from './offerTaxonomy.js';

const { leads } = JSON.parse(readFileSync(new URL('./fixtures/leads.json', import.meta.url), 'utf8'));
const lead = (name) => leads.find((l) => l.name === name);
const ask = (name) => explainPipeline(lead(name));

// --- the acceptance criterion -------------------------------------------------

test('every answer cites the taxonomy rule it used, with its source line', () => {
  for (const l of leads) {
    const a = explainPipeline(l);
    if (l.routed_by === 'human') { assert.match(a.cited, /never overwrite a human routing/); continue; }
    assert.ok(a.rules.length > 0, `${l.name}: no rule cited`);
    for (const r of a.rules) {
      assert.ok(TAXONOMY.some((t) => t.id === r.id), `${l.name}: cites unknown rule ${r.id}`);
      assert.match(r.source, /^backend\/src\/services\/offerScoringService\.ts:\d+$/);
    }
    if (a.answer !== CANNOT_PLACE) assert.equal(a.rules.length, 1, `${l.name}: a placement cites exactly the rule that placed it`);
  }
});

test('an unmappable lead returns "cannot place", where the platform would default to accelerator', () => {
  const a = ask('small team, low maturity');
  assert.equal(a.answer, CANNOT_PLACE);
  assert.match(a.reason, /would default this lead to accelerator/);
  assert.ok(a.checks.every((c) => c.outcome === 'not met'));
});

test('a lead with no information is "cannot place", not accelerator', () => {
  const a = explainPipeline({});
  assert.equal(a.answer, CANNOT_PLACE);
  assert.match(a.reason, /Missing information/);
});

// --- placements, one per rule --------------------------------------------------

test('T1 places an enterprise deal and says why', () => {
  const a = ask('large org, high ROI, many departments');
  assert.equal(a.answer, 'enterprise_deal');
  assert.deepEqual(a.rules.map((r) => r.id), ['T1']);
  assert.match(a.reason, /1,000\+ employees/);
});

test('T2 places a custom build', () => {
  assert.equal(ask('mature org with a use case').answer, 'custom_build');
});

test('T3 places advisory when the qualification level is known and not low', () => {
  assert.equal(qualificationLevel(lead('moderate maturity, no use case')), 'medium'); // 12+20+8+9+12+3 = 64
  assert.equal(ask('moderate maturity, no use case').answer, 'advisory');
});

// --- the capability's exceptions ----------------------------------------------

test('contradictory signals stay unplaced instead of picking the larger offer', () => {
  const a = ask('matches enterprise and custom build');
  assert.equal(a.answer, CANNOT_PLACE);
  assert.match(a.reason, /Contradictory: matches T1 \(enterprise_deal\) and T2 \(custom_build\)/);
  assert.deepEqual(a.rules.map((r) => r.id), ['T1', 'T2']);
});

test('the taxonomy rules overlap: enterprise and advisory both match, which is flagged, not ordered', () => {
  const a = ask('matches enterprise and advisory');
  assert.equal(a.answer, CANNOT_PLACE, 'the platform resolves this by checking enterprise first');
  assert.deepEqual(a.rules.map((r) => r.id), ['T1', 'T3']);
});

test('missing information that could change the answer is named, not read as 0', () => {
  const a = ask('use case but no company size');
  assert.equal(a.answer, CANNOT_PLACE);
  assert.match(a.reason, /T2 needs company_size/);
});

test('an offer the taxonomy does not know stays unrouted', () => {
  const a = ask('names an unknown offer');
  assert.equal(a.answer, CANNOT_PLACE);
  assert.match(a.reason, /adding an offer is a manager decision/);
});

test('a human routing is reported as is, never re-evaluated', () => {
  const a = ask('routed by a person');
  assert.equal(a.answer, 'accelerator', 'the person chose accelerator, even though T2 would now match');
  assert.deepEqual(a.rules, []);
});

// --- three-valued rule checks -------------------------------------------------

test('a known failing value decides a rule even when other inputs are missing', () => {
  assert.equal(checkRule(TAXONOMY[0], { company_size: 40 }).outcome, 'not met');
  assert.equal(checkRule(TAXONOMY[0], { company_size: 4000 }).outcome, 'unknown');
});

test('zero is a real maturity score; a missing one is unknown', () => {
  assert.equal(checkRule(TAXONOMY[2], { maturity_score: 0 }).outcome, 'not met');
  assert.equal(checkRule(TAXONOMY[2], {}).outcome, 'unknown');
});

test('read-only: the module imports nothing and writes nothing', () => {
  const src = readFileSync(new URL('./offerTaxonomy.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /^import |require\(|fetch\(|\.update\(|enrol+LeadsInCampaign\(/m);
});
