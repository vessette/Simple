// Membership plan, price, credit and billing-date answers, autonomy:R2.
// Capability: sales.subscription_checkout_and_plan_activation. THIS IS A HUMAN DECISION:
// starting a checkout or activating a plan moves money, so the agent answers and never acts.
//
// R2 is "answer questions using approved knowledge and records": answer from PLANS and
// the member's own subscription row. Every price and date says where it came from. A
// value that is not in the row or in PLANS is unknown; nothing is filled in from an
// assumption. Nothing here starts a checkout, applies a credit or activates anything.
//
// Prices reuse the PLANS snapshot and quoting from ../enrollment-checkout. Credit rules
// are the platform's accountCreditService.ts:22-59 (ColaberryEnterprise_AI_Leadership
// Accelerator @ 109820a): whole credit rows, oldest first, up to the charge less $1, with
// annual-only credits kept off a monthly charge. One platform behaviour is not carried
// over: activateByRef() treats an unrecognised plan as monthly (subscriptionService.ts:436).
// Here an unrecognised plan is unknown.

import { quotePlan } from '../enrollment-checkout/checkoutExplainer.js';

export const STATUSES = Object.freeze(['pending', 'active', 'canceled', 'failed', 'past_due']);
const MIN_CHARGE_CENTS = 100;
const ANNUAL_ONLY_CREDIT_REASONS = ['open_house_scholarship_annual'];
const CREDIT_SOURCE = 'accountCreditService.ts:22-59';
const ROW = "the member's subscription row";

const unknown = (field, reason) => ({ field, value: null, status: 'unknown', reason });
const known = (field, value, source) => ({ field, value, status: 'known', source });
const dollars = (cents) => Math.round(cents) / 100;
const central = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

function instant(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== 'string' || !/(Z|[+-]\d{2}:?\d{2})$/i.test(v.trim())) return null;
  const d = new Date(v.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** What the first charge would be with the member's available credit. Nothing is applied. */
export function creditPreview(plan, creditRows, catalog) {
  const q = quotePlan(plan, catalog);
  if (q.refused) return { status: 'refused', reason: q.reason };
  if (!Array.isArray(creditRows)) return unknown('credit', 'The member\'s credit rows could not be read, so the first charge is unknown.');
  const bad = creditRows.filter((c) => !Number.isInteger(c?.amount_cents) || typeof c?.id !== 'string');
  if (bad.length) return unknown('credit', `${bad.length} credit row(s) have no usable amount, so the credit cannot be added up.`);
  const chargeCents = Math.round(q.charge * 100);
  const target = Math.max(0, chargeCents - MIN_CHARGE_CENTS);
  const usable = creditRows.filter((c) => plan === 'annual' || !ANNUAL_ONLY_CREDIT_REASONS.includes(String(c.reason || '')));
  let applied = 0;
  const used = [];
  for (const c of usable) {
    if (c.amount_cents <= 0 || applied + c.amount_cents > target) continue;
    applied += c.amount_cents;
    used.push(c.id);
  }
  return {
    status: 'known', plan, full_price: q.charge, credit_applied: dollars(applied), first_charge: dollars(chargeCents - applied),
    credit_rows_used: used, credit_rows_not_usable: creditRows.filter((c) => !usable.includes(c)).map((c) => c.id),
    sources: { price: q.source, credit: CREDIT_SOURCE },
    note: 'Credit is only spent when the payment settles; an abandoned checkout keeps it. Only the first charge is reduced.',
  };
}

/** Plan, price and billing dates from the member's own row. Missing means unknown. */
export function explainSubscription(row, catalog) {
  if (!row || typeof row !== 'object') return { status: 'unknown', reason: 'No subscription row was found for this member.', fields: [] };
  const f = [];
  f.push(STATUSES.includes(row.status) ? known('status', row.status, ROW) : unknown('status', `Status "${row.status}" is not one the platform uses.`));
  const q = quotePlan(row.plan, catalog);
  if (q.refused && !catalog?.plans?.[row.plan]) f.push(unknown('plan', `The row's plan "${row.plan}" is not in PLANS, so its price is unknown. It is not assumed to be monthly.`));
  else if (q.refused) f.push(known('plan', row.plan, ROW), unknown('price', q.reason));
  else f.push(known('plan', row.plan, ROW), known('price', q.text, q.source));
  if (!q.refused && Number.isInteger(row.amount_cents) && row.amount_cents !== Math.round(q.charge * 100)) {
    f.push(known('charged_amount', `$${dollars(row.amount_cents)} (differs from today's price of $${q.charge})`, ROW));
  }
  for (const [field, label] of [['started_at', 'started'], ['current_period_end', 'paid_through']]) {
    const d = instant(row[field]);
    f.push(d ? known(label, central.format(d), ROW) : unknown(label, row[field] == null
      ? `There is no ${field} on the member's row${row.status === 'pending' ? ' yet: it is set when the payment settles' : ''}. It is not worked out from other dates.`
      : `The ${field} value "${row[field]}" has no time zone, so the date cannot be stated.`));
  }
  if (Number.isInteger(row.applied_credit_cents) && row.applied_credit_cents > 0) f.push(known('credit_on_first_charge', `$${dollars(row.applied_credit_cents)}`, ROW));
  return { status: f.some((x) => x.status === 'unknown') ? 'partly_unknown' : 'known', fields: f };
}

/** How billing dates work, from the code (billing/billingPeriod.ts:13-37, :47-75). */
export const BILLING_RULE = Object.freeze({
  text: 'A membership starts on the day the payment settles and renews on the same day the next month (monthly) or the next year (annual). In a shorter month it renews on the last day. It does not start on the class start date; that changed on 30 October 2026.',
  source: 'billing/billingPeriod.ts:13-37, :47-75',
});
