// Offer pipeline classification for unrouted leads, autonomy:R2.
// Capability: sales.offer_pipeline_routing.
//
// R2 is "answer questions using approved knowledge and records": given a described
// lead, say which offer pipeline it belongs to and cite the taxonomy rule used.
// Nothing here writes a label, enrols a lead or calls anything.
//
// The taxonomy is the platform's classifyOffer() rules (ColaberryEnterprise_AI_
// LeadershipAccelerator @ 949fe19, backend/src/services/offerScoringService.ts:91-131),
// ported unchanged. It is a DRAFT: no approved offer taxonomy exists, and Roselyn has
// not reviewed this one. Three platform behaviours are deliberately not carried over:
//   1. The fallback "Default: Accelerator" (:125-130). Every lead matching no rule is
//      given Accelerator, even one with no data. Here that is 'cannot place'.
//   2. First-match-wins (:99-123). A lead matching two rules gets the larger offer.
//      The capability says contradictory signals stay unrouted.
//   3. Missing values read as 0 (`|| 0`, :92-95). Here a missing value is unknown.

export const CANNOT_PLACE = 'cannot place';
const SRC = 'backend/src/services/offerScoringService.ts';

const EXEC_TITLES = /\b(chief|cto|cio|cdo|ceo|cfo|coo|vp|vice president|svp|evp|president|partner)\b/i;
const DIRECTOR_TITLES = /\b(director|head of|principal)\b/i;
const MANAGER_TITLES = /\b(manager|lead|senior)\b/i;
const HIGH_VALUE_INDUSTRIES = ['financial services', 'healthcare', 'technology', 'manufacturing', 'energy', 'insurance', 'government'];

// Inputs read from a described lead. A value that is absent is unknown, never 0.
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const inputs = {
  company_size: (l) => { const n = num(l.company_size ?? l.employee_count); return n !== null && n > 0 ? n : null; },
  estimated_roi: (l) => num(typeof l.estimated_roi === 'string' ? parseFloat(l.estimated_roi) : l.estimated_roi),
  departments_impacted: (l) => (Array.isArray(l.departments_impacted) ? l.departments_impacted.length : null),
  maturity_score: (l) => num(l.maturity_score),
  // Absent idea_input means no use case was given: a real "no", as on the platform.
  has_idea_input: (l) => typeof l.idea_input === 'string' && l.idea_input.length > 20,
  qualification_level: (l) => qualificationLevel(l),
};

/**
 * The platform's weighted lead score (offerScoringService.ts:19-77) and its level.
 * Returns null if any component is missing, instead of scoring the gap as 0 or 15.
 */
export function qualificationLevel(lead) {
  const size = inputs.company_size(lead);
  const title = typeof lead.title === 'string' && lead.title.trim() ? lead.title.toLowerCase() : null;
  const maturity = inputs.maturity_score(lead);
  const roi = inputs.estimated_roi(lead);
  const industry = typeof lead.industry === 'string' && lead.industry.trim() ? lead.industry.toLowerCase() : null;
  const engagement = num(lead.engagement_count); // the platform counts interaction_outcomes here
  if ([size, title, maturity, roi, industry, engagement].some((v) => v === null)) return null;

  const sizeScore = size >= 10000 ? 100 : size >= 1000 ? 80 : size >= 500 ? 60 : size >= 100 ? 40 : size >= 50 ? 20 : 0;
  const seniority = EXEC_TITLES.test(title) ? 100 : DIRECTOR_TITLES.test(title) ? 70 : MANAGER_TITLES.test(title) ? 40 : 15;
  const roiScore = roi >= 1000000 ? 100 : roi >= 500000 ? 80 : roi >= 100000 ? 60 : roi >= 50000 ? 40 : roi > 0 ? 20 : 0;
  const industryScore = HIGH_VALUE_INDUSTRIES.some((i) => industry.includes(i)) ? 80 : 30;
  const total = Math.round(sizeScore * 0.2 + seniority * 0.2 + Math.min(maturity, 100) * 0.2
    + roiScore * 0.15 + industryScore * 0.15 + Math.min(engagement * 10, 100) * 0.1);
  return total >= 70 ? 'high' : total >= 40 ? 'medium' : 'low';
}

/** The draft taxonomy. Each rule is a list of conditions that must all hold. */
export const TAXONOMY = Object.freeze([
  { id: 'T1', offer: 'enterprise_deal', source: `${SRC}:99`,
    text: 'Company of 1,000+ employees, estimated ROI of $500,000+, and 3+ departments impacted',
    conditions: [
      ['company_size', (v) => v >= 1000, '1,000+ employees'],
      ['estimated_roi', (v) => v >= 500000, 'ROI of $500,000+'],
      ['departments_impacted', (v) => v >= 3, '3+ departments impacted'],
    ] },
  { id: 'T2', offer: 'custom_build', source: `${SRC}:108`,
    text: 'Maturity score of 60+, a specific use case described (over 20 characters), and 100+ employees',
    conditions: [
      ['maturity_score', (v) => v >= 60, 'maturity 60+'],
      ['has_idea_input', (v) => v === true, 'a use case described'],
      ['company_size', (v) => v >= 100, '100+ employees'],
    ] },
  { id: 'T3', offer: 'advisory', source: `${SRC}:117`,
    text: 'Maturity score of 30+, qualification level not low, and no specific use case described',
    conditions: [
      ['maturity_score', (v) => v >= 30, 'maturity 30+'],
      ['qualification_level', (v) => v !== 'low', 'qualification not low'],
      ['has_idea_input', (v) => v === false, 'no use case described'],
    ] },
]);

export const OFFERS = Object.freeze(['accelerator', ...TAXONOMY.map((r) => r.offer)]);

/** Three-valued: 'met', 'not met' (a known value fails), or 'unknown' (a missing value could decide it). */
export function checkRule(rule, lead) {
  const missing = [];
  let failed = false;
  for (const [field, test] of rule.conditions) {
    const v = inputs[field](lead);
    if (v === null) missing.push(field);
    else if (!test(v)) failed = true;
  }
  const outcome = failed ? 'not met' : missing.length ? 'unknown' : 'met';
  return { id: rule.id, offer: rule.offer, source: rule.source, outcome, missing: failed ? [] : missing };
}

const cite = (rule) => ({ id: rule.id, text: rule.text, source: rule.source });

/** Which pipeline a described lead belongs to, and why. Every answer cites the rules it used. */
export function explainPipeline(lead) {
  if (lead.recommended_offer && !OFFERS.includes(lead.recommended_offer)) {
    return { answer: CANNOT_PLACE, reason: `"${lead.recommended_offer}" is not an offer in the taxonomy; adding an offer is a manager decision`,
      rules: TAXONOMY.map(cite) };
  }
  if (lead.recommended_offer && lead.routed_by === 'human') {
    return { answer: lead.recommended_offer, reason: 'Already routed by a person. A human routing is never re-evaluated or overwritten.',
      rules: [], cited: 'capability exception: never overwrite a human routing' };
  }

  const checks = TAXONOMY.map((r) => checkRule(r, lead));
  const met = checks.filter((c) => c.outcome === 'met');
  const unknown = checks.filter((c) => c.outcome === 'unknown');
  const cited = (ids) => TAXONOMY.filter((r) => ids.includes(r.id)).map(cite);

  if (met.length > 1) {
    return { answer: CANNOT_PLACE, reason: `Contradictory: matches ${met.map((c) => `${c.id} (${c.offer})`).join(' and ')}. Not resolved by picking the larger offer.`,
      rules: cited(met.map((c) => c.id)), checks };
  }
  if (unknown.length > 0) {
    const what = unknown.map((c) => `${c.id} needs ${c.missing.join(', ')}`).join('; ');
    return { answer: CANNOT_PLACE, reason: `Missing information could change the answer: ${what}.`,
      rules: cited([...met, ...unknown].map((c) => c.id)), checks };
  }
  if (met.length === 1) {
    const rule = TAXONOMY.find((r) => r.id === met[0].id);
    return { answer: rule.offer, reason: `Matches ${rule.id}: ${rule.text}.`, rules: [cite(rule)], checks };
  }
  return { answer: CANNOT_PLACE,
    reason: 'No rule matches. The platform would default this lead to accelerator, but the taxonomy has no rule that places a lead in accelerator.',
    rules: TAXONOMY.map(cite), checks };
}
