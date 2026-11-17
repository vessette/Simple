// Cancellation-reason data quality, autonomy:R0.
// Capability: sales.subscription_churn_and_renewal_risk_analysis. No risk figure is produced
// here. This answers one question by measurement: do recorded cancellation reasons support a
// churn-driver analysis at all?
//
// subscriptions.cancel_reason (Subscription.ts:79, free TEXT) is written by six code paths at
// platform a839a58, only one of which is a member's own reason:
//   member cancel            subscriptionService.ts:769   one of five presets, free text, or "No reason given"
//                            (presets at frontend SubscriptionSection.tsx:34)
//   renewal replaced a row   subscriptionService.ts:533   "superseded_by_renewal:<id>"   (not churn)
//   free seat revoked        subscriptionService.ts:725   "comp_revoked"                 (not a paying member)
//   duplicate checkout       appPaymentReconcileService.ts:433                          (not churn)
//   payment declined         subscriptionScheduleService.ts:265 (status past_due; cleared at :246 on recovery)
//   new row                  subscriptionService.ts:469   null
// So a naive count of "canceled" rows counts every renewal as churn.

export const PRESETS = Object.freeze(['Too expensive', 'Not enough time', 'Not what I expected', 'Found another option', 'Just exploring']);
export const CATEGORIES = Object.freeze([
  'member_preset', 'member_free_text', 'member_no_reason',
  'system_superseded_renewal', 'system_comp_revoked', 'system_duplicate_checkout',
  'payment_decline', 'missing',
]);
const NOT_CHURN = new Set(['system_superseded_renewal', 'system_comp_revoked', 'system_duplicate_checkout']);

/** One reason, in the same order as the SQL CASE below, so the two cannot disagree. */
export function classifyReason(status, reason) {
  if (reason === null || reason === undefined || reason === '') return 'missing';
  const r = String(reason);
  if (r.startsWith('superseded_by_renewal:')) return 'system_superseded_renewal';
  if (r === 'comp_revoked') return 'system_comp_revoked';
  if (r.startsWith('duplicate checkout submission')) return 'system_duplicate_checkout';
  if (status === 'past_due') return 'payment_decline';
  if (r === 'No reason given') return 'member_no_reason';
  if (PRESETS.includes(r)) return 'member_preset';
  return 'member_free_text';
}

/**
 * The read-only query to run against production. It returns counts per category only: no
 * free text leaves the database, so the result can be shared and committed safely.
 */
export const MEASURE_SQL = `SELECT s.status, s.plan,
  CASE
    WHEN s.cancel_reason IS NULL OR s.cancel_reason = '' THEN 'missing'
    WHEN s.cancel_reason LIKE 'superseded\\_by\\_renewal:%' THEN 'system_superseded_renewal'
    WHEN s.cancel_reason = 'comp_revoked' THEN 'system_comp_revoked'
    WHEN s.cancel_reason LIKE 'duplicate checkout submission%' THEN 'system_duplicate_checkout'
    WHEN s.status = 'past_due' THEN 'payment_decline'
    WHEN s.cancel_reason = 'No reason given' THEN 'member_no_reason'
    WHEN s.cancel_reason IN (${PRESETS.map((p) => `'${p}'`).join(', ')}) THEN 'member_preset'
    ELSE 'member_free_text'
  END AS category,
  to_char(date_trunc('month', COALESCE(s.canceled_at, s.updated_at)), 'YYYY-MM') AS month,
  COUNT(*)::int AS n
FROM subscriptions s
WHERE s.status IN ('canceled', 'past_due')
GROUP BY 1, 2, 3, 4
ORDER BY 1, 2, 3, 4;`;

/** Member cancellations per month: how many, how many with a reason, how many from a preset. */
function byMonth(paying) {
  const out = {};
  for (const r of paying) {
    if (r.status !== 'canceled' || !r.category.startsWith('member_')) continue;
    const m = typeof r.month === 'string' && /^\d{4}-\d{2}$/.test(r.month) ? r.month : 'unknown';
    const n = Number.isInteger(r.n) && r.n >= 0 ? r.n : 0;
    const b = out[m] || (out[m] = { member_cancellations: 0, with_a_reason: 0, with_a_preset_reason: 0 });
    b.member_cancellations += n;
    if (r.category === 'member_preset' || r.category === 'member_free_text') b.with_a_reason += n;
    if (r.category === 'member_preset') b.with_a_preset_reason += n;
  }
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
}

/**
 * The answer, from the query's rows ({ status, plan, category, n }). Paying plans only (comp,
 * staff and explorer are not paying members). Returns counts and, only if the population is at
 * least `minPopulation`, shares. `minPopulation` is the sales manager's to set; without it the
 * result stays counts-only and the verdict is left to her.
 */
export function measure(rows, { minPopulation = null } = {}) {
  if (!Array.isArray(rows)) throw new RangeError('rows must be the query result.');
  const paying = rows.filter((r) => r && ['annual', 'monthly'].includes(r.plan));
  const count = (pred) => paying.filter(pred).reduce((a, r) => a + (Number.isInteger(r.n) && r.n >= 0 ? r.n : 0), 0);
  for (const r of paying) if (!CATEGORIES.includes(r.category)) throw new RangeError(`Unknown category "${r.category}".`);
  const memberCancels = count((r) => r.status === 'canceled' && r.category.startsWith('member_'));
  const withDriver = count((r) => r.status === 'canceled' && (r.category === 'member_preset' || r.category === 'member_free_text'));
  const preset = count((r) => r.status === 'canceled' && r.category === 'member_preset');
  const notChurn = count((r) => NOT_CHURN.has(r.category));
  const out = {
    measured: rows.length > 0,
    member_cancellations: memberCancels,
    with_a_reason: withDriver,
    with_a_preset_reason: preset,
    no_reason_given: count((r) => r.status === 'canceled' && r.category === 'member_no_reason'),
    excluded_not_churn: notChurn,
    payment_declines: count((r) => r.category === 'payment_decline'),
    risk_figure: null, // R0: never produced
    // Coverage per month: if the preset reasons arrived recently, older months can only hold
    // free text, and an all-time share would hide that.
    by_month: byMonth(paying),
  };
  if (minPopulation === null) return { ...out, report_as: 'counts', verdict: 'For the sales manager: no minimum population has been set, so no share is computed.' };
  if (!Number.isInteger(minPopulation) || minPopulation < 1) throw new RangeError('minPopulation must be a whole number of at least 1.');
  if (memberCancels < minPopulation) return { ...out, report_as: 'counts', verdict: `Only ${memberCancels} member cancellation(s), below the minimum of ${minPopulation}: counts only, no rates.` };
  const share = withDriver / memberCancels;
  return { ...out, report_as: 'shares', share_with_reason: Math.round(share * 1000) / 1000, verdict: `${withDriver} of ${memberCancels} member cancellations carry a reason (${preset} from the presets).` };
}
