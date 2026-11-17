// Quote and offer packets for a human to price and send, autonomy:R1.
// Capability: sales.quote_and_offer_packet_preparation. A HUMAN DECISION, forever: Vick
// assembles a draft packet from approved plans and published tiers, lists what it cannot state,
// and hands it to a named person. It commits no price, offers no discount and sends nothing.
// R1 runs only against committed fixtures.
//
// Every price comes from an approved source: the membership price in the Sales Hub pinned facts
// (which agree with membershipPrice.ts:44-48) and the team tiers in the claims registry, quoted
// only when every copy agrees (capabilities/team-licenses). No total is computed: a total for N
// seats is a price the human sets. checkPacket() fails a packet with a discount, a bespoke price,
// a refund or cancellation term, or the word "free".

import { quotePrice } from '../team-licenses/teamLicenses.js';
import { checkDraft } from '../outreach-drafts/draftOutreach.js';

const DISCOUNT = /\b(discount(ed)?|\d+\s?%\s?off|percent off|reduced (price|rate)|special (price|rate|offer)|waive[ds]?|promo(tion)?( code)?|coupon|complimentary|money off|price match)\b/i;

/** Fails on a discount, a bespoke (unsourced) price, a refund or cancellation term, or "free". */
export function checkPacket(text, src) {
  if (typeof text !== 'string' || !text.trim()) throw new RangeError('A packet text is required.');
  const base = checkDraft(text, src); // grounding, "free", refunds, student-paid cost disclosure
  const problems = base.problems.map((p) => p.replace(/^Ungrounded price/, 'Bespoke price (not in an approved source)'));
  const d = text.match(DISCOUNT);
  if (d) problems.push(`Discount or special terms ("${d[0]}"): a financial commitment reserved to Ali and Roselen.`);
  return { pass: problems.length === 0, problems };
}

/** Approved sources as one grounding set: pinned facts plus the publishable team-tier wording. */
export function approvedSources(pinned, registry) {
  const team = ['pricing.team', 'pricing.department']
    .map((k) => quotePrice(k, registry))
    .filter((q) => q.status === 'quoted')
    .map((q) => ({ q: `Team license price (${q.key})`, a: `${q.price} per seat, per year`, detail: q.source }));
  return { pinned: pinned.pinned_facts, context: [...pinned.context, ...team] };
}

function tierFor(seats, registry) {
  if (!Number.isInteger(seats) || seats < 1) return { tier: null, why: 'No valid seat count was given.' };
  if (seats < 5) return { tier: null, why: `${seats} seat(s) is below the smallest team tier (5). Individual memberships, or a person decides.` };
  if (seats >= 50) return { tier: 'Enterprise', price: null, why: '50 or more seats is Enterprise: volume pricing is scoped on a call, so the price is for a person to set.' };
  const key = seats <= 14 ? 'pricing.team' : 'pricing.department';
  const q = quotePrice(key, registry);
  return q.status === 'quoted'
    ? { tier: seats <= 14 ? 'Team' : 'Department', price: q.price.replace(/ at department scale$/, ''), source: q.source }
    : { tier: seats <= 14 ? 'Team' : 'Department', price: null, why: `The ${key} price can't be quoted: ${q.why}` };
}

/**
 * A draft packet. `request`: { label, kind: 'individual' | 'team', seats?, asks?: string[] }.
 * `asks` are things the buyer asked for (e.g. "discount", "refund terms", "custom start date"):
 * each becomes a "cannot state" item for the human, never an answer.
 */
export function assemblePacket({ request, preparedFor, pinned, registry }) {
  if (!request || !['individual', 'team'].includes(request.kind) || !request.label) throw new RangeError('A request with a label and kind (individual or team) is required.');
  if (typeof preparedFor !== 'string' || !preparedFor.trim()) throw new RangeError('Name the person who will price and send this packet.');
  const src = approvedSources(pinned, registry);
  // The buyer's own seat count is a fact from the request, so it is a named source too.
  if (Number.isInteger(request.seats)) src.context.push({ q: 'The buyer\'s request', a: `${request.seats} seats requested`, detail: 'request' });
  const lines = [];
  const cannot = [];
  lines.push({ text: `Offer packet for ${request.label}: the AI Systems Architect Accelerator.`, source: 'request' });
  lines.push({ text: 'The membership is the full 12-week, project-based program: all four Architect Intensives, certification prep, an internship experience and guided portfolio projects.', source: 'pinned facts' });
  if (request.kind === 'individual') {
    lines.push({ text: 'Membership is $149/mo billed annually (founding rate, locks for as long as the membership stays active).', source: 'pinned facts; membershipPrice.ts:44-48' });
  } else {
    const t = tierFor(request.seats, registry);
    if (t.price) lines.push({ text: `For ${request.seats} seats, the published ${t.tier} tier is ${t.price} per seat, per year. The total, and any terms, are set by ${preparedFor.trim()}.`, source: t.source });
    else cannot.push({ item: `Price for ${request.seats ?? 'an unknown number of'} seats${t.tier ? ` (${t.tier})` : ''}`, why: t.why });
  }
  lines.push({ text: 'On top of the membership, each participant pays their own tools directly: an Anthropic subscription for Claude Code (about $20/mo) and LLM API usage on their own key (most projects under $10/mo).', source: 'pinned facts (student-paid costs)' });
  cannot.push({ item: 'Refund and cancellation terms', why: 'Drafted and pending final approval (salesHubCoryController.ts:33), so the packet does not state them.' });
  for (const a of Array.isArray(request.asks) ? request.asks : []) {
    cannot.push({ item: `Requested: "${String(a).slice(0, 80)}"`, why: 'Not in the approved plans or terms. A person decides whether and how to answer it.' });
  }
  cannot.push({ item: 'Start dates', why: 'The dates on file have passed; a person confirms the next cohort.' });
  const text = lines.map((l) => l.text).join('\n\n');
  const check = checkPacket(text, src);
  return {
    status: check.pass ? 'draft_for_human' : 'draft_failed_check',
    prepared_for: preparedFor.trim(),
    request: request.label,
    text,
    lines,
    cannot_state: cannot,
    check,
    committed_price: null,
    note: 'A draft. No price is committed, no discount is offered, and nothing is sent: the named person sets any price and sends it.',
  };
}
