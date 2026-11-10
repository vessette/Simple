// Baseline tests for sales.icp_prospect_discovery_and_fit_scoring at autonomy:R1.
// Run: node --test capabilities/icp-fit-scoring/fitScoring.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UNKNOWN, programFitScore, estimateROI, missingScoreInputs, discover } from './fitScoring.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/run.json', import.meta.url), 'utf8'));
const run = (overrides = {}) => discover({ ...fixture, ...overrides });
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.apollo_person_id, r]));
const health = fixture.profiles[0];
const person = (id) => fixture.searchResults['icp-health'].people.find((p) => p.id === id);

// --- the acceptance criterion -------------------------------------------------

test('a prospect whose fit score cannot be computed is recorded as unknown, not a number', () => {
  const rows = byId(run().recommendations);
  // ap-3 has no company size; ap-4 has no title. The platform would score them 5-point defaults.
  for (const [id, missing] of [['ap-3', ['employee_count']], ['ap-4', ['title']]]) {
    assert.ok(rows[id], `${id} is still recorded, for a human to look at`);
    assert.equal(rows[id].program_fit_score, UNKNOWN);
    assert.deepEqual(rows[id].score_missing_inputs, missing);
    assert.equal(rows[id].probability_of_sale, UNKNOWN);
    assert.equal(rows[id].expected_revenue, UNKNOWN);
  }
});

test('a prospect with no data at all is unknown, where the platform would give 10', () => {
  assert.equal(programFitScore({}, health), UNKNOWN);
  assert.deepEqual(missingScoreInputs({}), ['title', 'employee_count']);
  assert.equal(programFitScore({ title: 'VP', organization: { estimated_num_employees: 0 } }, health), UNKNOWN, 'zero employees is missing, not small');
});

// --- baseline scoring, hand-calculated from the ported rules -------------------

test('baseline scores match the ported rules', () => {
  // ap-1: exec title 25 + size 1200 25 + industry match 20 + Python 15 + no digital keyword 0 = 85
  assert.equal(programFitScore(person('ap-1'), health), 85);
  // ap-5: manager 15 + size 150 15 + industry 20 + Tableau 15 = 65
  assert.equal(programFitScore(person('ap-5'), health), 65);
  // ap-2: other title 5 + size 30 5 + Retail not in ICP 0 = 10
  assert.equal(programFitScore(person('ap-2'), health), 10);
});

test('ROI follows the ported formula', () => {
  // (85/100)*0.6 + 0.05*0.4 = 0.53; 0.53 * 25000 = 13250
  assert.deepEqual(estimateROI(85, health), { probability_of_sale: 0.53, expected_revenue: 13250 });
  assert.deepEqual(estimateROI(UNKNOWN, health), { probability_of_sale: UNKNOWN, expected_revenue: UNKNOWN });
});

test('ported as-is: the "ai" keyword matches any tool name containing those letters', () => {
  // Baseline pins today's behaviour so a change to it is deliberate. Mailchimp is not an AI signal.
  const p = { title: 'Analyst', organization: { estimated_num_employees: 30, technology_names: ['Mailchimp'] } };
  assert.equal(programFitScore(p, health), 25, '5 + 5 + 15 for "ai" inside "mailchimp"');
});

// --- the discovery run --------------------------------------------------------

test('a run writes only pending rows for the expected prospects', () => {
  const { recommendations } = run();
  assert.deepEqual(recommendations.map((r) => r.apollo_person_id), ['ap-1', 'ap-3', 'ap-4', 'ap-5']);
  assert.ok(recommendations.every((r) => r.status === 'pending'), 'nothing is approved by the run');
  assert.equal(byId(recommendations)['ap-1'].expected_revenue, 13250);
});

test('below the minimum fit score is skipped with its score', () => {
  assert.deepEqual(run().skipped.find((s) => s.ref === 'ap-2'), { ref: 'ap-2', reason: 'below_min_fit_score', score: 10 });
});

test('Apollo 429, 5xx and a malformed body write no recommendations for that profile', () => {
  const { recommendations, failedProfiles } = run();
  assert.deepEqual(failedProfiles, [
    { profile_id: 'icp-rate-limited', reason: 'rate_limited' },
    { profile_id: 'icp-upstream-down', reason: 'upstream_503' },
    { profile_id: 'icp-malformed', reason: 'malformed_body' },
  ]);
  const failed = new Set(failedProfiles.map((f) => f.profile_id));
  assert.ok(!recommendations.some((r) => failed.has(r.icp_profile_id)));
});

test('a missing search result is a failure, not an empty success', () => {
  const { failedProfiles } = run({ searchResults: {} });
  assert.equal(failedProfiles.length, fixture.profiles.length);
  assert.ok(failedProfiles.every((f) => f.reason === 'no_response'));
});

test('an existing lead (email, any case) and an existing pending row are not recommended twice', () => {
  const reasons = Object.fromEntries(run().skipped.map((s) => [s.ref, s.reason]));
  assert.equal(reasons['ap-6'], 'already_a_lead');
  assert.equal(reasons['ap-7'], 'already_recommended');
});

test('the same person from two profiles in one run gets one row', () => {
  const { recommendations, skipped } = run();
  assert.equal(recommendations.filter((r) => r.apollo_person_id === 'ap-1').length, 1);
  assert.ok(skipped.some((s) => s.ref === 'ap-1' && s.reason === 'already_recommended'));
});

test('a rejected recommendation does not block a new one (same rule as the platform)', () => {
  const { recommendations } = run({ existingRecommendations: [{ campaign_id: 'camp-fixture-1', apollo_person_id: 'ap-7', status: 'rejected' }] });
  assert.ok(recommendations.some((r) => r.apollo_person_id === 'ap-7'));
});

test('running twice gives the same end state: the second run adds nothing', () => {
  const first = run();
  const second = run({ existingRecommendations: [...fixture.existingRecommendations, ...first.recommendations] });
  assert.equal(second.recommendations.length, 0);
});

test('the per-profile cap is respected', () => {
  const { recommendations } = run({ config: { max_leads_per_profile: 1 } });
  assert.deepEqual(recommendations.map((r) => r.apollo_person_id), ['ap-1']);
});

test('boundary: no profiles means nothing written and nothing failed', () => {
  assert.deepEqual(run({ profiles: [] }), { recommendations: [], skipped: [], failedProfiles: [] });
});

test('no live Apollo call: the module contains no network code', () => {
  const src = readFileSync(new URL('./fitScoring.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /\bfetch\(|require\(|from ['"]node:(http|https|net)['"]|axios|XMLHttpRequest/);
});
