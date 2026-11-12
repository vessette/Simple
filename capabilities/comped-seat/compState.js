// Who holds a comped seat, autonomy:R2.
// Capability: sales.comped_seat_grant_and_revocation. THIS IS A HUMAN DECISION, at every
// level: a comp sets a named person's price to zero, which is a discount, and discounting
// is forbidden to an agent. The agent reports who holds a comp, since when, and how the
// revenue figures treat it. It never grants, revokes or proposes a grant.
//
// Every comp it lists comes from a subscriptions row (plan 'comp') a person read and
// passed in. The agent cannot reach the production database.
//
// Rules mirror the platform (ColaberryEnterprise_AI_LeadershipAccelerator @ 109820a):
//   comp plan, $0, 3,650-day period        subscriptionService.ts:70-84
//   never reaches a hosted checkout        subscriptionService.ts:339-341
//   grantFreeAccess (enrolment id only)    subscriptionService.ts:645-669
//   grant marks the enrolment paid, $0     subscriptionService.ts:596-602, :667
//   revokeFreeAccess (access kept)         subscriptionService.ts:671-691
//   paying members = payment_status paid   subscriptionAnalyticsService.ts:207-220
//   the one row the revenue page reads     subscriptionAnalyticsService.ts:188-197
//   staff first, then the comp plan        subscriptionAnalyticsService.ts:297-305
//   MRR counts annual/monthly only         subscriptionAnalyticsService.ts:405-410

const ROW = 'subscription row';
const ENROLMENT = 'enrolment row';
export const DECIDERS = 'Roselyn (sales owner) and Ali (approver)';

/** What the revenue figures do with a comp, stated in full. Every report carries it. */
export const REVENUE_STATEMENT = Object.freeze({
  text: 'Comped seats are excluded from revenue: a comp is $0, and the revenue page counts it under Free Access (or Staff, for a team member), never in MRR, ARR or active subscribers.',
  source: 'subscriptionAnalyticsService.ts:297-305, :405-410',
  caveat: 'That holds for the subscription row the revenue page picks for each person. Granting a comp marks the enrolment paid (subscriptionService.ts:596-602), so a comp passes the paying-member filter itself (subscriptionAnalyticsService.ts:216); it is kept out of revenue only by the row picked. The flags below name each person for whom that pick goes another way.',
});

const UNRECORDED = 'The platform records no reason and no granting admin for a comp: grantFreeAccess takes only an enrolment id (subscriptionService.ts:645), and the subscriptions table has no column for either (Subscription.ts:46-61).';

// Wording that would present a grant or revoke as a routine step. No output may contain
// one. Mentioning that a grant is a person's decision is fine; recommending one is not.
const ROUTINE_GRANT = /\b(?:next step|to do|todo|action)\b[^.]*\b(?:grant|comp|revoke)\b|\b(?:should|can|could|will|let's|we'll|i'll)\s+(?:be\s+)?(?:grant(?:ed)?|comp(?:ed)?|revoke(?:d)?)\b|\brecommend(?:ed|s)?\s+(?:granting|a comp|comping|revoking)\b|\b(?:grant|give)\s+(?:them|her|him|this person)\b|\bcomp them\b/i;

const claim = (name, value, source, field, row_id) => ({ claim: name, value, status: 'known', source, field, ...(row_id ? { row_id } : {}) });
const unknown = (name, reason) => ({ claim: name, value: null, status: 'unknown', source: null, reason });
const has = (v) => v !== null && v !== undefined && v !== '';
const central = (iso) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric', timeZoneName: 'short' }).format(t);
};

/** Throws if any line presents a grant or revoke as routine. Every output passes through it. */
export function assertNoRoutineGrant(lines) {
  for (const l of lines) if (has(l) && ROUTINE_GRANT.test(l)) throw new Error(`Refused: "${l}" presents a comp grant or revoke as a routine step.`);
  return lines;
}

/** The row the revenue page reads for one enrolment: active, else one with a period end,
 *  else not failed, newest first (subscriptionAnalyticsService.ts:188-197). */
export function revenueRow(rows) {
  const real = [...rows].filter((r) => has(r.id)).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  return real.find((r) => r.status === 'active') || real.find((r) => has(r.current_period_end)) || real.find((r) => r.status !== 'failed') || null;
}

function holderClaims(sub, e) {
  const out = [claim('comp', `${sub.status === 'active' ? 'active' : 'revoked'} comp, row ${sub.id}`, ROW, 'plan, status', sub.id)];
  out.push(e && has(e.name) ? claim('holder', e.name, ENROLMENT, 'full_name') : unknown('holder', `No enrolment row was given for ${sub.enrollment_id}, so the holder's name is not known.`));
  const since = central(sub.started_at);
  out.push(since ? claim('since', since, ROW, 'started_at', sub.id) : unknown('since', `Row ${sub.id} records no start date.`));
  if (sub.status === 'canceled') {
    const at = central(sub.canceled_at);
    out.push(at ? claim('revoked_on', at, ROW, 'canceled_at', sub.id) : unknown('revoked_on', `Row ${sub.id} is cancelled but records no time.`));
  }
  out.push(unknown('why', UNRECORDED));
  return out;
}

function revenueClaim(sub, e, picked) {
  if (!e) return unknown('revenue', `No enrolment row was given for ${sub.enrollment_id}, so how the revenue page counts this person is not known.`);
  if (e.payment_status !== 'paid' || e.status !== 'active') {
    return claim('revenue', 'not on the revenue page at all: the enrolment is not paid and active', ENROLMENT, 'payment_status, status');
  }
  if (e.is_staff) return claim('revenue', 'excluded: counted as Staff, $0', ENROLMENT, 'is_staff');
  if (picked && picked.id === sub.id) return claim('revenue', 'excluded: counted as Free Access, $0', ROW, 'plan', sub.id);
  if (picked && (picked.plan === 'annual' || picked.plan === 'monthly')) {
    return claim('revenue', `counted as paying (${picked.plan}, row ${picked.id}), not as a comp: the revenue page picked the paid row`, ROW, 'plan', picked.id);
  }
  return unknown('revenue', `The revenue page picks row ${picked ? picked.id : '(none)'} for this enrolment, not the comp, so how it is counted depends on rows not given here.`);
}

function flags(sub, e, rows, picked) {
  const out = [];
  if (Number(sub.amount_cents) !== 0) out.push(`Comp row ${sub.id} carries ${sub.amount_cents} cents. A comp is $0 (subscriptionService.ts:84); this row needs a person to look at it.`);
  const paidActive = rows.filter((r) => r.status === 'active' && (r.plan === 'annual' || r.plan === 'monthly'));
  if (sub.status === 'active' && paidActive.length) {
    const p = paidActive[0];
    const wins = picked && picked.id === sub.id;
    out.push(`A comp and a paid ${p.plan} subscription (row ${p.id}) are both active. The revenue page reads the newer one, so ${wins ? 'this paid plan is left out of MRR' : 'the comp is not counted as Free Access'}. Granting the comp also set amount_paid to 0 on the enrolment (subscriptionService.ts:602). No rule for this case has been named yet: ${DECIDERS} to decide.`);
  }
  if (sub.status === 'active' && e && e.payment_status !== 'paid') out.push(`Comp row ${sub.id} is active but the enrolment is not marked paid. A grant marks it paid (subscriptionService.ts:598), so something changed it since.`);
  if (sub.status === 'canceled' && e && e.payment_status === 'paid' && e.status === 'active') {
    out.push(`Revoked, but the enrolment is still paid and active, so this person keeps access. That is by design (subscriptionService.ts:678-681); removing access is a separate admin step.`);
    if (picked && picked.id === sub.id) out.push(`Revoked, yet the revenue page still counts this person as a Free Access seat: the cancelled comp row keeps its period end, so it is still the row picked (subscriptionAnalyticsService.ts:188-197).`);
  }
  return out;
}

function report(sub, enrolments, byEnrolment) {
  const e = enrolments[sub.enrollment_id] || null;
  const rows = byEnrolment.get(sub.enrollment_id) || [];
  const picked = revenueRow(rows);
  const claims = [...holderClaims(sub, e), revenueClaim(sub, e, picked)];
  return { row_id: sub.id, enrollment_id: sub.enrollment_id, claims, flags: flags(sub, e, rows, picked) };
}

/**
 * Every comp in the given subscriptions rows: active ones, and ones revoked by an admin.
 * `subscriptions` is a list of rows as the table holds them; `enrolments` maps an
 * enrolment id to { name, payment_status, status, is_staff }. Read-only.
 */
export function listComps({ subscriptions, enrolments = {} }) {
  if (!Array.isArray(subscriptions)) throw new RangeError('Subscription rows are required, as a list.');
  if (enrolments === null || typeof enrolments !== 'object' || Array.isArray(enrolments)) throw new RangeError('Enrolments must be a map of enrolment id to row.');
  const byEnrolment = new Map();
  for (const r of subscriptions) {
    if (!byEnrolment.has(r.enrollment_id)) byEnrolment.set(r.enrollment_id, []);
    byEnrolment.get(r.enrollment_id).push(r);
  }
  const comps = subscriptions.filter((r) => r.plan === 'comp');
  const untraceable = comps.filter((r) => !has(r.id)).length;
  const sorted = comps.filter((r) => has(r.id)).sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at) || String(a.id).localeCompare(String(b.id)));
  const active = sorted.filter((r) => r.status === 'active').map((r) => report(r, enrolments, byEnrolment));
  const revoked = sorted.filter((r) => r.status === 'canceled' && r.cancel_reason === 'comp_revoked').map((r) => report(r, enrolments, byEnrolment));
  const result = {
    revenue: REVENUE_STATEMENT,
    active,
    revoked,
    untraceable: untraceable ? `${untraceable} comp row(s) carry no row id and are not listed: a comp is reported only when it traces to a subscriptions row.` : null,
    decision: `Granting or revoking a comp is a decision for ${DECIDERS}. The agent reports; it does not grant, revoke or recommend either.`,
  };
  const all = [REVENUE_STATEMENT.text, REVENUE_STATEMENT.caveat, result.decision, ...[...active, ...revoked].flatMap((p) => [...p.claims.map((c) => c.value ?? c.reason), ...p.flags])];
  assertNoRoutineGrant(all);
  return result;
}

/** A request to grant or revoke goes to a person, with the reason it was sent. */
export function escalation(request) {
  if (typeof request !== 'string' || !request.trim()) throw new RangeError('A request is required.');
  return {
    to: DECIDERS,
    request: request.trim(),
    lines: assertNoRoutineGrant([
      'A comp sets this person\'s price to zero, which is a discount. That is a person\'s decision at every level; the agent does not grant, revoke or recommend one.',
      'An admin grants or revokes from /admin/accelerator or /admin/community-members. The platform does not record who granted a comp or why, so the decision and its reason have to be written down somewhere a person will keep.',
      REVENUE_STATEMENT.text,
    ]),
  };
}
