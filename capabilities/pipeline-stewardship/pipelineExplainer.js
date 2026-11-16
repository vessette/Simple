// Pipeline stage, lead temperature and forecast explainer, autonomy:R2.
// Capability: sales.pipeline_stage_and_lead_temperature_stewardship. Read-only: Vick explains
// where a named lead sits, what its temperature is based on, and what the pipeline stats and
// forecast say. It changes no stage or temperature.
//
// Every figure is a field read from a named endpoint response that a person passed in. The
// forecast is a COUNT projection: projected enrolments. Its dollar fields multiply counts by a
// hardcoded $4,500 (opportunityScoringService.ts:18), a retired price that nobody has paid, so
// they are refused, never reported as revenue.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ 30091e1 (main, 16 Nov 2026).
//   routes        backend/src/routes/admin/leadRoutes.ts:73, :76-78, :153; insightRoutes.ts:80-83
//   stats         backend/src/services/leadService.ts:694-719 (blank or unknown stage counted as new_lead)
//   forecast      backend/src/services/opportunityScoringService.ts:18, :38-44, :378-412
//   temperature   backend/src/services/leadClassificationService.ts:24-30, :36-73 (90 days of outcomes; none = cold)
//   stage moves   backend/src/services/pipelineService.ts (automatic moves only go forward)

export const EP = Object.freeze({
  lead: 'GET /api/admin/leads/:id',
  history: 'GET /api/admin/leads/:id/temperature-history',
  stats: 'GET /api/admin/pipeline/stats',
  summary: 'GET /api/admin/opportunities/summary',
  forecast: 'GET /api/admin/opportunities/forecast',
});
export const STAGES = Object.freeze(['new_lead', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'enrolled', 'lost']);
const TEMPS = Object.freeze(['cold', 'cool', 'warm', 'hot', 'qualified']);
// Dollar fields built from a count times the hardcoded $4,500. Never revenue.
export const REFUSED_FIELDS = Object.freeze([
  'forecast.total_projected_revenue', 'forecast.weighted_pipeline_value', 'forecast.by_level[].projected_revenue',
  'summary.total_pipeline_value',
]);
const REFUSAL = 'is a count multiplied by a hardcoded $4,500 per enrolment (opportunityScoringService.ts:18, :394, :399, :403; summary sums the same per-lead figure, :200, :354). $4,500 is a retired price nobody has paid, and a projection is not collected money, so Vick does not report it, as revenue or otherwise.';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const unavailable = (what, endpoint, reason) => ({ what, status: 'unavailable', value: null, source: { endpoint }, reason });

/** Where a named lead sits, and what its temperature is based on. */
export function explainLead(leadRes, historyRes) {
  if (!isObj(leadRes)) return { stage: unavailable('stage', EP.lead, `The ${EP.lead} response was not given.`), temperature: unavailable('temperature', EP.lead, `The ${EP.lead} response was not given.`) };
  const lead = isObj(leadRes.lead) ? leadRes.lead : leadRes;
  const stage = STAGES.includes(lead.pipeline_stage)
    ? { what: 'stage', status: 'known', value: lead.pipeline_stage, source: { endpoint: EP.lead, field: 'pipeline_stage' } }
    : unavailable('stage', EP.lead, `pipeline_stage is ${lead.pipeline_stage === undefined || lead.pipeline_stage === null || lead.pipeline_stage === '' ? 'blank' : `"${lead.pipeline_stage}", not a stage the platform defines`}. The stats count such leads as new_lead (leadService.ts:704-717); Vick does not.`);

  const history = isObj(historyRes) && Array.isArray(historyRes.history) ? historyRes.history : null;
  const t = lead.lead_temperature;
  let temperature;
  if (!TEMPS.includes(t)) {
    temperature = unavailable('temperature', EP.lead, `lead_temperature is ${t ? `"${t}", not one the platform defines` : 'blank'}.`);
  } else if (history === null) {
    temperature = { what: 'temperature', status: 'known_basis_unknown', value: t, source: { endpoint: EP.lead, field: 'lead_temperature' }, basis: `The ${EP.history} response was not given, so what this is based on is unknown.` };
  } else if (history.length === 0) {
    // No change was ever recorded: the value is the platform default, not a reading of activity.
    temperature = { what: 'temperature', status: 'unknown', value: null, shown_on_platform: t, source: { endpoint: EP.history, field: 'history' }, basis: `No temperature change has ever been recorded for this lead. A lead with no interaction outcomes in 90 days scores 0, which the platform shows as cold by default (leadClassificationService.ts:69-73, :93). Vick reports unknown, not ${t}.` };
  } else {
    const latest = [...history].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
    const manual = latest.trigger_type === 'manual';
    temperature = {
      what: 'temperature', status: 'known', value: t, source: { endpoint: EP.lead, field: 'lead_temperature' },
      basis: manual
        ? `Set by hand by an admin${latest.created_at ? ` on ${String(latest.created_at).slice(0, 10)}` : ''} (${EP.history}, trigger_type manual).`
        : `Worked out from the lead's interaction outcomes in the last 90 days${latest.trigger_detail ? `; last change triggered by "${latest.trigger_detail}"` : ''} (${EP.history}; thresholds at leadClassificationService.ts:24-30).`,
      changes_recorded: history.length,
    };
  }
  return { stage, temperature, note: 'Automatic stage moves only ever go forward (pipelineService.ts). A stage moved back by a person can be moved forward again by an automatic trigger such as a sent email.' };
}

/** Leads per stage, from the stats endpoint, read as given. */
export function explainStats(statsRes) {
  if (!isObj(statsRes) || !isObj(statsRes.stats)) return unavailable('pipeline stats', EP.stats, `The ${EP.stats} response was not given or has no stats.`);
  const rows = STAGES.map((s) => (num(statsRes.stats[s])
    ? { stage: s, status: 'known', value: statsRes.stats[s], source: { endpoint: EP.stats, field: `stats.${s}` } }
    : unavailable(`leads at ${s}`, EP.stats, `stats.${s} is missing or not a number; not reported as zero.`)));
  return { what: 'pipeline stats', rows, caveat: `new_lead includes leads whose stage is blank or not a defined stage (leadService.ts:704-717), so it can be higher than the number of genuinely new leads.` };
}

/**
 * The forecast as a count projection. Projected enrolments per level and in total; the dollar
 * fields are refused. Asking for revenue gets a refusal, never a figure.
 */
export function explainForecast(forecastRes) {
  if (!isObj(forecastRes)) return unavailable('forecast', EP.forecast, `The ${EP.forecast} response was not given.`);
  const levels = Array.isArray(forecastRes.by_level) ? forecastRes.by_level : null;
  const total = forecastRes.total_projected_enrollments;
  return {
    what: 'forecast',
    kind: 'count projection: projected enrolments, not revenue',
    total_projected_enrolments: num(total)
      ? { status: 'known', value: total, source: { endpoint: EP.forecast, field: 'total_projected_enrollments' } }
      : unavailable('total projected enrolments', EP.forecast, 'total_projected_enrollments is missing or not a number; not reported as zero.'),
    by_level: levels === null ? unavailable('forecast by level', EP.forecast, 'by_level is missing.') : levels.map((l) => ({
      level: l.level,
      leads: num(l.count) ? l.count : null,
      assumed_conversion_rate: num(l.conversion_rate) ? l.conversion_rate : null,
      projected_enrolments: num(l.projected_enrollments) ? l.projected_enrollments : null,
      source: { endpoint: EP.forecast, field: 'by_level[]' },
    })),
    assumption: 'Projected enrolments are leads at each level times a fixed conversion rate per level (opportunityScoringService.ts:38-44). The rates are assumptions, not measured.',
    refused: REFUSED_FIELDS.filter((f) => f.startsWith('forecast')).map((field) => ({ field, reason: `${field} ${REFUSAL}` })),
  };
}

/** A direct request for a forecast or pipeline dollar figure. Always refused. */
export function refuseRevenue(field) {
  return { field: field || 'revenue', status: 'refused', value: null, reason: `${REFUSED_FIELDS.includes(field) ? field : 'A forecast or pipeline revenue figure'} ${REFUSAL} The forecast is a count projection: use total projected enrolments.` };
}
