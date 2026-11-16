// Abandoned-checkout explainer, autonomy:R2.
// Capability: sales.abandoned_checkout_identification. Read-only: it explains why one named
// person is or is not an abandoned checkout. It contacts nobody (live_email is default-denied)
// and changes no row.
//
// A person passes in that person's row from GET /api/admin/enrollments (Vick has no admin
// login). Every verdict names the two fields that decide it, payment_status and the latest
// subscription's status, so the manager can check it against the roster.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ 3f34163 (main, 16 Nov 2026).
//   the rule                   frontend/src/pages/admin/enrollmentPaymentFilter.ts:1-20, :38-39
//   "Not paid (any)" filter    enrollmentPaymentFilter.ts:46
//   latest subscription        backend/src/services/acceleratorService.ts:799-805, :825
//   linking marks paid         backend/src/services/appPaymentReconcileService.ts:463
//   subscription statuses      backend/src/models/Subscription.ts:21

export const CITES = Object.freeze({
  rule: 'enrollmentPaymentFilter.ts:38-39',
  why_two_fields: 'enrollmentPaymentFilter.ts:3-15',
  not_paid_any: 'enrollmentPaymentFilter.ts:46',
  latest: 'acceleratorService.ts:799-805',
  checkout_date: 'acceleratorService.ts:825',
  linking: 'appPaymentReconcileService.ts:463',
  badge_fallback: 'enrollmentPaymentFilter.ts:66',
});

const PAYMENT = Object.freeze(['paid', 'pending', 'pending_invoice', 'failed']);
const SUB = Object.freeze(['pending', 'active', 'canceled', 'failed', 'past_due']);

const subText = (sub) => (sub ? `latest subscription is ${sub.plan || 'unknown plan'}, status "${sub.status}"` : 'no subscription row');
const isoDate = (v) => {
  if (typeof v !== 'string' || !/T\d{2}:\d{2}/.test(v)) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

function validate(person, row) {
  if (typeof person !== 'string' || !person.trim()) throw new RangeError('Name the person the row belongs to.');
  if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new RangeError('A roster row is required.');
  const sub = row.subscription;
  if (sub !== undefined && sub !== null && (typeof sub !== 'object' || Array.isArray(sub) || typeof sub.status !== 'string')) {
    throw new RangeError('subscription must be null or an object with a status.');
  }
}

const base = (person, row) => ({
  person,
  payment_status: typeof row.payment_status === 'string' && row.payment_status ? row.payment_status : null,
  latest_subscription_status: row.subscription ? row.subscription.status : null,
});

/**
 * Why `person` is or is not an abandoned checkout, from their roster row. `subscription` must
 * be the latest subscription, as the roster sends it, or null when there is none. Same row,
 * same answer; the row is not modified.
 */
export function explain(person, row) {
  validate(person, row);
  const b = base(person, row);
  const sub = row.subscription || null;
  const fields = `payment_status is ${b.payment_status === null ? 'missing' : `"${b.payment_status}"`}; ${subText(sub)}`;
  const out = (verdict, on_abandoned_list, on_not_paid_list, why, cites, extra = {}) => ({ ...b, verdict, on_abandoned_list, on_not_paid_list, why: `${fields}. ${why}`, cites, ...extra });

  if (b.payment_status === null) {
    return out('unknown', false, false, 'Without a payment_status Vick cannot place this person. The roster filter leaves them off both lists, while its badge shows them as "Failed"; neither is a verdict. Check the enrolment row.', [CITES.rule, CITES.badge_fallback]);
  }
  if (sub && !SUB.includes(sub.status)) {
    return out('unknown', false, b.payment_status === 'pending', `"${sub.status}" is not a subscription status the platform defines, so Vick does not guess.`, [CITES.rule]);
  }
  if (b.payment_status === 'paid') {
    const why = sub && sub.status === 'pending'
      ? 'Excluded: this is a paid former member with a pending renewal checkout, not a prospect. Their latest subscription is pending, but they paid before, so they must not be called as a lead.'
      : 'Excluded: they have paid, so they are not an abandoned checkout.';
    return out('excluded_paid', false, false, why, [CITES.rule, CITES.why_two_fields], { excluded_reason: sub && sub.status === 'pending' ? 'paid_former_member_with_pending_renewal' : 'paid' });
  }
  if (b.payment_status !== 'pending') {
    const known = PAYMENT.includes(b.payment_status);
    return out(known ? 'not_abandoned' : 'unknown', false, false, known
      ? `Not an abandoned checkout: only payment_status "pending" can be one. They sit under "${b.payment_status}" on the roster.`
      : `"${b.payment_status}" is not a payment_status Vick knows, so it does not guess.`, [CITES.rule]);
  }
  if (!sub) {
    return out('excluded_explorer', false, true, 'Excluded: a free Explorer signup. A checkout always creates a subscription row and an Explorer signup never does, so this person never started paying.', [CITES.rule, CITES.why_two_fields, CITES.not_paid_any], { excluded_reason: 'free_explorer_signup' });
  }
  if (sub.status === 'pending') {
    const started = isoDate(sub.created_at);
    return out('abandoned_checkout', true, true, `Abandoned checkout: they started a ${sub.plan || ''} checkout and it has not been paid. ${started ? `Checkout started ${started}.` : 'The checkout date is missing, so none is given.'} Once a payment is linked, payment_status becomes "paid" and they leave this list.`.replace('a  checkout', 'a checkout'), [CITES.rule, CITES.checkout_date, CITES.linking], { checkout_started: started });
  }
  return out('not_abandoned', false, true, `Not an abandoned checkout: their latest subscription is "${sub.status}", not "pending". They are on the "Not paid (any)" list only.`, [CITES.rule, CITES.not_paid_any]);
}

/** The two lists the workflow produces, from many rows. Deterministic order: checkout date, then name. */
export function lists(rows) {
  if (!Array.isArray(rows)) throw new RangeError('lists takes an array of { person, row }.');
  const all = rows.map(({ person, row }) => explain(person, row));
  const byDate = (a, b) => (a.checkout_started || '').localeCompare(b.checkout_started || '') || a.person.localeCompare(b.person);
  return {
    abandoned: all.filter((v) => v.on_abandoned_list).sort(byDate),
    not_paid_any: all.filter((v) => v.on_not_paid_list).sort((a, b) => a.person.localeCompare(b.person)),
    excluded: all.filter((v) => v.verdict.startsWith('excluded')).sort((a, b) => a.person.localeCompare(b.person)),
    unknown: all.filter((v) => v.verdict === 'unknown').sort((a, b) => a.person.localeCompare(b.person)),
  };
}
