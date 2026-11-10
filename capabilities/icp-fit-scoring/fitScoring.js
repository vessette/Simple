// ICP prospect discovery and program-fit scoring, autonomy:R1 baseline.
// Capability: sales.icp_prospect_discovery_and_fit_scoring.
//
// Pure functions over committed fixtures. There is no network code in this file:
// Apollo is never called. The scoring rules are ported unchanged from the platform
// (ColaberryEnterprise_AI_LeadershipAccelerator @ 949fe19,
// backend/src/services/leadIntelligenceService.ts:7-91), with two deliberate
// differences the capability requires:
//   1. A score that cannot be computed is 'unknown', never a default number.
//      The platform scores a prospect with no title and no company size as 10.
//   2. A failed search (429, 5xx, or a malformed body) writes no recommendations
//      for that profile. The platform writes rows one at a time inside a
//      per-profile try/catch, so a mid-profile failure keeps the rows before it.

export const UNKNOWN = 'unknown';

export const DEFAULT_CONFIG = Object.freeze({
  max_leads_per_profile: 50,
  min_program_fit_score: 40,
  avg_deal_value: 25000,
});

// Unchanged from leadIntelligenceService.ts:9-19.
const EXEC_TITLES = /\b(chief|cto|cio|cdo|ceo|cfo|coo|vp|vice president|svp|evp|president|partner)\b/i;
const DIRECTOR_TITLES = /\b(director|head of|principal)\b/i;
const MANAGER_TITLES = /\b(manager|lead|senior)\b/i;
const AI_TECH_KEYWORDS = [
  'tensorflow', 'pytorch', 'python', 'databricks', 'snowflake', 'spark',
  'machine learning', 'deep learning', 'ai', 'data science', 'openai',
  'aws sagemaker', 'azure ml', 'google cloud ai', 'langchain', 'llm',
  'big data', 'data engineering', 'tableau', 'power bi',
];
const DIGITAL_TRANSFORM_KEYWORDS = /\b(digital transformation|innovation|modernization|automation|ai strategy|data-driven|digital)\b/i;

const title = (p) => (typeof p.title === 'string' ? p.title.trim() : '');
const industry = (p) => p.organization?.industry || p.industry || '';
const employees = (p) => p.organization?.estimated_num_employees ?? p.employee_count;

/**
 * The two inputs worth 25 points each. Without either, the platform falls back to a
 * 5-point default, which is the number this capability forbids inventing.
 * Assumption (for Roselyn to confirm): these two are the minimum for a real score.
 */
export function missingScoreInputs(person) {
  const missing = [];
  if (!title(person)) missing.push('title');
  const n = employees(person);
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) missing.push('employee_count');
  return missing;
}

/** Program fit 0-100, or UNKNOWN when it cannot be computed. */
export function programFitScore(person, profile) {
  if (missingScoreInputs(person).length > 0) return UNKNOWN;
  let score = 0;
  const t = title(person).toLowerCase();
  const orgIndustry = industry(person);
  const size = employees(person);
  const techStack = person.organization?.technology_names || person.technology_stack || [];

  if (EXEC_TITLES.test(t) || DIRECTOR_TITLES.test(t)) score += 25;
  else if (MANAGER_TITLES.test(t)) score += 15;
  else score += 5;

  if (size >= 200 && size <= 5000) score += 25;
  else if ((size >= 50 && size < 200) || (size > 5000 && size <= 10000)) score += 15;
  else score += 5;

  const icpIndustries = (profile.industries || []).map((i) => i.toLowerCase());
  if (orgIndustry && icpIndustries.some((ind) => orgIndustry.toLowerCase().includes(ind))) score += 20;

  const techLower = techStack.map((x) => String(x).toLowerCase());
  if (AI_TECH_KEYWORDS.some((kw) => techLower.some((x) => x.includes(kw)))) score += 15;

  if (DIGITAL_TRANSFORM_KEYWORDS.test(`${t} ${orgIndustry}`)) score += 15;

  return Math.min(100, score);
}

/** Unchanged from leadIntelligenceService.ts:78-91, except an unknown score gives an unknown ROI. */
export function estimateROI(fitScore, profile, avgDealValue = DEFAULT_CONFIG.avg_deal_value) {
  if (fitScore === UNKNOWN) return { probability_of_sale: UNKNOWN, expected_revenue: UNKNOWN };
  const rate = Number(profile.conversion_rate) || 0.05;
  const p = Math.min(1, Math.max(0, (fitScore / 100) * 0.6 + rate * 0.4));
  return {
    probability_of_sale: Math.round(p * 10000) / 10000,
    expected_revenue: Math.round(p * avgDealValue * 100) / 100,
  };
}

// A search result is usable only as { status: 200, people: [...] }.
function searchFailure(result) {
  if (!result || typeof result !== 'object') return 'no_response';
  if (result.status === 429) return 'rate_limited';
  if (typeof result.status === 'number' && result.status >= 500) return `upstream_${result.status}`;
  if (result.status !== 200) return `unexpected_status_${result.status}`;
  if (!Array.isArray(result.people)) return 'malformed_body';
  return null;
}

function recommendationFor(person, profile, campaignId, config) {
  const fit = programFitScore(person, profile);
  const roi = estimateROI(fit, profile, config.avg_deal_value);
  return {
    campaign_id: campaignId,
    icp_profile_id: profile.id,
    apollo_person_id: person.id || null,
    lead_data: {
      name: `${person.first_name || ''} ${person.last_name || ''}`.trim(),
      email: person.email || null,
      title: person.title || null,
      company: person.organization?.name || null,
      industry: person.organization?.industry || null,
      employee_count: employees(person) ?? null,
    },
    program_fit_score: fit,
    score_missing_inputs: fit === UNKNOWN ? missingScoreInputs(person) : [],
    probability_of_sale: roi.probability_of_sale,
    expected_revenue: roi.expected_revenue,
    status: 'pending', // a human approves or rejects every row; nothing here approves
  };
}

/**
 * One discovery run over fixtures. Returns new pending rows and why everything else
 * was not written. Feeding a run's own output back in as `existingRecommendations`
 * produces no new rows, so the run is safe to repeat.
 */
export function discover({
  campaignId, profiles, searchResults, existingLeadEmails = [], existingRecommendations = [], config = {},
}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const leadEmails = new Set(existingLeadEmails.map((e) => String(e).toLowerCase()));
  // Same rule as the platform: a pending or approved row blocks a second one; a rejected one does not.
  const recommended = new Set(existingRecommendations
    .filter((r) => r.campaign_id === campaignId && ['pending', 'approved'].includes(r.status) && r.apollo_person_id)
    .map((r) => r.apollo_person_id));
  const recommendations = [];
  const skipped = [];
  const failedProfiles = [];

  for (const profile of profiles) {
    const result = searchResults[profile.id];
    const failure = searchFailure(result);
    if (failure) { failedProfiles.push({ profile_id: profile.id, reason: failure }); continue; }

    const batch = [];
    for (const person of result.people.slice(0, cfg.max_leads_per_profile)) {
      const ref = person.id || person.email || '(no id)';
      if (person.email && leadEmails.has(person.email.toLowerCase())) { skipped.push({ ref, reason: 'already_a_lead' }); continue; }
      if (person.id && recommended.has(person.id)) { skipped.push({ ref, reason: 'already_recommended' }); continue; }
      const rec = recommendationFor(person, profile, campaignId, cfg);
      if (rec.program_fit_score !== UNKNOWN && rec.program_fit_score < cfg.min_program_fit_score) {
        skipped.push({ ref, reason: 'below_min_fit_score', score: rec.program_fit_score });
        continue;
      }
      if (person.id) recommended.add(person.id);
      batch.push(rec);
    }
    recommendations.push(...batch); // the whole profile's batch, or nothing
  }
  return { recommendations, skipped, failedProfiles };
}
