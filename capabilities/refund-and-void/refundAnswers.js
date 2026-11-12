// Refund ledger and refund policy answers, autonomy:R2.
// Capability: sales.refund_and_void_issuance. THIS IS A HUMAN DECISION, at every level:
// a refund moves money out and cannot be undone. The agent answers from the refund
// ledger and the policy text, and may draft a recommendation for a person to accept or
// reject. It never issues, voids or reverses anything, not even in a sandbox.
//
// Every answer cites a ledger row (or the ledger query that found none) or the policy
// text. The refund policy is drafted and pending approval, so the agent says that and
// states no terms. No output may say that a refund will be issued.
//
// Rules mirror the platform's issueRefund() (ColaberryEnterprise_AI_LeadershipAccelerator
// @ 109820a, backend/src/services/refundService.ts:93-174).

/** The policy as the platform records it today. Unapproved: no terms may be stated. */
export const POLICY = Object.freeze({
  approved: false,
  text: 'Refund/cancellation terms are drafted and pending final approval.',
  source: 'salesHubCoryController.ts:33',
});

// Payment statuses the platform treats as already reversed (refundService.ts:28).
const UNREFUNDABLE = new Set(['Voided', 'Refunded', 'Failed', 'Returned', 'ReturnedNSF', 'Declined', 'Reversed']);
const DECIDER = 'a person with admin access to /admin/refunds';
const PROMISE = /\bwill (?:be )?(?:refunded|issued|voided|reversed|approved)\b|\bwill (?:get|receive) (?:a|an|the|your|their|his|her) (?:refund|money)|\brefund (?:is|has been) approved\b/i;

const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const central = (iso) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'an unrecorded date';
  return `${new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(t)} (Central)`;
};

/** Throws if a line reads as a promise that a refund will happen. Every output passes through it. */
export function assertNoPromise(lines) {
  for (const l of lines) if (PROMISE.test(l)) throw new Error(`Refused: "${l}" asserts a refund outcome.`);
  return lines;
}

function requirePaymentId(paymentId) {
  if (typeof paymentId !== 'string' || !paymentId.trim()) throw new RangeError('A payment id is required.');
  return paymentId.trim();
}

const rowsFor = (paymentId, ledger) => ledger.filter((r) => String(r.paysimple_payment_id) === paymentId);

function rowLine(r) {
  const what = `Refund row ${r.id}: ${r.method} of ${money(r.amount_cents)} recorded ${central(r.created_at)}, issued by ${r.issued_by || 'nobody recorded'}`;
  if (r.status === 'succeeded') {
    const credit = r.voided_credit_cents ? `, and ${money(r.voided_credit_cents)} of account credit voided` : '';
    return `${what}. Succeeded, gateway reference ${r.paysimple_refund_id || 'not recorded'}${credit}.`;
  }
  if (r.status === 'failed') return `${what}. Failed, with an error recorded on the row. Check the payment in PaySimple before saying no money moved: the platform also marks a row failed when the credit void breaks after the gateway call (refundService.ts:155-172).`;
  if (r.status === 'pending') return `${what}. Still pending: the row was written before the gateway call and never updated, so the outcome is unknown. Check the payment in PaySimple first.`;
  return `${what}. Its status "${r.status}" is not one the platform uses.`;
}

/** What the refund ledger says about one payment. A ledger that cannot be read is said so, not guessed. */
export function ledgerAnswer(paymentId, ledger) {
  const id = requirePaymentId(paymentId);
  if (!Array.isArray(ledger)) {
    return { kind: 'ledger', paymentId: id, lines: assertNoPromise([`The refund ledger could not be read, so nothing can be said about refunds on payment ${id}.`]), citations: [] };
  }
  const rows = rowsFor(id, ledger);
  if (!rows.length) {
    return {
      kind: 'ledger', paymentId: id,
      lines: assertNoPromise([`The refund ledger has no row for payment ${id}. No refund was recorded from /admin/refunds; that does not rule out a reversal made directly in PaySimple.`]),
      citations: [{ source: 'refunds ledger', query: `paysimple_payment_id = ${id}`, rows: 0 }],
    };
  }
  const refunded = rows.filter((r) => r.status === 'succeeded').reduce((s, r) => s + (r.amount_cents || 0), 0);
  return {
    kind: 'ledger', paymentId: id,
    lines: assertNoPromise([...rows.map(rowLine), `Refunded so far on payment ${id}: ${money(refunded)}, from succeeded rows only.`]),
    citations: rows.map((r) => ({ source: 'refunds ledger', row: r.id, fields: 'method, amount_cents, status, issued_by, created_at' })),
  };
}

/** The refund policy. Unapproved terms are never stated, only that they are unapproved. */
export function policyAnswer(policy = POLICY) {
  const cite = [{ source: policy.source, text: policy.text }];
  const lines = policy.approved
    ? [`The approved refund policy reads: "${policy.text}"`]
    : [`The refund and cancellation terms are not approved yet. The platform records them as "${policy.text}", so there are no terms to quote. Ask Roselyn or Ali.`];
  return { kind: 'policy', lines: assertNoPromise(lines), citations: cite };
}

/** Anything asking for a refund, or whether one is owed, goes to a person. */
export function escalation(question, policy = POLICY) {
  const p = policyAnswer(policy);
  return {
    kind: 'escalate_to_human', to: DECIDER,
    lines: assertNoPromise([`Whether a refund is given is a person's decision, so this goes to ${DECIDER}.`, ...p.lines]),
    citations: p.citations, question,
  };
}

const ACTION = /\b(?:issue|process|give|send|approve|grant|void|reverse)\b.*\brefund|\brefund (?:me|them|him|her|this|it)\b|\b(?:will|can|do|am|are) (?:i|we|they|he|she) (?:get|be|receive|entitled)|\bmoney back\b|\bowed\b|\beligible\b/i;
const POLICY_Q = /\bpolicy\b|\bterms\b|\bcancel|\bguarantee\b|\bwithin \d+ days\b/i;

/** Routes a question to the ledger, the policy or a person. Unrecognised questions go to a person. */
export function answer(question, { paymentId, ledger, policy = POLICY } = {}) {
  if (typeof question !== 'string' || !question.trim()) throw new RangeError('A question is required.');
  if (ACTION.test(question)) return escalation(question, policy);
  if (POLICY_Q.test(question)) return policyAnswer(policy);
  if (paymentId) return ledgerAnswer(paymentId, ledger);
  return escalation(question, policy);
}

/**
 * The platform's own rule applied to a payment snapshot from the admin lookup preview.
 * Returns the method a person would be offered, or the reason the platform refuses.
 */
export function platformRule(payment, ledgerRows, requestedDollars, now) {
  if (!payment) return { blocker: 'payment_unknown', why: 'The agent cannot read PaySimple; a person must run the lookup at /admin/refunds.', rule: 'executionPolicy.ts:33-42' };
  if (ledgerRows.some((r) => r.status === 'pending')) return { blocker: 'pending_row', why: 'A ledger row is still pending, so an earlier attempt may have moved money.', rule: 'refundService.ts:139-152' };
  if (UNREFUNDABLE.has(payment.Status)) return { blocker: 'already_reversed', why: `The payment status is ${payment.Status}.`, rule: 'refundService.ts:110-112' };
  const full = Math.round(Number(payment.Amount) * 100);
  const prior = ledgerRows.filter((r) => r.status === 'succeeded').reduce((s, r) => s + (r.amount_cents || 0), 0);
  const remaining = full - prior;
  const asked = requestedDollars == null ? remaining : Math.round(Number(requestedDollars) * 100);
  if (!Number.isFinite(asked) || asked <= 0 || asked > remaining) return { blocker: 'invalid_amount', why: `The refundable balance is ${money(Math.max(0, remaining))}.`, rule: 'refundService.ts:119-122' };
  if (asked !== full) return { blocker: 'partial_unsupported', why: 'The gateway reverses the whole payment only; there is no partial route.', rule: 'refundService.ts:123-126, paysimpleService.ts:379-381' };
  const until = Date.parse(payment.CanVoidUntil);
  if (Number.isFinite(until) && until > now) return { method: 'void', cents: full, why: `The payment is inside its void window until ${central(payment.CanVoidUntil)}.`, rule: 'paysimpleService.ts:358-362' };
  if (payment.ActualSettledDate || payment.Status === 'Settled') return { method: 'reverse', cents: full, why: 'The payment has settled, so only a full reversal is possible.', rule: 'paysimpleService.ts:367-369' };
  return { blocker: 'not_settled', why: `The payment is ${payment.Status} and has not settled, and its void window is closed.`, rule: 'refundService.ts:128-134' };
}

/**
 * A recommendation for a person to accept or reject. It carries no decision and no
 * action: decision and decided_by stay null, and nothing here can be executed.
 */
export function draftRecommendation({ paymentId, ledger, payment = null, requestedDollars = null, reason = null, policy = POLICY, now }) {
  const id = requirePaymentId(paymentId);
  if (!Number.isFinite(now)) throw new RangeError('now (ms) is required.');
  const ledgerPart = ledgerAnswer(id, ledger);
  const rows = Array.isArray(ledger) ? rowsFor(id, ledger) : [];
  const rule = Array.isArray(ledger) ? platformRule(payment, rows, requestedDollars, now)
    : { blocker: 'ledger_unreadable', why: 'The refund ledger could not be read.', rule: 'refundService.ts:43-47' };
  const option = rule.method
    ? `For the person to consider: a ${rule.method} of the full ${money(rule.cents)}. ${rule.why}`
    : `The platform would refuse this as ${rule.blocker}: ${rule.why}`;
  const lines = assertNoPromise([
    `Draft recommendation on payment ${id}${reason ? `, asked for because: ${reason}` : ''}.`,
    ...ledgerPart.lines, option, ...policyAnswer(policy).lines,
    'Issuing a refund does not change the enrolment: payment status, portal access and the seat stay as they are (refundService.ts:93-174).',
    'Account credit already spent is not recovered by a refund; only unspent credit is voided (accountCreditService.ts:165-178).',
    `To accept or reject: ${DECIDER}.`,
  ]);
  return Object.freeze({
    kind: 'recommendation', status: 'draft', paymentId: id, decision: null, decided_by: null,
    options: Object.freeze(['accept', 'reject']), rule: Object.freeze({ ...rule }), lines: Object.freeze(lines),
    citations: Object.freeze([...ledgerPart.citations, { source: rule.rule }, { source: policy.source, text: policy.text }]),
  });
}
