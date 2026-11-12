// Revenue, MRR, plan-mix and tenure answers from the revenue endpoints, autonomy:R2.
// Capability: sales.revenue_and_subscription_reporting. Read-only: reporting moves no
// money, but a made-up revenue figure is the most damaging thing this domain can produce.
//
// Vick answers from endpoint responses a person fetched and passed in (the endpoints need
// an admin login, which Vick doesn't have). It does no arithmetic on money: every figure
// is a field read from a named endpoint, with the filter that produced it. A missing
// response, a missing field or a non-number is reported unavailable with the reason,
// never as zero. Projections built from an assumed price times a count are refused as
// revenue.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ 109820a.
//   routes                     settingsRoutes.ts:21-31
//   payments feed and summary  revenuePaymentsService.ts:52-190
//   subscription analytics     subscriptionAnalyticsService.ts:28-146, :379-465
//   dashboard, unavailable[]   revenueDashboardService.ts:145-160, :203
//   net revenue definition     adminOs/metricRegistry.ts:171-190

const EP = Object.freeze({
  payments: 'GET /api/admin/revenue/payments',
  subscriptions: 'GET /api/admin/revenue/subscriptions',
  dashboard: 'GET /api/admin/revenue/dashboard',
  explorers: 'GET /api/admin/revenue/explorers',
  plan: 'GET /api/admin/revenue/plan/:plan',
  tenure: 'GET /api/admin/revenue/tenure/:month',
});
const ALL_TIME = 'none: all time, no period filter exists on this endpoint';

const COLLECTED = 'The recorded amount paid on each paid, active enrolment, plus available Open House deposits. One amount per enrolment: a scheduled renewal does not add to it, a later activation overwrites it, and a free seat sets it to $0 (subscriptionScheduleService.ts:243-247; subscriptionService.ts:602). A payment marked paid while only Authorized is included.';
const RUN_RATE = 'A run-rate built from the plan price on each member\'s subscription row, not money collected. It includes members whose paid period has ended; lapsedMrr and collectibleMrr show that part (subscriptionAnalyticsService.ts:39-66).';

/** Every figure Vick will give, where it comes from, and what it means. */
export const FIGURES = Object.freeze({
  collected_recorded: { ep: 'payments', field: 'summary.collected', unit: 'usd', name: 'Collected (recorded)', means: COLLECTED },
  memberships_recorded: { ep: 'payments', field: 'summary.memberships', unit: 'usd', name: 'Memberships (recorded)', means: COLLECTED },
  deposits_available: { ep: 'payments', field: 'summary.deposits', unit: 'usd', name: 'Available deposits', means: 'Open House deposits still available, not yet applied to a membership.' },
  refunds_succeeded: { ep: 'payments', field: 'summary.refunds', unit: 'usd', name: 'Refunds (succeeded)', means: 'Refunds the refund ledger records as succeeded.' },
  collected_less_refunds: { ep: 'payments', field: 'summary.net', unit: 'usd', name: 'Collected less refunds', means: 'The payments feed\'s "net": recorded collected less succeeded refunds, all time. It is not net revenue as the platform defines it, which is unavailable.' },
  net_revenue: { unavailableFrom: 'revenue.net_revenue', name: 'Net revenue' },
  mrr: { ep: 'subscriptions', field: 'kpis.mrr', unit: 'usd_month', name: 'MRR', means: RUN_RATE },
  arr: { ep: 'subscriptions', field: 'kpis.arr', unit: 'usd_year', name: 'ARR', means: `MRR times 12. ${RUN_RATE}` },
  arpu: { ep: 'subscriptions', field: 'kpis.arpu', unit: 'usd_month', name: 'ARPU', means: 'MRR divided by active subscribers.' },
  collectible_mrr: { ep: 'subscriptions', field: 'kpis.collectibleMrr', unit: 'usd_month', name: 'Collectible MRR', means: 'MRR less the part from members whose paid period has ended.' },
  lapsed_mrr: { ep: 'subscriptions', field: 'kpis.lapsedMrr', unit: 'usd_month', name: 'Lapsed MRR', means: 'The part of MRR from members whose paid period has ended and who have not renewed.' },
  active_subscribers: { ep: 'subscriptions', field: 'kpis.activeSubscribers', unit: 'count', name: 'Active subscribers', means: 'Paying members on annual or monthly. Free seats, staff and unclassified payers are counted apart, by the subscription row the page reads for each person (subscriptionAnalyticsService.ts:188-197).' },
  comped_seats: { ep: 'subscriptions', field: 'kpis.compedSeats', unit: 'count', name: 'Free seats', means: 'Paid enrolments whose row the page reads is a free seat. A revoked free seat can still be counted here.' },
  plan_mix: { ep: 'subscriptions', field: 'planBreakdown', unit: 'rows', name: 'Plan mix', means: 'Members per plan; amount is dollars a month for annual and monthly.' },
  tenure_funnel: { ep: 'subscriptions', field: 'tenureFunnel', unit: 'rows', name: 'Tenure funnel', means: 'Members by months since joining, right now. snapshotRatioPct compares different groups and is not retention (subscriptionAnalyticsService.ts:90-100).' },
  needs_attention: { ep: 'subscriptions', field: 'attention', unit: 'rows', name: 'Needs attention', means: 'Members past their period end, or with a failed renewal.' },
  plan_roster: { ep: 'plan', field: 'members', unit: 'rows', name: 'Plan roster', param: 'plan', means: 'Everyone counted under one plan.' },
  tenure_roster: { ep: 'tenure', field: 'members', unit: 'rows', name: 'Tenure roster', param: 'month', means: 'Everyone in one tenure month (5 means Month 5 and later).' },
  explorers: { ep: 'explorers', field: 'explorers', unit: 'rows', name: 'Explorers', means: 'Everyone still on the free trial.' },
});

// Fields that are projections from an assumed price times a count. Never revenue.
const PROJECTIONS = Object.freeze(['revenueForecast.projectedRevenue', 'revenueForecast.pipelineValue']);
const PARAMS = Object.freeze({ plan: ['annual', 'monthly', 'comp', 'deposit_holder', 'other', 'staff'], month: [1, 2, 3, 4, 5] });

const read = (obj, path) => path.split('.').reduce((o, k) => (o !== null && typeof o === 'object' ? o[k] : undefined), obj);
const unavailable = (key, name, reason) => ({ figure: key, name, status: 'unavailable', value: null, reason });
const keyOf = (ep, param) => (param === undefined ? ep : `${ep}:${param}`);

function netRevenue(f, responses) {
  const dash = responses[EP.dashboard];
  if (!dash) return unavailable('net_revenue', f.name, `Net revenue is unavailable, and the dashboard response that carries the reason was not given (${EP.dashboard}, field unavailable).`);
  const entry = Array.isArray(dash.unavailable) ? dash.unavailable.find((u) => u.key === f.unavailableFrom) : null;
  if (entry) return { ...unavailable('net_revenue', f.name, `The platform marks net revenue unavailable: "${entry.reason}"`), source: { endpoint: EP.dashboard, filter: 'none', field: `unavailable[key=${f.unavailableFrom}]` }, see_instead: 'collected_less_refunds' };
  return unavailable('net_revenue', f.name, `The dashboard no longer lists net revenue as unavailable, but no endpoint here serves it. A person should check ${f.unavailableFrom} in the metric registry before any figure is given.`);
}

/**
 * One figure, read from the endpoint response that holds it. `responses` maps an endpoint
 * (as in EP, with ":<param>" for roster endpoints, e.g. "GET /api/admin/revenue/plan/:plan:annual")
 * to the JSON it returned. Read-only; same input, same answer.
 */
export function answer(key, responses, param) {
  if (typeof key !== 'string') throw new RangeError('A figure name is required.');
  if (responses === null || typeof responses !== 'object' || Array.isArray(responses)) throw new RangeError('Responses must be a map of endpoint to response.');
  if (key === 'revenue') return { ...netRevenue(FIGURES.net_revenue, responses), note: 'Asked for "revenue": the platform\'s defined figure is net revenue. The recorded figures that do exist are collected_recorded and collected_less_refunds, each with what it does and does not include.' };
  const f = FIGURES[key];
  if (!f) return { figure: key, status: 'refused', value: null, reason: `"${key}" is not a figure Vick reports. Known: ${Object.keys(FIGURES).join(', ')}.` };
  if (f.unavailableFrom) return netRevenue(f, responses);
  if (f.param) {
    if (!PARAMS[f.param].includes(param)) return { figure: key, status: 'refused', value: null, reason: `${f.param} must be one of ${PARAMS[f.param].join(', ')}.` };
  }
  const endpoint = EP[f.ep];
  const res = responses[keyOf(endpoint, f.param ? param : undefined)];
  if (res === undefined) return unavailable(key, f.name, `The ${endpoint}${f.param ? ` (${f.param}=${param})` : ''} response was not given.`);
  if (res === null || typeof res !== 'object' || res.error) return unavailable(key, f.name, `${endpoint} returned an error${res && res.error ? `: ${res.error}` : ''}, so this figure is unavailable.`);
  const value = read(res, f.field);
  const filter = f.param ? `${f.param}=${param}` : ALL_TIME;
  if (f.unit === 'rows' ? !Array.isArray(value) : typeof value !== 'number' || !Number.isFinite(value)) {
    return unavailable(key, f.name, `${endpoint} has no usable ${f.field}${value === null ? ' (it is null)' : ''}, so this figure is unavailable. It is not reported as zero.`);
  }
  return {
    figure: key, name: f.name, status: 'known', unit: f.unit,
    value: f.unit === 'rows' ? value.length : value,
    rows: f.unit === 'rows' ? value : undefined,
    source: { endpoint, filter, field: f.field },
    means: f.means,
  };
}

/** Projections are an assumed price times a count. Asked for as revenue, they are refused. */
export function refuseProjection(field) {
  if (!PROJECTIONS.includes(field)) throw new RangeError(`${field} is not a projection field.`);
  return { figure: field, status: 'refused', value: null, reason: `${field} is a projection: an assumed price (the price_per_enrollment setting) times a count (revenueDashboardService.ts:145-146, :203). It is not revenue, and Vick does not report it as revenue.` };
}

/** Plain text for one answer, with its source, so a person can reproduce it. */
export function describe(a) {
  if (a.status !== 'known') return `${a.name || a.figure}: ${a.status}. ${a.reason}`;
  const v = a.unit === 'count' || a.unit === 'rows' ? String(a.value) : `$${a.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${a.unit === 'usd_month' ? ' a month' : a.unit === 'usd_year' ? ' a year' : ''}`;
  return `${a.name}: ${v}${a.unit === 'rows' ? ' rows' : ''}. Source: ${a.source.endpoint}, field ${a.source.field}, filter ${a.source.filter}. ${a.means}`;
}
