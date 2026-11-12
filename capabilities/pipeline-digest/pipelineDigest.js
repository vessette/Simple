// Sales pipeline digest for the accountable manager, autonomy:R2.
// Capability: sales.pipeline_digest_for_manager.
//
// R2 is "answer questions using approved knowledge and records": on request, answer
// pipeline-state questions from the same sources the digest uses, with every figure
// carrying its source. composeDigest() builds the digest text for the existing sender;
// nothing here sends mail, changes a setting or writes a record.
//
// The sources mirror the platform's compileDigestData() (ColaberryEnterprise_AI_
// LeadershipAccelerator @ 109820a, backend/src/services/digestService.ts:83-141).
// Two platform behaviours are deliberately not carried over:
//   1. All or nothing. The platform awaits every source in one Promise.all (:96-106), so
//      one failure means no digest at all, logged and dropped (schedulerService.ts:2626).
//      Here each source succeeds or fails on its own.
//   2. Missing becomes zero. Visitor figures fall back to 0 (`|| 0`, digestService.ts:
//      121-124). Here a missing figure is unavailable, with the reason, never 0.

/** Each source: what it is called in the platform, and what it provides. */
export const SOURCES = Object.freeze({
  pipeline: { platform: 'getPipelineStats() in leadService', label: 'Pipeline by stage' },
  leads: { platform: 'getLeadStats() in leadService', label: 'Leads' },
  enrollments: { platform: 'getDashboardStats() in cohortService', label: 'Enrollments and seats' },
  needs_attention: { platform: 'subscription needs-attention list (sales.revenue_and_subscription_reporting)', label: 'Needs attention' },
  appointments: { platform: 'getUpcomingAppointments(7) in appointmentService', label: 'Strategy calls this week' },
  revenue: { platform: "metric registry 'revenue.collected'", label: 'Collected revenue' },
});

/** The questions the agent can answer, each mapped to the source and fields it reads. */
export const QUESTIONS = Object.freeze({
  pipeline_by_stage: { source: 'pipeline', fields: 'all' },
  lead_summary: { source: 'leads', fields: ['total', 'thisMonth', 'highIntent'] },
  enrollment_state: { source: 'enrollments', fields: ['totalEnrollments', 'paidEnrollments', 'pendingInvoice', 'seatsRemaining'] },
  collected_revenue: { source: 'revenue', fields: ['collected'] },
  needs_attention: { source: 'needs_attention', list: true },
  upcoming_calls: { source: 'appointments', list: true },
});

const unavailable = (source, field, reason) => ({ source, field, value: null, status: 'unavailable', reason, from: SOURCES[source].platform });
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** Read one source result: { ok: true, data, as_of } or { ok: false, reason }. Anything else is unavailable. */
function read(sources, name) {
  const r = sources?.[name];
  if (!r || typeof r !== 'object') return { ok: false, reason: 'No result was returned for this source.' };
  if (r.ok !== true) return { ok: false, reason: r.reason || 'The source reported a failure without a reason.' };
  if (!r.data || typeof r.data !== 'object') return { ok: false, reason: 'The source returned no data.' };
  return r;
}

/** Figures for one source. Every figure names its source; a missing one is unavailable, never 0. */
export function figuresFor(sources, name, fields) {
  const r = read(sources, name);
  const keys = fields === 'all' ? (r.ok ? Object.keys(r.data) : []) : fields;
  if (!r.ok) return keys.length ? keys.map((f) => unavailable(name, f, r.reason)) : [unavailable(name, '*', r.reason)];
  return keys.map((f) => (isNum(r.data[f])
    ? { source: name, field: f, value: r.data[f], status: 'available', reason: null, from: SOURCES[name].platform, as_of: r.as_of ?? null }
    : unavailable(name, f, `The source answered but gave no number for "${f}".`)));
}

/** A list (needs attention, upcoming calls): the rows, or unavailable. An empty list is a real answer. */
export function listFor(sources, name) {
  const r = read(sources, name);
  if (!r.ok) return { source: name, status: 'unavailable', reason: r.reason, rows: null, from: SOURCES[name].platform };
  if (!Array.isArray(r.data.rows)) return { source: name, status: 'unavailable', reason: 'The source answered but gave no list.', rows: null, from: SOURCES[name].platform };
  return { source: name, status: 'available', reason: null, rows: r.data.rows, count: r.data.rows.length, from: SOURCES[name].platform, as_of: r.as_of ?? null };
}

/** Answer one pipeline-state question. */
export function answer(question, sources) {
  const q = QUESTIONS[question];
  if (!q) return { question, answerable: false, reason: `Not a question this capability answers. Ask one of: ${Object.keys(QUESTIONS).join(', ')}.` };
  return q.list
    ? { question, answerable: true, list: listFor(sources, q.source) }
    : { question, answerable: true, figures: figuresFor(sources, q.source, q.fields) };
}

const centralDate = (now) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

/**
 * Compose one digest for one recipient and one Central date, for the existing sender.
 * Disabled in settings, or already sent for (date, recipient): produce nothing and say why.
 */
export function composeDigest({ sources, settings, now, recipient, sentKeys }) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new RangeError('now must be a valid Date.');
  if (typeof recipient !== 'string' || !recipient.trim()) throw new RangeError('A recipient is required.');
  const date = centralDate(now);
  const key = `${date}|${recipient.trim().toLowerCase()}`;
  if (settings?.digest_enabled !== true) return { produced: false, key, reason: 'The digest is disabled in settings, so nothing was produced.' };
  if ((sentKeys ?? []).includes(key)) return { produced: false, key, reason: `A digest for ${recipient.trim()} on ${date} was already sent, so nothing is sent again.` };

  const sections = Object.keys(QUESTIONS).map((q) => ({ question: q, label: SOURCES[QUESTIONS[q].source].label, ...answer(q, sources) }));
  const figures = sections.flatMap((s) => s.figures ?? []);
  const lists = sections.filter((s) => s.list).map((s) => s.list);
  const unavailableCount = figures.filter((f) => f.status === 'unavailable').length + lists.filter((l) => l.status === 'unavailable').length;
  const attention = listFor(sources, 'needs_attention');
  const nothingToReport = unavailableCount === 0 && attention.status === 'available' && attention.count === 0;
  return {
    produced: true, key, date, recipient: recipient.trim(), sections, unavailable_count: unavailableCount,
    headline: nothingToReport ? 'Nothing needs your attention today.'
      : attention.status === 'unavailable' ? 'The needs-attention list is unavailable today, so this digest cannot say whether anything needs you.'
      : `${attention.count} item${attention.count === 1 ? '' : 's'} need${attention.count === 1 ? 's' : ''} your attention.`,
  };
}
