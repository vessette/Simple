// Enrolment completion follow-through, autonomy:R2.
// Capability: sales.enrollment_completion_follow_through. Read-only: for a named person, Vick
// states which step of enrolment they are stuck at, the next action, and who owns it. It
// contacts nobody (live_email is default-denied); a person does the chasing.
//
// Input: that person's enrolment rows from GET /api/admin/enrollments, each with its latest
// subscription as the roster sends it (acceleratorService.ts:799-826). Rows are grouped by
// email, so a person with two rows (say an abandoned checkout and a free Explorer account) is
// one person. Owners come from a step-to-owner map the sales manager provides; a step with no
// owner is reported "unowned", never handed to whoever is nearest.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ ffc1f09 (main, 16 Nov 2026).

/** The steps, most advanced first, with the rule and the line that defines each. */
export const STEPS = Object.freeze({
  complete: { order: 0, label: 'Complete: paid, active and able to sign in', cite: 'enrollmentService.ts:143-144', next: null },
  paid_locked_out: { order: 1, label: 'Paid but locked out of the portal', cite: 'enrollmentService.ts:139-144, :293-303 (portal access gates on portal_enabled, not payment)', next: 'Turn on portal access for this paid student. This is a completion failure, not a payment one.' },
  invoice_unpaid: { order: 2, label: 'Invoice sent, not paid (holding a seat)', cite: 'enrollmentService.ts:72-100 (an invoice enrolment takes its seat at once, :95)', next: 'Chase the invoice, or release the seat: it is held from someone who could pay.' },
  payment_failed: { order: 3, label: 'Payment failed', cite: 'enrollmentService.ts:239-249', next: 'Contact them to retry payment with a working card.' },
  checkout_abandoned: { order: 4, label: 'Started a checkout and stopped', cite: 'enrollmentPaymentFilter.ts:38-39', next: 'Call them about finishing the checkout.' },
  not_started: { order: 5, label: 'Enrolled but never started a checkout', cite: 'enrollmentPaymentFilter.ts:46', next: 'Send them the checkout link, or ask whether they still intend to enrol.' },
  explorer_only: { order: 6, label: 'Free Explorer account only (not a paid enrolment)', cite: 'enrollmentService.ts:328-428; enrollmentPaymentFilter.ts:3-15', next: null },
});
const PAYMENT = Object.freeze(['paid', 'pending', 'pending_invoice', 'failed']);

const traceOf = (r) => ({
  enrollment_id: r.id ?? null,
  payment_status: r.payment_status ?? null,
  status: r.status ?? null,
  portal_enabled: typeof r.portal_enabled === 'boolean' ? r.portal_enabled : null,
  enrollment_type: r.enrollment_type ?? null,
  latest_subscription_status: r.subscription ? r.subscription.status ?? null : null,
});

/** The step one enrolment row is at, with the fields that decided it. Unknown is never guessed. */
export function stepOfRow(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new RangeError('An enrolment row is required.');
  const t = traceOf(r);
  if (t.status !== null && t.status !== 'active') return { step: 'not_followed', trace: t, why: `Enrolment status is "${t.status}", so it is not an enrolment in progress.` };
  if (!PAYMENT.includes(t.payment_status)) return { step: 'unknown', trace: t, why: `payment_status is ${t.payment_status === null ? 'missing' : `"${t.payment_status}"`}; Vick does not guess the step.` };
  if (t.payment_status === 'paid') {
    if (t.portal_enabled === null) return { step: 'unknown', trace: t, why: 'Paid, but portal_enabled was not given, so Vick cannot tell whether they can sign in.' };
    return { step: t.portal_enabled ? 'complete' : 'paid_locked_out', trace: t };
  }
  if (t.payment_status === 'pending_invoice') return { step: 'invoice_unpaid', trace: t };
  if (t.payment_status === 'failed') return { step: 'payment_failed', trace: t };
  // pending
  if (t.latest_subscription_status === 'pending') return { step: 'checkout_abandoned', trace: t };
  if (t.enrollment_type === 'explorer' && t.latest_subscription_status === null) return { step: 'explorer_only', trace: t };
  return { step: 'not_started', trace: t };
}

const emailKey = (e) => String(e || '').trim().toLowerCase();

/**
 * One person's follow-through state from all their rows. `owners` maps a step to a named owner
 * (or is empty); an unmapped or blank owner is "unowned".
 */
export function personState(email, rows, owners = {}) {
  const key = emailKey(email);
  if (!key || !key.includes('@')) throw new RangeError('Name the person by email.');
  if (!Array.isArray(rows)) throw new RangeError('rows must be the person\'s enrolment rows.');
  if (owners === null || typeof owners !== 'object' || Array.isArray(owners)) throw new RangeError('owners must be a map of step to owner.');
  const mine = rows.filter((r) => emailKey(r && r.email) === key);
  if (!mine.length) return { person: key, rows: 0, step: 'no_enrolment', label: 'No enrolment row for this email', owner: null, owner_status: 'not_applicable', next_action: null, traces: [] };
  const read = mine.map(stepOfRow);
  const known = read.filter((x) => STEPS[x.step]);
  const pick = known.sort((a, b) => STEPS[a.step].order - STEPS[b.step].order)[0];
  const unknown = read.filter((x) => x.step === 'unknown');
  if (!pick) {
    return { person: key, rows: mine.length, step: unknown.length ? 'unknown' : 'not_followed', label: unknown.length ? 'Cannot tell from the rows' : 'No enrolment in progress', owner: null, owner_status: 'not_applicable', next_action: unknown.length ? 'A person should check the rows: a field Vick needs is missing.' : null, traces: read };
  }
  const s = STEPS[pick.step];
  const ownerRaw = owners[pick.step];
  const owner = typeof ownerRaw === 'string' && ownerRaw.trim() ? ownerRaw.trim() : null;
  const needsOwner = s.next !== null;
  return {
    person: key,
    rows: mine.length,
    step: pick.step,
    label: s.label,
    rule: s.cite,
    next_action: s.next,
    owner: needsOwner ? owner : null,
    owner_status: !needsOwner ? 'not_applicable' : owner ? 'owned' : 'unowned',
    owner_note: needsOwner && !owner ? 'No owner has been named for this step. Roselen to name one; Vick does not assign it.' : null,
    also: read.filter((x) => x !== pick).map((x) => ({ step: x.step, enrollment_id: x.trace.enrollment_id })),
    unknown_rows: unknown.length,
    traces: read,
  };
}

/** Everyone not yet complete, one entry per person, most urgent step first. */
export function stuckList(rows, owners = {}) {
  if (!Array.isArray(rows)) throw new RangeError('rows must be an array of enrolment rows.');
  const people = [...new Set(rows.map((r) => emailKey(r && r.email)).filter((e) => e.includes('@')))];
  return people.map((e) => personState(e, rows, owners))
    .filter((p) => STEPS[p.step] && STEPS[p.step].next !== null || p.step === 'unknown')
    .sort((a, b) => (STEPS[a.step]?.order ?? 99) - (STEPS[b.step]?.order ?? 99) || a.person.localeCompare(b.person));
}
