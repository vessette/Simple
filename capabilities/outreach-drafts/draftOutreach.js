// Prospect outreach drafted for a human to send, autonomy:R1.
// Capability: sales.prospect_outreach_draft_for_human_send. A HUMAN DECISION, forever: Vick
// drafts and hands the draft to a named person, then stops. There is no send path, no queue
// entry and no scheduled action anywhere in this module, and the draft object has no field a
// sender could pick up. R1 runs only against committed prospect fixtures.
//
// Every price, date and count in a draft must trace to the approved sources (the Sales Hub
// pinned facts and approved KB entries), checked by the same audit the prospect-question
// capability uses. The word "free" is banned (40 TAC 807.172(d); platform rule
// bannedCopyRule.ts:108-113), and no refund or cancellation claim may appear while those
// terms are pending approval (salesHubCoryController.ts:33).

import { claims, check as groundingCheck } from '../prospect-kb-answers/kbAnswers.js';

export const FREE_RULE = Object.freeze({
  id: 'tac-807-172-d-free',
  reason: '40 TAC 807.172(d) (Texas Workforce Commission): training must not be advertised as "free".',
  alternatives: Object.freeze(['$0 to start', 'No card needed']),
  cite: 'bannedCopyRule.ts:108-113',
});
const FREE = /\bfree\b/i;
const REFUND = /\b(refund|refunds|refundable|cancel|cancellation|money[- ]back)\b/i;
const KINDS = Object.freeze(['intro', 'follow_up', 'pricing']);

/**
 * Check a draft's text. Fails on: a price, date or count not in the sources; the word "free";
 * any refund or cancellation claim; a cost mention without the student-paid costs.
 */
export function checkDraft(text, src) {
  if (typeof text !== 'string' || !text.trim()) throw new RangeError('A draft text is required.');
  const problems = [];
  // Grounding: reuse the prospect-question audit. Its question drives the cost and refund
  // rules, so ask it as a cost question whenever the draft mentions a price.
  const g = groundingCheck(/\$\s?\d/.test(text) ? 'How much does it cost?' : 'Tell me about the program', text, src);
  problems.push(...g.problems);
  const free = text.match(new RegExp(FREE.source, 'gi'));
  if (free) problems.push(`Banned word "free" (${FREE_RULE.cite}, ${FREE_RULE.reason}) Use "${FREE_RULE.alternatives.join('" or "')}".`);
  if (REFUND.test(text)) problems.push('Mentions refunds or cancellation: those terms are drafted and pending approval, so no draft may mention them (salesHubCoryController.ts:33).');
  return { pass: problems.length === 0, problems, claims: g.claims };
}

// Sentences a draft may use, each built only from an approved source. "free" is removed from
// the pinned facts' Open House wording; dates that have passed are never offered.
function approvedLines(src, asOf) {
  const sentences = src.pinned.split(/(?<=\.)\s+(?=[A-Z])/);
  const pick = (re) => sentences.find((s) => re.test(s));
  const lines = {};
  const price = pick(/^Pricing:/);
  // Annual only: month-to-month is offered only when someone pushes back (Ali, 24 Oct 2026;
  // claimsRegistry.ts pricing.individual.monthly). Cutting the "or ..." clause also drops its
  // "(cancel anytime)", a cancellation claim no draft may make while terms are pending.
  if (price) lines.price = price.replace(/^Pricing:\s*/, 'Membership is ').replace(/\s+or\s+\$[^.]*\.$/, '.');
  const costs = pick(/^STUDENT-PAID/);
  if (costs) lines.costs = 'On top of that, students pay their own tools directly: an Anthropic subscription for Claude Code (about $20/mo) and LLM API usage on their own key (most projects under $10/mo).';
  const schedule = pick(/^Schedule:/);
  if (schedule) lines.schedule = schedule.replace(/^Schedule:\s*/, 'The schedule is ');
  const what = pick(/membership IS the full/);
  if (what) lines.what = 'The membership is the full 12-week, project-based program: all four Architect Intensives, certification prep, an internship experience and guided portfolio projects.';
  const dates = pick(/^Dates:/);
  const passed = dates ? claims(dates).filter((c) => c.kind === 'date' && c.year).some((c) => {
    const [m, d] = c.key.split(' ');
    const iso = `${c.year}-${String(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].indexOf(m) + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return iso < asOf;
  }) : true;
  lines.dates = passed ? null : dates.replace(/\bfree\s+/i, '').replace(/^Dates:\s*/, 'Key dates: ');
  return lines;
}

/**
 * A draft for a named human to review and send. `prospect` is a committed fixture:
 * { label, stage, context, suppressed }. `sender` is the named person who will send.
 * Returns the draft, the source of every line, and its own check; never a send.
 */
export function draftOutreach({ prospect, kind, sender, src, asOf }) {
  if (!prospect || typeof prospect !== 'object' || !prospect.label) throw new RangeError('A prospect fixture with a label is required.');
  if (!KINDS.includes(kind)) throw new RangeError(`kind must be one of ${KINDS.join(', ')}.`);
  if (typeof sender !== 'string' || !sender.trim()) throw new RangeError('Name the human who will send this draft.');
  if (!src || typeof src.pinned !== 'string') throw new RangeError('The approved sources are required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(asOf))) throw new RangeError('asOf must be YYYY-MM-DD.');
  if (prospect.suppressed) {
    return { status: 'refused', reason: 'This prospect is suppressed or unsubscribed, so no draft is written.', prospect: prospect.label, draft: null };
  }
  const L = approvedLines(src, asOf);
  const parts = [{ text: `Hi ${prospect.label},`, source: 'greeting' }];
  if (kind === 'intro') parts.push({ text: `I'm reaching out about the AI Systems Architect Accelerator.${prospect.context ? ` ${prospect.context}` : ''}`, source: 'prospect fixture' });
  if (kind === 'follow_up') parts.push({ text: `Following up on our earlier conversation.${prospect.context ? ` ${prospect.context}` : ''}`, source: 'prospect fixture' });
  if (L.what && kind !== 'pricing') parts.push({ text: L.what, source: 'pinned facts' });
  if (L.schedule) parts.push({ text: L.schedule, source: 'pinned facts' });
  if (kind === 'pricing' && L.price) {
    parts.push({ text: L.price, source: 'pinned facts' });
    if (L.costs) parts.push({ text: L.costs, source: 'pinned facts' });
  }
  if (L.dates) parts.push({ text: L.dates, source: 'pinned facts' });
  else parts.push({ text: 'I\'ll confirm the next cohort\'s dates with you directly.', source: 'fixed line: dates on file have passed' });
  parts.push({ text: 'Happy to answer any questions.', source: 'fixed line' });
  parts.push({ text: sender.trim(), source: 'named sender' });
  const body = parts.map((p) => p.text).join('\n\n');
  const own = checkDraft(body, src);
  return {
    status: own.pass ? 'draft_for_review' : 'draft_failed_check',
    for_review_by: sender.trim(),
    prospect: prospect.label,
    kind,
    subject: kind === 'pricing' ? 'Accelerator pricing' : 'The AI Systems Architect Accelerator',
    body,
    sources: parts,
    check: own,
    note: 'A draft only. Vick does not send it, queue it or schedule it; the named person reviews and sends it themselves.',
  };
}
