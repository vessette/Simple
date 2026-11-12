// Subscription and cancellation state for a named member, autonomy:R2.
// Capability: sales.subscription_cancellation_and_schedule_suspension. THIS IS A HUMAN
// DECISION, at every level: cancelling stops a charge and changes a subscription. The
// agent explains; it never cancels, suspends a schedule, clears an id or edits a row.
//
// R2 is "answer questions using approved knowledge and records": for a named member,
// say what their subscription state is, whether a gateway schedule exists, and what the
// recorded cancellation reason is. Every claim names its source: a subscription row or
// a gateway read that a person ran and passed in (the agent cannot reach PaySimple or
// the production database). Where no schedule id exists, the agent says a cancel would
// skip the gateway step (a no-op) and does not say the member is clear of charges.
//
// Rules mirror the platform (ColaberryEnterprise_AI_LeadershipAccelerator @ 109820a):
// cancelSubscription() subscriptionService.ts:710-737, currentSubscription() :158-166,
// suspendScheduleForSubscription() subscriptionScheduleService.ts:164-191.

/** The terms as the platform records them today. Unapproved: none may be stated. */
export const TERMS = Object.freeze({
  approved: false,
  text: 'Refund/cancellation terms are drafted and pending final approval.',
  source: 'salesHubCoryController.ts:33',
});

const ROW = 'subscription row';
const GATEWAY = 'gateway read';
const STATUSES = new Set(['pending', 'active', 'canceled', 'failed', 'past_due']);
const DECIDER = 'a person with admin access to the member\'s subscription';

// Who wrote cancel_reason. The column is shared: not every value is a member's reason.
const REASON_WRITERS = [
  { test: (r) => r === 'comp_revoked', origin: 'an admin revoking free access', rule: 'subscriptionService.ts:689' },
  { test: (r) => r.startsWith('superseded_by_renewal:'), origin: 'the system, when a renewal replaced this row', rule: 'subscriptionService.ts:497' },
  { test: (r) => r === 'duplicate checkout submission (reconcile)', origin: 'the payment reconcile sweep, retiring a duplicate checkout', rule: 'appPaymentReconcileService.ts:432-434' },
  { test: (r) => r === 'No reason given', origin: 'the cancel path, with no reason supplied', rule: 'subscriptionService.ts:733' },
];

// Lines that would tell someone they are clear of charges. No output may contain one:
// the records here can show a schedule's state, never that nothing else will charge.
const ALL_CLEAR = /\b(?:won't|will not|can't|cannot|will never) be (?:charged|billed)\b|\bsafe from (?:further |any )?charges\b|\bno (?:more|further) (?:charges|payments) will\b|\b(?:billing|charging|charges) (?:has|have) stopped\b/i;

const claim = (name, value, source, field) => ({ claim: name, value, status: 'known', source, field });
const unknown = (name, reason) => ({ claim: name, value: null, status: 'unknown', source: null, reason });
const has = (v) => v !== null && v !== undefined && v !== '';
const central = (iso) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return f.format(t);
};

/** Throws if any line reads as an all-clear on charges. Every output passes through it. */
export function assertNoAllClear(lines) {
  for (const l of lines) if (ALL_CLEAR.test(l)) throw new Error(`Refused: "${l}" says the member is clear of charges.`);
  return lines;
}

/** The row the platform treats as current: newest active, else newest not failed. */
export function currentRow(rows) {
  const sorted = [...rows].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return sorted.find((r) => r.status === 'active') || sorted.find((r) => r.status !== 'failed') || null;
}

function stateClaims(sub) {
  if (!STATUSES.has(sub.status)) return [unknown('subscription', `The row's status "${sub.status}" is not one the platform uses.`)];
  const out = [claim('subscription', `${sub.plan} ${sub.status}`, ROW, 'plan, status')];
  const end = central(sub.current_period_end);
  if (sub.status === 'canceled') {
    out.push(end ? claim('access_until', end, ROW, 'current_period_end')
      : unknown('access_until', 'The cancelled row has no period end, so when access ends is not recorded.'));
  } else if (sub.status === 'active') {
    out.push(end ? claim('period_end', end, ROW, 'current_period_end') : unknown('period_end', 'The row has no period end.'));
  }
  return out;
}

function scheduleClaims(sub) {
  if (has(sub.paysimple_schedule_id)) {
    return [claim('schedule', `schedule ${sub.paysimple_schedule_id} is on the row`, ROW, 'paysimple_schedule_id')];
  }
  const out = [claim('schedule', 'no schedule id on the row', ROW, 'paysimple_schedule_id')];
  if (sub.status === 'active') {
    out.push(claim('suspend_on_cancel',
      'a no-op: with no schedule id, cancelling skips the gateway step and suspends nothing (subscriptionService.ts:724). The member may be on manual or legacy billing; this row cannot show whether anything else charges them.',
      ROW, 'paysimple_schedule_id'));
  }
  return out;
}

function gatewayClaims(sub, read) {
  const sid = has(sub.paysimple_schedule_id) ? String(sub.paysimple_schedule_id) : null;
  if (!sid) return [unknown('gateway_schedule', 'There is no schedule id to look up. A person would have to search PaySimple by customer to find any schedule outside this row.')];
  if (!read) return [unknown('gateway_schedule', `No gateway read was given for schedule ${sid}. The agent cannot reach PaySimple; a person has to look it up.`)];
  if (String(read.schedule_id) !== sid) return [unknown('gateway_schedule', `The gateway read is for schedule ${read.schedule_id}, not ${sid}, so it says nothing about this row.`)];
  if (!has(read.ScheduleStatus)) return [unknown('gateway_schedule', `The gateway read for schedule ${sid} carries no ScheduleStatus.`)];
  const at = central(read.read_at);
  return [claim('gateway_schedule', `${read.ScheduleStatus}${at ? `, read ${at}` : ''}`, GATEWAY, 'ScheduleStatus')];
}

function reasonClaims(sub) {
  const r = sub.cancel_reason;
  if (sub.status === 'past_due') {
    return [has(r)
      ? claim('cancellation', `not cancelled. The reason field holds a failed-payment note, not a cancellation reason: "${r}" (subscriptionScheduleService.ts:265)`, ROW, 'status, cancel_reason')
      : claim('cancellation', 'not cancelled', ROW, 'status')];
  }
  if (sub.status !== 'canceled') return [claim('cancellation', 'not cancelled', ROW, 'status')];
  const out = [];
  const at = central(sub.canceled_at);
  out.push(at ? claim('canceled_at', at, ROW, 'canceled_at') : unknown('canceled_at', 'The row is cancelled but records no cancellation time.'));
  if (!has(r)) { out.push(unknown('cancel_reason', 'The row is cancelled but records no reason.')); return out; }
  const w = REASON_WRITERS.find((x) => x.test(r));
  out.push(claim('cancel_reason', w ? `"${r}", written by ${w.origin} (${w.rule})` : `"${r}", as entered when the member cancelled`, ROW, 'cancel_reason'));
  return out;
}

/** Records that do not fit together, for a person to look at. */
function flags(sub, read) {
  const out = [];
  const sid = has(sub?.paysimple_schedule_id) ? String(sub.paysimple_schedule_id) : null;
  const gw = read && sid && String(read.schedule_id) === sid ? String(read.ScheduleStatus ?? '').toLowerCase() : null;
  if (sub?.status === 'canceled' && sid) out.push(`Cancelled, but the row still names schedule ${sid}. A non-null id is meant to mean a live schedule (Subscription.ts:33-36), so the gateway must be checked.`);
  if (sub?.status === 'canceled' && gw === 'active') out.push(`Cancelled, and the gateway reads schedule ${sid} as Active. The member may still be charged: urgent, for a person.`);
  if (sub?.status === 'active' && gw && gw !== 'active') out.push(`The book shows schedule ${sid} live, but the gateway reads it as ${read.ScheduleStatus}. The id may not have been cleared after a suspend (subscriptionScheduleService.ts:169-174).`);
  if (sub?.status === 'past_due' && sid) out.push(`Past due with schedule ${sid} on the row. The member's cancel button refuses anything not active (subscriptionService.ts:712), so this schedule cannot be taken down from the portal.`);
  return out;
}

/** Subscription, schedule and cancellation state for one named member. */
export function explainMember({ name, subscriptions, gatewayRead = null }) {
  if (typeof name !== 'string' || !name.trim()) throw new RangeError('A named member is required.');
  const terms = unknown('owed_on_cancel', `What a member is owed on cancelling is not known: "${TERMS.text}" (${TERMS.source}).`);
  if (!Array.isArray(subscriptions)) {
    return { member: name.trim(), claims: [unknown('subscription', 'Subscription rows could not be read.'), terms], flags: [], unknown_count: 2 };
  }
  const sub = currentRow(subscriptions);
  const claims = sub
    ? [...stateClaims(sub), ...scheduleClaims(sub), ...gatewayClaims(sub, gatewayRead), ...reasonClaims(sub), terms]
    : [claim('subscription', 'none on record', ROW, '(no rows)'), terms];
  assertNoAllClear(claims.map((c) => c.value ?? c.reason));
  return { member: name.trim(), claims, flags: assertNoAllClear(flags(sub, gatewayRead)), unknown_count: claims.filter((c) => c.status === 'unknown').length };
}

/** A request the agent must not act on goes to a person, with the reason it was sent. */
export function escalation(question) {
  if (typeof question !== 'string' || !question.trim()) throw new RangeError('A question is required.');
  return {
    to: DECIDER,
    question: question.trim(),
    lines: assertNoAllClear([
      'Cancelling is a person\'s decision. The agent does not cancel, suspend a schedule or change a subscription.',
      `The cancellation terms are not approved, so the agent states none: "${TERMS.text}" (${TERMS.source}).`,
    ]),
  };
}
