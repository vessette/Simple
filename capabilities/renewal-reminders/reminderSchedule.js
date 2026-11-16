// Renewal reminder schedule, autonomy:R2.
// Capability: sales.renewal_reminder_lifecycle. Read-only: Vick states who is due which
// reminder and when, in Central time, and whether one was sent. It sends nothing: the
// send stays with the platform's job (live_email is default-denied to agents).
//
// Every date is computed from current_period_end and the platform's own constants, and
// the working is returned so a person can redo it. "Sent" is said only when the reminder
// ledger has a row with status 'sent' and a sent_at; a 'claimed' row means the email may
// or may not have gone, and a missing or unreadable ledger is never read as sent.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ 0f9ba1e (main, 16 Nov 2026).
//   constants          backend/src/services/renewal/renewalReminderSelection.ts:60-61, :64, :76, :92
//   which kind, when   renewalReminderSelection.ts reminderKindFor, lapseFollowupKindFor
//   ledger             renewalReminderService.ts:83-118 (claimed then sent), :181-184, :195-196
//   job times          schedulerService.ts:2391-2400 (09:00 Central), :2417 (autopay notice 08:30)

export const ADVANCE_LEAD_DAYS = 7;
export const FINAL_LEAD_DAYS = 1;
export const LAPSE_FOLLOWUP_DAYS = Object.freeze([1, 7]);
export const BILLING_TIMEZONE = 'America/Chicago';
export const CITES = Object.freeze({
  constants: 'renewalReminderSelection.ts:60-61, :64, :92',
  kinds: 'renewalReminderSelection.ts:76',
  ledger: 'renewalReminderService.ts:83-118',
  job: 'schedulerService.ts:2391-2400',
  autopay: 'autopayNotice.ts:46; schedulerService.ts:2417',
});

const DAY_MS = 86400000;
const ymd = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: BILLING_TIMEZONE });
/** The Central calendar date (YYYY-MM-DD) of an instant. */
export const centralDate = (ms) => ymd.format(new Date(ms));
const dayNum = (date) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
const addDays = (date, n) => new Date((dayNum(date) + n) * DAY_MS).toISOString().slice(0, 10);
const toMs = (v) => {
  if (typeof v !== 'string' && !(v instanceof Date)) return null;
  const ms = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

// Each kind's date relative to the period end's Central date, and the constant it comes from.
const OFFSETS = Object.freeze({
  advance_7d: [-ADVANCE_LEAD_DAYS, 'ADVANCE_LEAD_DAYS'],
  final_1d: [-FINAL_LEAD_DAYS, 'FINAL_LEAD_DAYS'],
  after_lapse_1d: [LAPSE_FOLLOWUP_DAYS[0], 'LAPSE_FOLLOWUP_DAYS[0]'],
  after_lapse_7d: [LAPSE_FOLLOWUP_DAYS[1], 'LAPSE_FOLLOWUP_DAYS[1]'],
});

/** The four reminder dates for one period end, each with its working. */
export function reminderDates(periodEnd) {
  const ms = toMs(periodEnd);
  if (ms === null) throw new RangeError('current_period_end must be a date-time.');
  const end = centralDate(ms);
  return Object.entries(OFFSETS).map(([kind, [n, constant]]) => ({
    kind,
    date: addDays(end, n),
    at: '09:00 Central, when the daily job runs',
    working: `period end ${new Date(ms).toISOString()} is ${end} in Central; ${n < 0 ? `minus ${-n}` : `plus ${n}`} day${Math.abs(n) === 1 ? '' : 's'} (${constant} = ${Math.abs(n)})`,
  }));
}

/** The kind the platform would pick at `nowMs`, by its own rules, or null. */
export function kindDueAt(periodEnd, nowMs) {
  const endMs = toMs(periodEnd);
  const daysUntil = (endMs - nowMs) / DAY_MS;
  const delta = dayNum(centralDate(endMs)) - dayNum(centralDate(nowMs));
  if (daysUntil <= 0) return -delta === LAPSE_FOLLOWUP_DAYS[0] ? 'after_lapse_1d' : -delta === LAPSE_FOLLOWUP_DAYS[1] ? 'after_lapse_7d' : null;
  if (delta <= FINAL_LEAD_DAYS) return 'final_1d';
  if (delta <= ADVANCE_LEAD_DAYS) return 'advance_7d';
  return null;
}

/**
 * Was this reminder sent? `ledger` is the rows read from subscription_renewal_reminders for
 * this subscription, or null when it could not be read.
 */
export function sendStatus(sub, kind, ledger) {
  if (ledger === null || ledger === undefined) return { status: 'unknown', why: 'The reminder ledger was not read, so Vick cannot say whether it was sent.' };
  if (!Array.isArray(ledger)) throw new RangeError('ledger must be an array of rows, or null when it could not be read.');
  const endMs = toMs(sub.current_period_end);
  const row = ledger.find((r) => r && r.subscription_id === sub.id && r.reminder_kind === kind && toMs(r.period_end) === endMs);
  if (!row) return { status: 'not_sent', why: 'No ledger row for this subscription, period end and kind.' };
  if (row.status === 'sent' && toMs(row.sent_at) !== null) return { status: 'sent', sent_at: row.sent_at, sent_central: centralDate(toMs(row.sent_at)), why: `Ledger row is 'sent' (${CITES.ledger}).` };
  if (row.status === 'claimed') return { status: 'claimed_unconfirmed', why: "Ledger row is 'claimed': the send started but was not confirmed. It may have been delivered, so it will not be sent again, but Vick does not call it sent." };
  return { status: 'unknown', why: `Ledger row has status "${row.status}"${row.status === 'sent' ? ' but no sent_at' : ''}, which Vick does not read as sent.` };
}

const SKIPS = [
  [(r) => r.status !== 'active', 'not_active'],
  [(r) => r.plan === 'comp', 'comped'],
  [(r) => !(r.amount_cents > 0), 'zero_amount'],
  [(r) => r.enrollment_status && r.enrollment_status !== 'active', 'enrollment_not_active'],
  [(r) => !!r.notifications_paused_at, 'notifications_paused'],
];

/**
 * Who is due which reminder at `nowMs`, and why everyone else is not, mirroring the
 * platform's selection. `switchOn` is RENEWAL_REMINDERS_ENABLED: when off, nothing sends.
 */
export function whoIsDue(rows, nowMs, { ledger = null, switchOn = false } = {}) {
  if (!Array.isArray(rows)) throw new RangeError('rows must be an array of subscriptions.');
  if (!Number.isFinite(nowMs)) throw new RangeError('nowMs must be a time.');
  const latest = new Map();
  for (const r of rows) {
    const e = toMs(r.current_period_end);
    if (r.status !== 'active' || e === null) continue;
    const b = latest.get(r.enrollment_id);
    if (!b || e > b.e || (e === b.e && r.id > b.id)) latest.set(r.enrollment_id, { id: r.id, e });
  }
  const due = []; const skipped = [];
  for (const r of rows) {
    const hit = SKIPS.find(([test]) => test(r));
    if (hit) { skipped.push({ subscription_id: r.id, reason: hit[1] }); continue; }
    const start = toMs(r.access_starts_at);
    if (start !== null && dayNum(centralDate(start)) > dayNum(centralDate(nowMs))) { skipped.push({ subscription_id: r.id, reason: 'access_not_started' }); continue; }
    if (toMs(r.current_period_end) === null) { skipped.push({ subscription_id: r.id, reason: 'no_period_end' }); continue; }
    if (latest.get(r.enrollment_id)?.id !== r.id) { skipped.push({ subscription_id: r.id, reason: 'superseded' }); continue; }
    const kind = kindDueAt(r.current_period_end, nowMs);
    if (!kind) { skipped.push({ subscription_id: r.id, reason: (toMs(r.current_period_end) - nowMs) <= 0 ? 'already_lapsed' : 'not_yet_due' }); continue; }
    const date = reminderDates(r.current_period_end).find((d) => d.kind === kind);
    due.push({
      subscription_id: r.id, kind, autopay: Boolean(r.paysimple_schedule_id),
      period_end_central: centralDate(toMs(r.current_period_end)), scheduled_date: date.date, working: date.working,
      on_or_after_scheduled: dayNum(centralDate(nowMs)) >= dayNum(date.date),
      will_send_today: switchOn ? 'only if the ledger has no row for it' : 'no: RENEWAL_REMINDERS_ENABLED is off, so nothing sends',
      sent: sendStatus(r, kind, ledger),
    });
  }
  due.sort((a, b) => a.period_end_central.localeCompare(b.period_end_central) || a.subscription_id.localeCompare(b.subscription_id));
  return { as_of_central: centralDate(nowMs), switch_on: switchOn, due, skipped };
}
