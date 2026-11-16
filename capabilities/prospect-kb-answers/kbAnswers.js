// Grounded answers to a rep's prospect questions, autonomy:R2.
// Capability: sales.prospect_question_answering_from_approved_kb. Rep-facing only: the
// answer reaches a prospect through the rep; Vick never contacts anyone.
//
// Two parts:
//  - answer(): composes an answer only from the pinned facts and the retrieved KB entries,
//    sentence by sentence, so every claim carries its source. No model, no invention.
//  - check(): audits ANY answer (Vick's, or the Sales Hub's own LLM reply) against the same
//    sources. Every price, date and count must appear in a source; a cost answer must
//    disclose the student-paid Anthropic and API costs; a refund answer must say the terms
//    are pending approval and quote none. One fabricated price, date or policy fails it.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ 3a7eb22 (main, 16 Nov 2026).
//   pinned facts and rules   backend/src/controllers/salesHubCoryController.ts:25-33, :35-42
//   plan prices              backend/src/services/membershipPrice.ts:44-48

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_RE = MONTHS.join('|');
export const ASK_ALI = "I don't have that detail. Please confirm with Ali.";
export const REFUND_LINE = "Refund and cancellation terms are drafted and pending final approval, so I can't quote them yet. Please confirm with Ali.";

const TOPICS = Object.freeze({
  cost: /\b(cost|costs|price|pricing|fee|fees|how much|total|tuition|afford|expensive)\b/i,
  refund: /\b(refund|refunds|cancel|cancellation|money back)\b/i,
  dates: /\b(when|date|dates|start|starts|kickoff|open house|begin|expo)\b/i,
  seats: /\b(seat|seats|spots|cap|class size|how many (people|students))\b/i,
  schedule: /\b(schedule|hours|time commitment|per week|weekly|days)\b/i,
});
// Which pinned sentence answers which topic.
const PINNED_FOR = Object.freeze({ cost: [/^Pricing:/, /^STUDENT-PAID/, /No separate course fees/], dates: [/^Dates:/], seats: [/capped at \d+ seats/], schedule: [/^Schedule:/] });

/** The price, date and count claims in a text, normalised so a source can be matched. */
export function claims(text) {
  const out = [];
  const t = String(text);
  for (const m of t.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)) out.push({ kind: 'price', raw: m[0], key: `$${Number(m[1].replace(/,/g, ''))}` });
  for (const m of t.matchAll(new RegExp(`\\b(${MONTH_RE})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`, 'gi'))) {
    out.push({ kind: 'date', raw: m[0], key: `${m[1].toLowerCase()} ${Number(m[2])}`, year: m[3] ? Number(m[3]) : null });
  }
  for (const m of t.matchAll(/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi)) {
    out.push({ kind: 'date', raw: m[0], key: `${m[2].toLowerCase()} ${Number(m[1])}`, year: null });
  }
  for (const m of t.matchAll(/\b(\d+)[\s-]*(seats?|spots?|hours?|h|weeks?|days?|months?|%)(?![a-z])/gi)) {
    const unit = m[2].toLowerCase().replace(/s$/, '').replace(/^h$/, 'hour').replace(/^spot$/, 'seat');
    out.push({ kind: 'count', raw: m[0], key: `${Number(m[1])} ${unit}` });
  }
  return out;
}

const sourcesOf = ({ pinned, context = [] }) => [
  { id: 'pinned', text: pinned },
  ...context.map((c, i) => ({ id: `kb[${i}]`, text: `${c.q} ${c.a} ${c.detail || ''}` })),
];

function validate(question, src) {
  if (typeof question !== 'string' || !question.trim() || question.length > 600) throw new RangeError('A question of 1 to 600 characters is required.');
  if (!src || typeof src.pinned !== 'string' || !src.pinned.trim()) throw new RangeError('The pinned facts are required.');
  if (src.context !== undefined && (!Array.isArray(src.context) || src.context.length > 8 || src.context.some((c) => !c || typeof c.q !== 'string' || typeof c.a !== 'string'))) {
    throw new RangeError('context must be up to eight { q, a } entries.');
  }
}

export const topicsOf = (q) => Object.keys(TOPICS).filter((k) => TOPICS[k].test(q));
const words = (s) => new Set(String(s).toLowerCase().match(/[a-z]{4,}/g) || []);
const STOP = new Set(['what', 'when', 'does', 'have', 'there', 'about', 'with', 'this', 'that', 'your', 'will', 'from', 'they', 'need', 'know', 'program']);

/** Dates in the pinned facts that are before asOf (YYYY-MM-DD). A date that has passed is not stated as upcoming. */
function passed(sentence, asOf) {
  return claims(sentence).filter((c) => c.kind === 'date' && c.year).filter((c) => {
    const d = `${c.year}-${String(MONTHS.indexOf(c.key.split(' ')[0]) + 1).padStart(2, '0')}-${String(c.key.split(' ')[1]).padStart(2, '0')}`;
    return d < asOf;
  });
}

/**
 * A grounded answer to a rep's question. `src` is { pinned, context } as the Sales Hub sends
 * them; `asOf` is today's date (YYYY-MM-DD), so a date that has passed is flagged, not repeated
 * as upcoming. Every sentence is a source sentence or a fixed line; `parts` says which.
 */
export function answer(question, src, asOf) {
  validate(question, src);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(asOf))) throw new RangeError('asOf must be YYYY-MM-DD.');
  const pinnedSentences = src.pinned.split(/(?<=\.)\s+(?=[A-Z])/);
  const topics = topicsOf(question);
  const parts = [];
  const add = (text, source) => { if (!parts.some((p) => p.text === text)) parts.push({ text, source }); };

  for (const t of topics) {
    if (t === 'refund') { add(REFUND_LINE, 'pinned'); continue; }
    for (const s of pinnedSentences.filter((x) => PINNED_FOR[t].some((re) => re.test(x)))) {
      const old = t === 'dates' ? passed(s, asOf) : [];
      if (old.length) add(`The dates on file have passed (${old.map((c) => c.raw).join(', ')}), so I can't give the next ones. Please confirm the next cohort's dates with Ali.`, 'pinned');
      else add(s, 'pinned');
    }
  }
  // KB entries whose question shares a meaningful word with the rep's question.
  const qWords = [...words(question)].filter((w) => !STOP.has(w));
  (src.context || []).forEach((c, i) => {
    if (qWords.some((w) => words(c.q).has(w))) add(c.a, `kb[${i}]`);
  });
  const silent = parts.length === 0;
  if (silent) parts.push({ text: ASK_ALI, source: null });
  return { question, topics, silent, parts, text: parts.map((p) => p.text).join(' ') };
}

/**
 * Audit any answer text against the sources. Returns pass/fail and every claim with the
 * source it traced to, or null. Refund-term phrases not in a source count as fabricated policy.
 */
export function check(question, text, src) {
  validate(question, src);
  if (typeof text !== 'string' || !text.trim()) throw new RangeError('An answer text is required.');
  const sources = sourcesOf(src);
  const traced = claims(text).map((c) => {
    const hit = sources.find((s) => claims(s.text).some((x) => x.kind === c.kind && x.key === c.key && (c.kind !== 'date' || !c.year || !x.year || c.year === x.year)));
    return { ...c, source: hit ? hit.id : null };
  });
  const problems = traced.filter((c) => !c.source).map((c) => `Ungrounded ${c.kind}: "${c.raw}" is in no pinned fact or KB entry.`);
  const topics = topicsOf(question);
  if (topics.includes('cost') && !(/anthropic/i.test(text) && /\bAPI\b/i.test(text) && /\$\s?20\b/.test(text) && /\$\s?10\b/.test(text))) {
    problems.push('Cost answer without the student-paid Anthropic (about $20/mo) and API (under $10/mo) costs.');
  }
  const policy = text.match(/full refund|money[- ]back|refundable|non-refundable|refund within|prorated|pro-rated|guarantee/gi) || [];
  for (const p of policy) if (!sources.some((s) => s.text.toLowerCase().includes(p.toLowerCase()))) problems.push(`Ungrounded policy: "${p}".`);
  if (topics.includes('refund') && !/pending (final )?approval/i.test(text)) problems.push('Refund answer does not say the terms are pending approval.');
  return { pass: problems.length === 0, claims: traced, problems };
}

/** The pinned prices against the plan prices, so the fourth copy can't drift silently. */
export function pricesAgree(pinned, plan) {
  const prices = claims(pinned).filter((c) => c.kind === 'price').map((c) => c.key);
  const want = [`$${plan.annual_per_month}`, `$${plan.monthly}`];
  const missing = want.filter((p) => !prices.includes(p));
  return { agree: missing.length === 0, missing };
}
