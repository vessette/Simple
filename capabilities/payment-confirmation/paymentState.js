// Payment and seat state for a named person, autonomy:R2.
// Capability: sales.payment_confirmation_and_seat_grant. THIS IS A HUMAN DECISION:
// confirming a payment grants a paid seat, so the agent explains and never writes.
//
// R2 is "answer questions using approved knowledge and records": for a named person,
// say what their payment and seat state is and which webhook path produced it. Every
// claim names the record it came from: the enrolment row, a subscription row, or a
// webhook health sample. Where no record exists the claim is unknown. Nothing here
// marks anyone paid, grants access, changes a seat or replays a webhook.
//
// Paths follow the platform's handlePaySimpleWebhook() (ColaberryEnterprise_AI_
// LeadershipAccelerator @ 109820a, backend/src/controllers/webhookController.ts:61-185).

import { PAID_RULE, classifyStatus } from './paidRule.js';

const ENROLMENT = 'enrolment row';
const SUBSCRIPTION = 'subscription row';
const HEALTH = 'webhook health samples';
const GATEWAY = 'gateway read';
const PAYMENT_STATES = ['paid', 'pending', 'pending_invoice', 'failed'];

/** The webhook path that handles a given external id. */
export const PATHS = Object.freeze({
  enrolment: { prefix: 'CB-', handler: 'markEnrollmentPaid()', rule: 'webhookController.ts:118-121, enrollmentService.ts:107-177' },
  subscription: { prefix: 'SUB-', handler: 'activateByRef()', rule: 'webhookController.ts:110-116, subscriptionService.ts:427' },
  scheduled: { prefix: null, handler: 'handleScheduledChargeEvent()', rule: 'webhookController.ts:87-99' },
});

const claim = (name, value, source, field) => ({ claim: name, value, status: 'known', source, field });
const unknown = (name, reason) => ({ claim: name, value: null, status: 'unknown', source: null, reason });
const has = (v) => v !== null && v !== undefined && v !== '';

function pathFor(externalId) {
  if (typeof externalId !== 'string' || !externalId) return null;
  if (externalId.startsWith('SUB-')) return 'subscription';
  if (externalId.startsWith('CB-')) return 'enrolment';
  return null;
}

function enrolmentClaims(e) {
  if (!e) return [unknown('payment', 'No enrolment row was found for this person, so their payment state is unknown.')];
  const out = [];
  out.push(PAYMENT_STATES.includes(e.payment_status)
    ? claim('payment', e.payment_status, ENROLMENT, 'payment_status')
    : unknown('payment', `The enrolment's payment_status "${e.payment_status}" is not one the platform uses.`));
  out.push(typeof e.portal_enabled === 'boolean'
    ? claim('portal_access', e.portal_enabled ? 'on' : 'off', ENROLMENT, 'portal_enabled')
    : unknown('portal_access', 'The enrolment row does not say whether portal access is on.'));
  out.push(has(e.cohort_id) ? claim('class', e.cohort_id, ENROLMENT, 'cohort_id') : unknown('class', 'The enrolment row has no class.'));
  out.push(has(e.paysimple_payment_id) ? claim('payment_id', String(e.paysimple_payment_id), ENROLMENT, 'paysimple_payment_id')
    : unknown('payment_id', 'No payment id is recorded on the enrolment.'));
  out.push(typeof e.amount_paid === 'number' ? claim('amount_paid', e.amount_paid, ENROLMENT, 'amount_paid')
    : unknown('amount_paid', 'No amount paid is recorded on the enrolment.'));
  out.push(e.payment_status === 'paid' && has(e.cohort_id)
    ? claim('seat', `counted once in ${e.cohort_id}, when the payment was marked paid`, ENROLMENT, 'payment_status, cohort_id')
    : e.payment_status && e.payment_status !== 'paid'
      ? claim('seat', 'not counted: a seat is only counted when payment is marked paid', ENROLMENT, 'payment_status')
      : unknown('seat', 'Whether a seat was counted cannot be told from this record.'));
  return out;
}

function pathClaim(e, subs) {
  const p = pathFor(e?.paysimple_external_id);
  const sub = (subs ?? []).find((s) => s.status === 'active' || s.status === 'past_due');
  if (sub?.paysimple_schedule_id) {
    return claim('webhook_path', `${PATHS.subscription.handler} for the first payment, then ${PATHS.scheduled.handler} for each renewal (schedule ${sub.paysimple_schedule_id})`, SUBSCRIPTION, 'payment_ref, paysimple_schedule_id');
  }
  if (sub && pathFor(sub.payment_ref) === 'subscription') return claim('webhook_path', PATHS.subscription.handler, SUBSCRIPTION, 'payment_ref');
  if (p) return claim('webhook_path', PATHS[p].handler, ENROLMENT, 'paysimple_external_id');
  return unknown('webhook_path', 'Neither the enrolment nor a subscription carries a payment reference, so the path that handled this payment is unknown.');
}

function subscriptionClaims(subs) {
  if (!Array.isArray(subs)) return [unknown('membership', 'Subscription rows could not be read.')];
  if (subs.length === 0) return [claim('membership', 'none on record', SUBSCRIPTION, '(no rows)')];
  return subs.map((s) => claim('membership', `${s.plan} ${s.status}${s.current_period_end ? `, paid through ${s.current_period_end}` : ''}`, SUBSCRIPTION, 'plan, status, current_period_end'));
}

/** The webhook delivery picture, from the health samples. In memory only: a restart empties it. */
export function healthClaims(samples, now) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return [unknown('webhook_deliveries', "No delivery samples are held. The samples live in the server's memory for an hour and are lost on restart.")];
  }
  const recent = samples.filter((s) => now - s.at <= 60 * 60 * 1000);
  const accepted = recent.filter((s) => s.outcome === 'accepted');
  const rejected = recent.filter((s) => s.outcome === 'rejected_signature');
  const last = accepted.length ? Math.max(...accepted.map((s) => s.at)) : null;
  return [
    claim('webhook_deliveries', `${accepted.length} accepted and ${rejected.length} rejected for a bad signature in the last hour`, HEALTH, 'outcome, at'),
    last === null ? unknown('last_accepted_delivery', 'No accepted delivery in the last hour.')
      : claim('last_accepted_delivery', `${Math.round((now - last) / 60000)} minutes ago`, HEALTH, 'at'),
  ];
}

const GROUP_WORDS = {
  settled: (s) => `yes: the payment provider reads it as ${s}`,
  waiting: (s) => `no: the payment provider reads it as ${s}, which has not settled`,
  reversed: (s) => `no: the payment provider reads it as ${s}, a reversal`,
  failed: (s) => `no: the payment provider reads it as ${s}`,
};

/**
 * Whether the payment counts as paid under the decided rule. The enrolment row does not
 * store the provider's status (webhookController.ts:67 reads it and drops it), so this is
 * known only from a gateway read of the same payment id.
 */
function ruleClaim(e, read) {
  const name = 'counts_as_paid';
  const id = has(e?.paysimple_payment_id) ? String(e.paysimple_payment_id) : null;
  if (!id) return unknown(name, 'No payment id is recorded on the enrolment, so there is no payment to look up.');
  if (!read) return unknown(name, `The enrolment record does not store the payment's own status. Whether payment ${id} counts as paid needs a read from the payment provider. ${PAID_RULE.text}`);
  if (String(read.payment_id) !== id) return unknown(name, `The gateway read is for payment ${read.payment_id}, not ${id}, so it cannot answer for this enrolment.`);
  const g = classifyStatus(read.status);
  if (g === 'unknown') return unknown(name, `The payment provider reads payment ${id} as "${read.status}", which is not a status the rule covers.`);
  return claim(name, GROUP_WORDS[g](read.status), GATEWAY, 'status');
}

/** Where the record and the decided rule disagree, for a person to act on. Vick changes nothing. */
function ruleFlags(e, read) {
  if (e?.payment_status !== 'paid' || !read || String(read.payment_id) !== String(e.paysimple_payment_id)) return [];
  const g = classifyStatus(read.status);
  if (g === 'waiting') return [`Marked paid, but the payment provider reads the payment as ${read.status}. Under the rule agreed on ${PAID_RULE.decided} that does not count as paid yet.`];
  if (g === 'reversed' || g === 'failed') return [`Marked paid, but the payment provider reads the payment as ${read.status}. Under the rule agreed on ${PAID_RULE.decided}, access is removed and the seat freed. A person does that; Vick changes nothing.`];
  return [];
}

/** Things in the records that do not fit together, for a person to look at. */
function flags(e, subs) {
  const out = [];
  if (e?.payment_status === 'paid' && e.portal_enabled === false) out.push('Marked paid, but portal access is off.');
  if (e?.payment_status === 'paid' && !has(e.paysimple_payment_id)) out.push('Marked paid with no payment id, so it was not marked by a payment webhook.');
  if (e?.payment_status !== 'paid' && (subs ?? []).some((s) => s.status === 'active')) out.push('A membership is active but the enrolment is not marked paid.');
  return out;
}

/** Payment and seat state for one named person, every claim traced to a record. */
export function explainPerson({ name, enrolment, subscriptions, samples, now, gatewayRead }) {
  if (typeof name !== 'string' || !name.trim()) throw new RangeError('A named person is required.');
  if (!Number.isFinite(now)) throw new RangeError('now (milliseconds) is required.');
  const claims = [...enrolmentClaims(enrolment), ruleClaim(enrolment, gatewayRead), pathClaim(enrolment, subscriptions), ...subscriptionClaims(subscriptions), ...healthClaims(samples, now)];
  const allFlags = [...flags(enrolment, subscriptions), ...ruleFlags(enrolment, gatewayRead)];
  return { person: name.trim(), claims, flags: allFlags, unknown_count: claims.filter((c) => c.status === 'unknown').length };
}

/**
 * The pre-flight list for the settled-only rule, by name, from read-only lookups of each
 * paid enrolment's payment. Sorts every paid enrolment into one group, so none is lost:
 *   reversed: would lose access (returned, voided, refunded, charged back, failed)
 *   waiting:  would lose access under the new rule (only Authorized or Pending)
 *   keeps:    Settled or Posted
 *   unknown:  no payment id, no lookup, a failed lookup, or a status the rule doesn't cover
 * The sync's dry run cannot stand in for this: it returns counts, not names, and counts
 * Authorized as paid (paymentSyncService.ts:31-33, :45-53).
 */
export function preflightList({ enrolments, reads }) {
  if (!Array.isArray(enrolments)) throw new RangeError('enrolments must be a list.');
  const byId = new Map((Array.isArray(reads) ? reads : []).map((r) => [String(r.payment_id), r]));
  const out = { reversed: [], waiting: [], keeps: [], unknown: [] };
  for (const { name, enrolment } of enrolments) {
    if (enrolment?.payment_status !== 'paid') continue;
    const id = has(enrolment.paysimple_payment_id) ? String(enrolment.paysimple_payment_id) : null;
    const read = id ? byId.get(id) : undefined;
    const row = { name, payment_id: id, status: read?.status ?? null };
    if (!id) { out.unknown.push({ ...row, reason: 'no payment id recorded' }); continue; }
    if (!read || read.error) { out.unknown.push({ ...row, reason: read?.error ? `lookup failed: ${read.error}` : 'not looked up' }); continue; }
    const g = classifyStatus(read.status);
    if (g === 'settled') out.keeps.push(row);
    else if (g === 'waiting') out.waiting.push(row);
    else if (g === 'reversed' || g === 'failed') out.reversed.push(row);
    else out.unknown.push({ ...row, reason: `status "${read.status}" is not covered by the rule` });
  }
  return { rule: PAID_RULE.text, ...out };
}
