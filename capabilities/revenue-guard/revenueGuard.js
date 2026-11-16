// Revenue-definition integrity guard, autonomy:R2.
// Capability: sales.revenue_definition_integrity_guard. Read-only: it states whether a
// revenue figure meets the app-originated-collected rule and which rule says so. It edits
// nothing and never states a revenue number of its own: a figure's value is never read,
// copied or recomputed here, so a verdict cannot leak or invent one.
//
// A person traces a figure to its source (surface, label, how it is derived) and passes
// that description in. The guard maps the derivation to one of four rule statements, each
// quoted from the platform and cited to file:line. Unknown derivations get "cannot tell",
// never "meets".
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ d4c90d3 (main, 16 Nov 2026).

/** The four rule statements. Every verdict cites exactly one of them. */
export const RULES = Object.freeze({
  app_originated: Object.freeze({
    id: 'app_originated',
    statement: 'Revenue means money collected through a checkout the app itself started. A charge on the shared gateway that the app did not originate is not revenue.',
    citations: ['campaignLinkService.ts:18', 'appPaymentReconcileService.ts:30-38'],
  }),
  enrolment_not_payment: Object.freeze({
    id: 'enrolment_not_payment',
    statement: 'An enrolment is not a payment. A count of enrolments, leads or pipeline stages never stands for money collected.',
    citations: ['revenueDashboardService.ts:293-295', 'marketingAnalyticsService.ts:18-20'],
  }),
  no_count_times_price: Object.freeze({
    id: 'no_count_times_price',
    statement: 'A count times a price is a projection, never revenue. A projection may assume a price only when it is labelled an assumption and the price is read from the setting, not from a private constant.',
    citations: ['revenueDashboardService.ts:8-12', 'revenueDashboardService.ts:144-146'],
  }),
  unavailable_not_zero: Object.freeze({
    id: 'unavailable_not_zero',
    statement: 'A missing source is reported unavailable with its reason, never as zero.',
    citations: ['adminOs/metricRegistry.ts:22', 'adminOs/metricRegistry.ts:181-188'],
  }),
});

export const DERIVATIONS = Object.freeze(['collected_payments', 'enrolment_count', 'count_times_price', 'unavailable_with_reason', 'zero_when_missing', 'unknown']);
const ORIGINS = Object.freeze(['app_checkout', 'any_gateway_charge', 'manual_entry']);
const PRESENTED = Object.freeze(['revenue', 'projection']);

const verdict = (f, result, ruleId, why) => ({
  surface: f.surface,
  label: f.label,
  traced_to: f.traced_to,
  verdict: result, // meets | breaks | projection_allowed | cannot_tell
  rule: { id: ruleId, statement: RULES[ruleId].statement, citations: [...RULES[ruleId].citations] },
  why,
});

function validate(f) {
  if (f === null || typeof f !== 'object' || Array.isArray(f)) throw new RangeError('A figure must be an object describing one surface.');
  for (const k of ['surface', 'label', 'traced_to']) {
    if (typeof f[k] !== 'string' || !f[k].trim()) throw new RangeError(`A figure needs a non-empty "${k}".`);
  }
  if (!PRESENTED.includes(f.presented_as)) throw new RangeError(`presented_as must be one of ${PRESENTED.join(', ')}.`);
  if (!DERIVATIONS.includes(f.derivation)) throw new RangeError(`derivation must be one of ${DERIVATIONS.join(', ')}.`);
  if (f.origin !== undefined && f.origin !== null && !ORIGINS.includes(f.origin)) throw new RangeError(`origin must be one of ${ORIGINS.join(', ')}, or absent.`);
}

/**
 * The verdict for one traced figure. Same input, same verdict. Any `value` on the input is
 * ignored: the guard judges where a number comes from, not what it is.
 */
export function check(f) {
  validate(f);
  switch (f.derivation) {
    case 'zero_when_missing':
      return verdict(f, 'breaks', 'unavailable_not_zero', 'When its source is missing this shows zero, which reads as "no revenue" rather than "unknown".');
    case 'unavailable_with_reason':
      return verdict(f, 'meets', 'unavailable_not_zero', 'It reports unavailable with a reason instead of a figure.');
    case 'enrolment_count':
      return verdict(f, 'breaks', 'enrolment_not_payment', 'It is built from enrolments or pipeline stages, not from payments collected.');
    case 'count_times_price': {
      if (f.presented_as === 'revenue') return verdict(f, 'breaks', 'no_count_times_price', 'It multiplies a count by a price and presents the result as revenue.');
      const fromSetting = f.price_source === 'setting';
      const labelled = f.labelled_assumption === true;
      if (fromSetting && labelled) return verdict(f, 'projection_allowed', 'no_count_times_price', 'It is a projection, labelled as an assumption, with its price read from the setting. It is not revenue and must not be added to revenue.');
      const missing = [fromSetting ? null : 'its price is a private constant, not the setting', labelled ? null : 'it is not labelled as an assumption'].filter(Boolean);
      return verdict(f, 'breaks', 'no_count_times_price', `It is a projection, but ${missing.join(' and ')}.`);
    }
    case 'collected_payments':
      if (f.origin === 'app_checkout') return verdict(f, 'meets', 'app_originated', 'It counts payments collected through checkouts the app started.');
      if (f.origin === 'any_gateway_charge' || f.origin === 'manual_entry') return verdict(f, 'breaks', 'app_originated', `It counts collected money, but not only from app-originated checkouts (origin: ${f.origin}).`);
      return verdict(f, 'cannot_tell', 'app_originated', 'It counts collected money, but where the payments came from is not traced yet. Trace the origin before it is called revenue.');
    default:
      return verdict(f, 'cannot_tell', 'app_originated', 'How this figure is derived is not traced yet, so it cannot be called revenue. Trace it to its source.');
  }
}

/** Every traced figure checked; violations listed first-class, as the workflow's output. No edits. */
export function audit(figures) {
  if (!Array.isArray(figures)) throw new RangeError('audit takes a list of traced figures.');
  const verdicts = figures.map(check).sort((a, b) => (a.surface + a.label).localeCompare(b.surface + b.label));
  return {
    checked: verdicts.length,
    breaks: verdicts.filter((v) => v.verdict === 'breaks'),
    cannot_tell: verdicts.filter((v) => v.verdict === 'cannot_tell'),
    verdicts,
  };
}

/** Plain text for one verdict, so a person can check the citation. */
export function describe(v) {
  const word = { meets: 'Meets the rule', breaks: 'Breaks the rule', projection_allowed: 'Not revenue (an allowed projection)', cannot_tell: 'Cannot tell yet' }[v.verdict];
  return `${v.surface}, "${v.label}": ${word}. ${v.why} Rule: ${v.rule.statement} (${v.rule.citations.join('; ')}). Traced to ${v.traced_to}.`;
}
