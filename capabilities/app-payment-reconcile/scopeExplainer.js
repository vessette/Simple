// Why a named payment is or is not in scope for the app payment reconciler, autonomy:R2.
// Capability: sales.app_originated_payment_reconciliation. THIS IS A HUMAN DECISION, at
// every level: reconciling marks a person paid and activates their membership. Vick
// explains the reconciler's verdict on one payment, naming the guard that decided it. It
// never links, never runs the reconciler, and never says a payment "should" be linked.
//
// Every verdict cites the three checks the acceptance names: the amount match, the time
// window and the customer-id scope. Inputs are rows a person read and passed in: the
// PaySimple payment (and, for path B, the payer's email on that PaySimple customer), the
// reconciler's candidates, the customer-id claims, and the payment ids already linked.
//
// Mirrors ColaberryEnterprise_AI_LeadershipAccelerator @ 109820a:
//   collected statuses                      paymentSyncService.ts:31-33, :59-64
//   $100 membership floor                   appPaymentReconcileService.ts:63, :98, :331
//   window: 10 min before to 6 h after      :65-72, :127-140
//   path A: our customer ids, origin guard  :88-104, :359-367
//   path B: origin guard, then payer email  :148-158, :376-389
//   shared customer ids fail closed (A)     :160-180, :298-311
//   never reuse a linked payment id         :313-320, :332, :361
//   payments read from the reconcile start  :322-324, env.ts:47
//   candidates                              :212-261

import { classifyStatus, PAID_RULE } from '../payment-confirmation/paidRule.js';

const SVC = 'appPaymentReconcileService.ts';
export const RULES = Object.freeze({
  collected: Object.freeze(['settled', 'authorized', 'captured', 'posted', 'paid', 'success', 'completed']),
  minCents: 10000,
  skewMs: 10 * 60 * 1000,
  windowMs: 6 * 3600 * 1000,
  defaultStart: '2026-06-01',
});

// Wording that hedges toward a link. A verdict is in scope or out of scope; never "probably".
const HEDGE = /\bshould\s+(?:probably|likely|maybe)?\s*(?:be\s+)?link|\bprobably\b|\blikely\s+(?:belongs|should|needs)|\blooks\s+like\s+it\s+should\b|\bi'?d\s+link\b|\brecommend(?:s|ed)?\s+link/i;

/** Throws if any line hedges toward linking. Every output passes through it. */
export function assertNoHedge(lines) {
  for (const l of lines) if (typeof l === 'string' && HEDGE.test(l)) throw new Error(`Refused: "${l}" hedges toward a link.`);
  return lines;
}

const usd = (cents) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;
const central = (ms) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(ms);
const check = (result, detail, rule) => ({ result, detail, rule });
const lower = (s) => String(s ?? '').trim().toLowerCase();

/** The paid time, or null when PaymentDate is missing or carries no time of day. */
export function paidTime(raw) {
  if (typeof raw !== 'string' || !/T\d{2}:\d{2}/.test(raw)) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

const amountHits = (cents, checkouts) => checkouts.filter((c) => c.amountCents === cents || (c.chargeCents ?? c.amountCents) === cents);
const inWindow = (ms, c) => ms >= c.startedMs - RULES.skewMs && ms <= c.startedMs + RULES.windowMs;
const asked = (c) => (c.chargeCents ?? c.amountCents) === c.amountCents ? usd(c.amountCents) : `${usd(c.amountCents)} or ${usd(c.chargeCents)} after credit`;

function normalise(candidates) {
  return candidates.map((c) => ({
    ...c,
    email: lower(c.email),
    cids: (c.cids || []).map(String),
    checkouts: (c.checkouts || []).map((k) => ({ ...k, startedMs: Date.parse(k.started_at), amountCents: Number(k.amount_cents), chargeCents: Number(k.charge_cents ?? k.amount_cents) })),
  }));
}

function sharedIds(claims) {
  if (!Array.isArray(claims)) return null;
  const by = new Map();
  for (const { enrollment_id, cid } of claims) {
    if (!cid || !enrollment_id) continue;
    if (!by.has(String(cid))) by.set(String(cid), new Set());
    by.get(String(cid)).add(enrollment_id);
  }
  return new Map([...by].filter(([, s]) => s.size > 1).map(([cid, s]) => [cid, [...s].sort()]));
}

function scopeCheck(cid, owners, shared) {
  const rule = `${SVC}:88-104, :298-311`;
  if (shared && shared.has(cid)) return check('fail', `Customer ${cid} is claimed by ${shared.get(cid).length} enrolments, so path A refuses it (fail closed).`, rule);
  if (owners.length === 0) return check('fail', `Customer ${cid} is not one of our checkout customers, so path A does not apply. Only path B, by checkout window and payer email, can reach it.`, rule);
  if (!shared) return check('unknown', `Customer ${cid} is on ${owners[0].name}'s checkout, but no customer-id claims were given, so whether another enrolment also claims it is not known.`, rule);
  return check('pass', `Customer ${cid} is ours, on ${owners[0].name}'s checkout, and no other enrolment claims it.`, rule);
}

function originChecks(cents, ms, checkouts) {
  const hits = amountHits(cents, checkouts);
  const amount = hits.length
    ? check('pass', `${usd(cents)} is an amount we asked for (${hits.map(asked).join('; ')}).`, `${SVC}:135-136`)
    : check('fail', checkouts.length ? `No pending checkout asked for ${usd(cents)}. Asked for: ${checkouts.map(asked).join('; ')}.` : 'There is no pending checkout to compare against.', `${SVC}:135-136`);
  if (ms === null) return { amount, time: check('unknown', 'The payment date carries no time of day, so whether it follows the checkout cannot be checked.', `${SVC}:137-138`), match: null };
  const pool = hits.length ? hits : checkouts;
  const ok = pool.filter((c) => inWindow(ms, c));
  const time = ok.length
    ? check('pass', `Paid ${central(ms)}, within 10 minutes before to 6 hours after the checkout opened ${central(ok[0].startedMs)}.`, `${SVC}:137-138`)
    : check('fail', pool.length ? `Paid ${central(ms)}, outside 10 minutes before to 6 hours after every ${hits.length ? 'matching ' : ''}checkout (${pool.map((c) => `opened ${central(c.startedMs)}`).join('; ')}).` : `Paid ${central(ms)}; there is no checkout to compare against.`, `${SVC}:137-138`);
  return { amount, time, match: hits.some((c) => inWindow(ms, c)) };
}

/**
 * The reconciler's verdict on one payment: in_scope, out_of_scope or unknown, the guard
 * that decided it, and the three cited checks. Read-only; the same input gives the same answer.
 */
export function explainPayment({ payment, candidates, claims = null, linkedPaymentIds = null, payerEmail = null, reconcileStart = RULES.defaultStart }) {
  if (!payment || payment.Id === undefined || payment.Id === null) throw new RangeError('A payment with an Id is required.');
  if (!Array.isArray(candidates)) throw new RangeError('The reconciler candidates are required, as a list.');
  const pid = String(payment.Id), cid = String(payment.CustomerId ?? '');
  const cents = Math.round(Number(payment.Amount) * 100);
  if (!Number.isFinite(cents)) throw new RangeError(`Payment ${pid} has no readable amount.`);
  const ms = paidTime(payment.PaymentDate);
  const cands = normalise(candidates);
  const shared = sharedIds(claims);
  const owners = cands.filter((c) => c.cids.includes(cid));
  const scope = scopeCheck(cid, owners, shared);
  const pathA = scope.result !== 'fail' ? owners[0] : null;
  const pathAOrigin = pathA ? originChecks(cents, ms, pathA.checkouts) : null;
  const allCheckouts = cands.flatMap((c) => c.checkouts);
  const out = { payment_id: pid, verdict: null, path: null, decided_by: null, enrolment: null, checks: null, notes: [] };
  const finish = (verdict, decided_by, text, extra = {}) => {
    const o = pathAOrigin && (pathAOrigin.match || !extra.pathB) ? pathAOrigin : (extra.origin || originChecks(cents, ms, allCheckouts));
    Object.assign(out, { verdict, decided_by, text, ...extra.set, checks: { amount_match: o.amount, time_window: o.time, customer_id_scope: scope } });
    assertNoHedge([out.text, ...out.notes, ...Object.values(out.checks).map((c) => c.detail)]);
    return out;
  };

  const status = lower(payment.Status);
  if (!RULES.collected.includes(status)) return finish('out_of_scope', 'status', `Out of scope: status "${payment.Status}" is not one the reconciler counts as collected (paymentSyncService.ts:31-33).`);
  if (cents < RULES.minCents) return finish('out_of_scope', 'membership minimum', `Out of scope: ${usd(cents)} is under the $100 membership floor; a $50 deposit is never linked here (${SVC}:98).`);
  if (ms !== null && ms < Date.parse(reconcileStart)) return finish('out_of_scope', 'reconcile start', `Out of scope: paid before ${reconcileStart}, the earliest date the reconciler reads (${SVC}:323, env.ts:47).`);
  if (!Array.isArray(linkedPaymentIds)) out.notes.push('No list of already-linked payment ids was given, so whether this payment is already linked elsewhere is not known.');
  else if (linkedPaymentIds.map(String).includes(pid)) return finish('out_of_scope', 'already linked', `Out of scope: payment ${pid} is already linked to an enrolment or subscription, and the reconciler never reuses one (${SVC}:313-320).`);
  if (status !== 'settled' && status !== 'posted') {
    out.notes.push(`The reconciler counts "${payment.Status}" as collected, but under the rule agreed on ${PAID_RULE.decided} only Settled or Posted counts as paid: ${classifyStatus(status) === "waiting" ? "this payment has not settled yet" : "the agreed rule does not cover this status"}.`);
  }
  if (cands.length === 0) return finish('out_of_scope', 'origin guard', `Out of scope: there are no app-originated pending checkouts at all (${SVC}:212-261).`);

  if (pathA && pathAOrigin.match) {
    const verdict = scope.result === 'pass' && Array.isArray(linkedPaymentIds) ? 'in_scope' : 'unknown';
    if (verdict === 'in_scope') out.notes.push(`In scope is not a promise of a link: if an earlier qualifying payment exists for the same checkout, the reconciler takes that one first (${SVC}:362).`);
    return finish(verdict, 'origin guard (path A)', verdict === 'in_scope'
      ? `In scope by path A: on ${pathA.name}'s customer id, for an amount we asked for, inside the checkout window.`
      : `Unknown: the amount and time match ${pathA.name}'s checkout by path A, but ${scope.result === 'unknown' ? 'the customer-id claims' : 'the already-linked payment ids'} were not given.`, { set: { path: 'customer_id', enrolment: pathA.name } });
  }
  if (ms === null) return finish('unknown', 'time window', 'Unknown: the payment date carries no time of day, so neither path\'s window can be checked.');

  // Path B: any candidate whose own checkout matches on amount and time, then payer email.
  const fits = cands.filter((c) => c.checkouts.some((k) => amountHits(cents, [k]).length && inWindow(ms, k)));
  const bOrigin = originChecks(cents, ms, fits.length ? fits.flatMap((c) => c.checkouts) : allCheckouts);
  if (!fits.length) return finish('out_of_scope', 'origin guard', `Out of scope: no app-originated checkout asked for ${usd(cents)} shortly before this payment, so it cannot be ours. This is what keeps bootcamp and manual charges out (${SVC}:30-37).`, { pathB: true, origin: bOrigin });
  if (shared && shared.has(cid)) out.notes.push(`Path A refused customer ${cid} as shared, but path B does not check the payment's customer id, so this payment can still be linked by email (${SVC}:329-340).`);
  if (!payerEmail) return finish('unknown', 'payer identity (path B)', `Unknown: the amount and time match a checkout for ${fits.map((c) => c.name).join(', ')}, and path B also needs the payer's email on PaySimple customer ${cid}. A person has to look it up.`, { pathB: true, origin: bOrigin });
  const who = fits.find((c) => c.email === lower(payerEmail));
  if (!who) return finish('out_of_scope', 'payer identity (path B)', `Out of scope: the amount and time match a checkout, but the payer's email is not that enrolment's, and path B requires the same person (${SVC}:154-156).`, { pathB: true, origin: bOrigin });
  if (!Array.isArray(linkedPaymentIds)) return finish('unknown', 'already linked', `Unknown: path B matches ${who.name}, but the already-linked payment ids were not given.`, { pathB: true, origin: bOrigin, set: { path: 'checkout_window', enrolment: who.name } });
  out.notes.push(`A path B link means the payment webhook missed this payment. The reconciler counts these separately, and any at all is worth an alert (${SVC}:189).`);
  return finish('in_scope', 'origin guard and payer identity (path B)', `In scope by path B: for an amount ${who.name}'s checkout asked for, inside its window, paid by the same email.`, { pathB: true, origin: bOrigin, set: { path: 'checkout_window', enrolment: who.name } });
}
