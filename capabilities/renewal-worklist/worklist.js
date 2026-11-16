// Renewal and revenue follow-through worklist, autonomy:R2.
// Capability: sales.renewal_and_revenue_follow_through_worklist. Read-only: Vick answers which
// members need renewal attention today and why. Every contact and every charge stays with a
// person; a lapsed period is written off, so no row ever proposes a catch-up charge.
//
// Sources (passed in by a person; the endpoint needs an admin login):
//   GET /api/admin/revenue/subscriptions   attention[] (lapsed, failed) and upcomingPayments[]
//                                          (subscriptionAnalyticsService.ts:75-118, :418-452)
//   the billing watch result               findings with rows "Name <email> ..." for
//                                          scheduled_charge_failed, lapsed_no_followup,
//                                          card_expires_before_charge (billingHealthCheck.ts)
// Standing exclusions: the emails in ACH_AWAITING_CONSENT and CARD_BLOCKED
// (subscriptionScheduleService.ts:39-43, :52-55). Those members are never on the list.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ ffc1f09 (main, 16 Nov 2026).

/**
 * Reasons, in the PROPOSED order of consequence (the sales manager sets the real order).
 * Each cites the check that produced it.
 */
export const REASONS = Object.freeze({
  autopay_declined: { rank: 1, cite: 'billingHealthCheck.ts:264 (checkPastDueScheduled)', why: 'An automatic payment was declined; the member is unpaid for this period.', next: 'Ask them to put a current card on file in PaySimple. Do not send a payment link: the schedule is still live and would charge them again.' },
  lapsed_no_followup: { rank: 2, cite: 'billingHealthCheck.ts:102-122 (LAPSED_WITHOUT_FOLLOWUP_SQL)', why: 'Past their renewal date and nobody has written to them.', next: 'Check the reminder job ran, then contact them about the next period. The lapsed period is written off, never charged.' },
  checkout_failed: { rank: 3, cite: 'subscriptionAnalyticsService.ts:443-452 (attention, kind failed)', why: 'Their latest renewal checkout failed.', next: 'Contact them to retry with a working card.' },
  lapsed: { rank: 4, cite: 'subscriptionAnalyticsService.ts:418-430 (attention, kind lapsed)', why: 'Past their renewal date.', next: 'Before contacting, check whether they are on autopay: a schedule may be about to collect (billingHealthCheck.ts:79-100). If not, offer the next period. The lapsed period is written off, never charged (paysimpleRecurring.ts:81-83).' },
  card_expiring: { rank: 5, cite: 'billingHealthCheck.ts:181 (checkExpiringCards)', why: 'Their card expires before the next charge.', next: 'Ask for a current card before the renewal date.' },
  renewal_due: { rank: 6, cite: 'subscriptionAnalyticsService.ts:418-425 (upcomingPayments)', why: 'Renewal due within 7 days.', next: 'No contact needed unless a reminder failed; the renewal reminders cover this.' },
});
export const DUE_WITHIN_DAYS = 7;
const FINDING_REASON = Object.freeze({ scheduled_charge_failed: 'autopay_declined', lapsed_no_followup: 'lapsed_no_followup', card_expires_before_charge: 'card_expiring' });

const key = (e) => String(e || '').trim().toLowerCase();
const emailIn = (row) => { const m = /<([^<>\s]+@[^<>\s]+)>/.exec(String(row)); return m ? key(m[1]) : null; };

function validate(subs, watch, exclusions) {
  if (subs !== null && (typeof subs !== 'object' || !Array.isArray(subs.attention) || !Array.isArray(subs.upcomingPayments))) throw new RangeError('The subscriptions response needs attention and upcomingPayments arrays, or null if it was not read.');
  if (watch !== null && (typeof watch !== 'object' || !Array.isArray(watch.findings))) throw new RangeError('The billing watch result needs a findings array, or null if it was not read.');
  if (!Array.isArray(exclusions)) throw new RangeError('exclusions must be the list of standing-exclusion emails (an empty list if none).');
}

/**
 * Today's worklist. `subs` and `watch` may be null when that source could not be read; the
 * list is then incomplete and says so, rather than reporting an empty day. One row per member,
 * with every reason that applies and the check behind each.
 */
export function worklist(subs, watch, exclusions = []) {
  validate(subs, watch, exclusions);
  const excluded = new Set(exclusions.map(key).filter(Boolean));
  const people = new Map();
  let excludedHits = 0;
  const add = (email, reason, detail) => {
    const k = key(email);
    if (!k) return;
    if (excluded.has(k)) { excludedHits += 1; return; }
    const p = people.get(k) || { member: k, reasons: [] };
    if (!p.reasons.some((r) => r.reason === reason)) p.reasons.push({ reason, source: REASONS[reason].cite, why: REASONS[reason].why, detail });
    people.set(k, p);
  };

  if (subs) {
    for (const a of subs.attention) add(a.payer_email, a.kind === 'failed' ? 'checkout_failed' : 'lapsed', a.kind === 'lapsed' ? `${a.days_overdue} days past ${String(a.reference_date).slice(0, 10)}` : `failed ${String(a.reference_date).slice(0, 10)}`);
    for (const u of subs.upcomingPayments) if (Number.isFinite(u.in_days) && u.in_days <= DUE_WITHIN_DAYS) add(u.payer_email, 'renewal_due', `due ${String(u.due_date).slice(0, 10)}, in ${u.in_days} days`);
  }
  if (watch) {
    for (const f of watch.findings) {
      const reason = FINDING_REASON[f.code];
      if (!reason) continue;
      for (const r of Array.isArray(f.rows) ? f.rows : []) add(emailIn(r), reason, null);
    }
  }

  const rows = [...people.values()].map((p) => {
    p.reasons.sort((a, b) => REASONS[a.reason].rank - REASONS[b.reason].rank);
    const top = p.reasons[0].reason;
    return { member: p.member, top_reason: top, rank: REASONS[top].rank, next_action: REASONS[top].next, reasons: p.reasons };
  }).sort((a, b) => a.rank - b.rank || a.member.localeCompare(b.member));

  const missing = [subs ? null : 'GET /api/admin/revenue/subscriptions', watch ? null : 'the billing watch result'].filter(Boolean);
  const complete = missing.length === 0;
  return {
    complete,
    empty: complete && rows.length === 0,
    message: !complete ? `Incomplete: ${missing.join(' and ')} could not be read, so this is not a full list and an empty one would not mean nobody needs attention.` : rows.length === 0 ? 'Nothing needs renewal attention today.' : `${rows.length} member(s) need renewal attention today.`,
    ordering: 'proposed: by consequence (declined autopay, lapsed with no follow-up, failed checkout, lapsed, card expiring, renewal due). The sales manager sets the real order.',
    rows,
    excluded: { held_out: excludedHits, rule: 'Members on the standing exclusion lists (subscriptionScheduleService.ts:39-43, :52-55) are never listed: they need consent or a new card from the cardholder, not an ordinary renewal chase.' },
    no_catch_up_charges: true,
  };
}

/** Proof that no excluded member is on the list. */
export function excludedAbsent(result, exclusions) {
  const ex = new Set(exclusions.map(key));
  return result.rows.every((r) => !ex.has(r.member));
}
