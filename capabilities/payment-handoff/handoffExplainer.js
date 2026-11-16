// Payment-handoff integrity explainer, autonomy:R2.
// Capability: sales.payment_handoff_integrity. Read-only: for a named subscription, Vick says
// which PaySimple customer id was stored at checkout, which one the charge landed on, and
// whether the billing account resolves. It changes nothing: correcting a mismatch decides who
// gets billed, so it stays a person's decision.
//
// Every claim names its source: a stored row field, or a gateway read (GET only). Where the
// gateway could not be read, or a record does not carry the payer's email, the id is
// UNVERIFIED, never "matching": a lookup failure is not proof of ownership.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ ffc1f09 (main, 16 Nov 2026).
//   hosted page mints its own customer   subscriptionScheduleService.ts:88-95
//   the first payment carries both ids    subscriptionScheduleService.ts:96-104
//   ownership: email match, fail closed   subscriptionService.ts:290-297
//   one customer id, one enrolment        appPaymentReconcileService.ts:49-53
//   exclusions                            subscriptionScheduleService.ts:39-43, :52-55
//   gateway reads                         paysimpleService.ts:313 (GET /v4/payment/{id}), :348 (GET /v4/customer/{id})

export const SRC = Object.freeze({
  sub: 'subscriptions row',
  enrol: 'enrollments row',
  payment: 'GET /v4/payment/{id}',
  customer: 'GET /v4/customer/{id}',
  others: 'enrollments rows with the same paysimple_customer_id',
  exclusions: 'subscriptionScheduleService.ts:39-43, :52-55',
});

const claim = (what, value, source, extra = {}) => ({ what, value, source, ...extra });
const id = (v) => (v === null || v === undefined || v === '' ? null : String(v));
const email = (v) => String(v || '').trim().toLowerCase();

function validate(input) {
  if (!input || typeof input !== 'object') throw new RangeError('A subscription and its reads are required.');
  const { subscription, enrollment } = input;
  if (!subscription || typeof subscription !== 'object' || !subscription.id) throw new RangeError('The subscription row (with its id) is required.');
  if (!enrollment || typeof enrollment !== 'object' || !email(enrollment.email)) throw new RangeError('The enrolment row, with the payer email, is required.');
  for (const k of ['payment', 'customers']) {
    if (input[k] !== undefined && input[k] !== null && typeof input[k] !== 'object') throw new RangeError(`${k} must be an object, or null when it could not be read.`);
  }
}

/** Does this customer record belong to the payer? Fail closed: unread or emailless is unverified. */
function ownership(customerId, customers, payerEmail) {
  if (!customerId) return { status: 'none', why: 'No id to check.' };
  const rec = customers ? customers[customerId] : undefined;
  if (rec === undefined || rec === null) return { status: 'unverified', why: `${SRC.customer} was not read for ${customerId}; a lookup failure is not proof of ownership (subscriptionService.ts:294).` };
  if (!email(rec.Email)) return { status: 'unverified', why: `The customer record ${customerId} carries no email, so it cannot be matched to the payer.` };
  return email(rec.Email) === payerEmail
    ? { status: 'belongs_to_payer', why: `The customer record's email is the payer's (subscriptionService.ts:290-297).` }
    : { status: 'belongs_to_someone_else', why: `The customer record ${customerId} has a different email from the payer.` };
}

/**
 * The handoff for one subscription. `input`:
 *   subscription  { id, paysimple_customer_id, paysimple_payment_id, paysimple_schedule_id }
 *   enrollment    { id, email, paysimple_customer_id }
 *   payment       the GET /v4/payment/{id} response, or null if it could not be read
 *   customers     { [customerId]: GET /v4/customer/{id} response } for the ids that were read
 *   sharedWith    enrolment ids that store the same customer id (from the enrolments table)
 *   exclusions    payer emails on the standing exclusion lists
 */
export function explainHandoff(input) {
  validate(input);
  const { subscription: s, enrollment: e, payment = null, customers = {}, sharedWith = [], exclusions = [] } = input;
  const payer = email(e.email);
  const stored = id(s.paysimple_customer_id) || id(e.paysimple_customer_id);
  const storedFrom = id(s.paysimple_customer_id) ? `${SRC.sub}.paysimple_customer_id` : `${SRC.enrol}.paysimple_customer_id`;
  const claims = [claim('payer', payer, `${SRC.enrol}.email`)];
  claims.push(claim('customer id stored at checkout', stored, stored ? storedFrom : `${SRC.sub} and ${SRC.enrol}: both empty`));

  const findings = [];
  const excluded = exclusions.map(email).includes(payer);
  if (excluded) findings.push({ kind: 'excluded', why: 'On a standing exclusion list (bank-draft consent awaited, or card blocked). Reported as excluded, not as broken.', source: SRC.exclusions });

  // Where the charge landed: only the first payment can say.
  let landed = null; let account = null; let accountStatus;
  if (!id(s.paysimple_payment_id)) {
    accountStatus = { status: 'unresolved', why: `No first payment id on the ${SRC.sub}, so the billing account cannot be resolved.` };
  } else if (payment === null) {
    accountStatus = { status: 'unverified', why: `${SRC.payment} for ${s.paysimple_payment_id} was not read. The billing account is unknown, not assumed.` };
  } else {
    landed = id(payment.CustomerId);
    account = id(payment.AccountId);
    accountStatus = account && landed
      ? { status: 'resolves', why: `The first payment carries AccountId ${account} and CustomerId ${landed} (subscriptionScheduleService.ts:96-104).` }
      : { status: 'unresolved', why: `${SRC.payment} for ${s.paysimple_payment_id} did not return both an AccountId and a CustomerId.` };
  }
  claims.push(claim('customer id the charge landed on', landed, landed ? `${SRC.payment}.CustomerId (payment ${s.paysimple_payment_id})` : 'not known: see the billing account'));
  claims.push(claim('billing account', account, account ? `${SRC.payment}.AccountId` : 'not known', { status: accountStatus.status, why: accountStatus.why }));

  // Stored vs landed.
  let handoff;
  if (!stored) handoff = { status: 'unverified', why: 'Nothing was stored at checkout to compare.' };
  else if (!landed) handoff = { status: 'unverified', why: 'Where the charge landed is not known, so the stored id cannot be called matching.' };
  else if (stored === landed) handoff = { status: 'same_customer', why: 'The stored id is the one the charge landed on.' };
  else handoff = { status: 'different_customer', why: `Stored ${stored}, charged ${landed}. Expected when the hosted page made its own customer (subscriptionScheduleService.ts:88-95); bill against the charged customer's account, never the stored id.` };
  claims.push(claim('stored vs charged', handoff.status, `${storedFrom} vs ${SRC.payment}.CustomerId`, { why: handoff.why }));

  // Ownership of each id we hold.
  const own = { stored: ownership(stored, customers, payer), landed: ownership(landed, customers, payer) };
  claims.push(claim('stored id belongs to the payer', own.stored.status, stored ? `${SRC.customer} (${stored}).Email vs ${SRC.enrol}.email` : 'no id', { why: own.stored.why }));
  if (landed && landed !== stored) claims.push(claim('charged id belongs to the payer', own.landed.status, `${SRC.customer} (${landed}).Email vs ${SRC.enrol}.email`, { why: own.landed.why }));

  if (own.stored.status === 'belongs_to_someone_else' || own.landed.status === 'belongs_to_someone_else') findings.push({ kind: 'id_belongs_to_someone_else', why: 'A stored or charged customer id points at another person. Billing against it would charge a stranger.', source: SRC.customer });
  const shared = (Array.isArray(sharedWith) ? sharedWith : []).filter((x) => String(x) !== String(e.id));
  if (stored && shared.length) findings.push({ kind: 'shared_customer_id', why: `Customer id ${stored} is also stored on ${shared.length} other enrolment(s). A shared id is how a stranger's charge reaches the wrong person: exclude it, do not reconcile (appPaymentReconcileService.ts:49-53).`, source: SRC.others, other_enrolments: shared.map(String) });
  if (id(s.paysimple_schedule_id) && accountStatus.status !== 'resolves') findings.push({ kind: 'schedule_account_unresolved', why: excluded ? 'A schedule exists but its account does not resolve; the member is on an exclusion list, which may explain it.' : 'A schedule exists but its billing account does not resolve from the first payment.', source: `${SRC.sub}.paysimple_schedule_id; ${SRC.payment}` });
  if (handoff.status === 'unverified' || own.stored.status === 'unverified') findings.push({ kind: 'unverified', why: 'At least one id could not be verified; nothing here is reported as matching.', source: 'see claims' });

  return { subscription: String(s.id), claims, findings, excluded, writes: 'none' };
}
