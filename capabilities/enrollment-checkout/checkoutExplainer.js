// Enrolment checkout explainer, autonomy:R2.
// Capability: sales.enrollment_checkout_link_issuance. THIS IS A HUMAN DECISION: issuing
// a payment link is a financial commitment, so the agent explains and never issues.
//
// R2 is "answer questions using approved knowledge and records": explain the checkout
// flow, quote current plan prices from PLANS (the single source of truth), and say what
// an enrolment's payment state means. Nothing here creates a customer, a link or a row.
//
// Every price comes from a committed snapshot of PLANS (fixtures/plans.json, from
// ColaberryEnterprise_AI_LeadershipAccelerator @ 109820a, subscriptionService.ts:78-85).
// A price that cannot be traced to it is refused. The 4500 default in
// createEnrollmentInvoice() (paysimpleService.ts:404) is never used: the platform's own
// price module lists it as not the price (membershipPrice.ts:79-82).

/** Load and check a PLANS snapshot. An inconsistent catalogue is refused, not trusted. */
export function loadCatalog(raw) {
  if (!raw || typeof raw !== 'object' || !raw.plans || typeof raw.source !== 'string') throw new TypeError('A PLANS snapshot with a source is required.');
  for (const [id, p] of Object.entries(raw.plans)) {
    if (![p.per_month, p.price].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)) throw new RangeError(`Plan "${id}" has no usable price.`);
    const expected = p.cadence === 'year' ? p.per_month * raw.annual_term_months : p.per_month;
    if (Math.abs(expected - p.price) > 0.005) throw new RangeError(`Plan "${id}" does not add up: ${p.per_month}/month gives ${expected}, not ${p.price}.`);
  }
  return Object.freeze({ source: raw.source, plans: raw.plans, notThePrice: raw.not_the_price ?? [] });
}

const refuse = (reason) => ({ refused: true, reason });

/** Quote one plan's price, traced to PLANS, or refuse. */
export function quotePlan(planId, catalog) {
  if (!catalog) return refuse('No price catalogue is loaded, so no price can be traced. Nothing is quoted.');
  const p = catalog.plans[planId];
  if (!p) return refuse(`"${planId}" is not a plan in PLANS. Nothing is quoted.`);
  if (!p.self_serve) return refuse(`${p.label} is granted by an admin, not sold at checkout, so it has no checkout price to quote.`);
  const text = p.cadence === 'year'
    ? `$${p.per_month} a month, billed annually as $${p.price.toLocaleString('en-US')} a year`
    : `$${p.per_month} a month`;
  return { refused: false, plan: planId, label: p.label, per_month: p.per_month, charge: p.price, cadence: p.cadence, text, source: catalog.source };
}

/** All prices a prospect can be quoted at checkout. */
export function quoteAll(catalog) {
  if (!catalog) return [quotePlan(null, catalog)];
  return Object.keys(catalog.plans).filter((id) => catalog.plans[id].self_serve).map((id) => quotePlan(id, catalog));
}

/** Check a number someone asks about ("is it $4,500?") against PLANS. */
export function checkAmount(amount, catalog) {
  if (!catalog) return refuse('No price catalogue is loaded, so this amount cannot be checked.');
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return refuse('That is not an amount that can be checked.');
  const wrong = catalog.notThePrice.find((n) => n.value === amount);
  if (wrong) return { refused: false, traced: false, amount, verdict: 'not_the_price', reason: `$${amount.toLocaleString('en-US')} is not the price: ${wrong.why}.`, prices: quoteAll(catalog) };
  for (const [id, p] of Object.entries(catalog.plans)) {
    if (!p.self_serve) continue;
    if (amount === p.per_month) return { refused: false, traced: true, amount, verdict: 'monthly_rate', plan: id, source: catalog.source };
    if (amount === p.price) return { refused: false, traced: true, amount, verdict: 'charge', plan: id, source: catalog.source };
  }
  return refuse(`$${amount} does not match any price in PLANS, so it cannot be confirmed.`);
}

/** What an enrolment's payment_status means (Enrollment.ts:203-204). */
export const PAYMENT_STATES = Object.freeze({
  pending: 'A payment link was issued and nothing has been paid yet. The seat is not held until the enrolment is marked paid.',
  pending_invoice: 'An invoice was requested instead of a card payment. Nothing has been paid yet.',
  // Not "settled": the payment-notice handler marks paid on any status, Authorized
  // included, and no table stores the payment's own status (Ali's Step 0, 2026-11-12).
  paid: 'Marked paid and linked to this enrolment. The seat and portal access follow from that. The record does not store the payment\'s own status, so whether it had settled, rather than only been authorised, is unknown from this record.',
  failed: 'A payment failure was recorded for this enrolment. The record does not say whether any money moved.',
});

export function explainPaymentState(status) {
  return PAYMENT_STATES[status]
    ? { status, meaning: PAYMENT_STATES[status], source: 'Enrollment.ts:203-204' }
    : refuse(`"${status}" is not a payment state the enrolment record uses (paid, pending, pending_invoice, failed).`);
}

/** The checkout flow as the platform runs it (enrollmentController.ts:34-89). */
export const CHECKOUT_STEPS = Object.freeze([
  'The form is checked, and anything malformed is rejected before anything else happens.',
  'Marketing consent is recorded separately: buying a course is not agreeing to marketing email.',
  'The class must be open and not full, or the request stops here.',
  'A payment-provider customer and a hosted payment link are created.',
  'A pending enrolment is recorded with the link reference, so the payment can be matched later.',
  'The person pays on the hosted page. Nothing is charged until they do.',
]);
