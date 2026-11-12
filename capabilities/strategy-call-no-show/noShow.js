// Strategy-call no-show explainer, autonomy:R2.
// Capability: sales.strategy_call_no_show_detection_and_recovery.
//
// R2 is "answer questions using approved knowledge and records": given strategy-call
// rows and a current time, say which calls qualify as no-shows and why. Nothing here
// marks a call, completes a campaign lead, cancels a nudge or enrols anyone.
//
// The rule is the platform's detectNoShows() (ColaberryEnterprise_AI_Leadership
// Accelerator @ 109820a, backend/src/services/schedulerService.ts:1622-1631): a call
// still 'scheduled' whose scheduled_at is earlier than now minus a grace period.
// The grace period is NOT settled, so every answer names the one it used:
//   - spec: 30 minutes, as the capability spec and the agent registry describe it
//     (agentRegistrySeed.ts:203).
//   - running_code: 2 hours, which is what detectNoShows() actually uses (:1624).
// Neither is approved. There is deliberately no default.

export const GRACE_RULES = Object.freeze({
  spec: Object.freeze({ minutes: 30, source: 'capability spec and agent registry (agentRegistrySeed.ts:203)' }),
  running_code: Object.freeze({ minutes: 120, source: 'detectNoShows() in schedulerService.ts:1622-1631' }),
});

export const VERDICTS = Object.freeze(['no_show', 'not_yet', 'already_no_show', 'not_a_no_show', 'unknown']);
const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];
const ZONED = /(Z|[+-]\d{2}:?\d{2})$/i;
const MINUTE = 60 * 1000;

const central = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', year: 'numeric', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

/** An instant, or null. A timestamp with no zone is a wall-clock time, not an instant. */
export function toInstant(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || !ZONED.test(value.trim())) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveRule(rule) {
  const r = GRACE_RULES[rule];
  if (!r) throw new RangeError(`Unknown grace rule "${rule}". Use one of: ${Object.keys(GRACE_RULES).join(', ')}.`);
  return { rule, ...r };
}

function resolveNow(now) {
  const d = toInstant(now);
  if (!d) throw new RangeError('A current time with a zone is required, for example 2026-11-11T15:00:00Z.');
  return d;
}

/**
 * Explain one call. Every answer names the scheduled time, the grace threshold and the
 * current status, whatever the verdict.
 */
export function explainCall(call, { now, rule }) {
  const r = resolveRule(rule);
  const at = resolveNow(now);
  const scheduled = toInstant(call?.scheduled_at);
  const status = typeof call?.status === 'string' ? call.status : null;
  const answer = {
    call_id: call?.id ?? null,
    lead_id: call?.lead_id ?? null,
    scheduled_at: scheduled ? scheduled.toISOString() : (call?.scheduled_at ?? null),
    scheduled_at_central: scheduled ? central.format(scheduled) : null,
    grace_minutes: r.minutes,
    grace_rule: r.rule,
    grace_source: r.source,
    current_status: status,
    minutes_past: scheduled ? Math.floor((at - scheduled) / MINUTE) : null,
    verdict: 'unknown',
    reason: '',
  };
  const say = (verdict, reason) => Object.assign(answer, { verdict, reason });

  if (!scheduled) {
    return say('unknown', call?.scheduled_at == null
      ? 'No scheduled time is recorded, so it cannot be compared with the grace threshold.'
      : `The scheduled time "${call.scheduled_at}" has no time zone, so the minutes elapsed cannot be known.`);
  }
  if (!STATUSES.includes(status)) {
    return say('unknown', `Status "${status}" is not one of ${STATUSES.join(', ')}.`);
  }
  if (status === 'no_show') return say('already_no_show', 'Already marked no_show; the rule only looks at calls still scheduled.');
  if (status !== 'scheduled') return say('not_a_no_show', `Marked ${status}, and only calls still scheduled can be no-shows.`);

  const cutoff = new Date(at.getTime() - r.minutes * MINUTE);
  if (scheduled >= cutoff) {
    const reason = scheduled > at
      ? 'The scheduled time is after the current time.'
      : `${answer.minutes_past} minutes have passed, which is not more than the ${r.minutes}-minute grace threshold.`;
    return say('not_yet', reason);
  }
  let reason = `Still scheduled ${answer.minutes_past} minutes after its start, more than the ${r.minutes}-minute grace threshold.`;
  if (answer.lead_id == null) reason += ' No lead is linked, so there is nobody to place on the recovery queue.';
  else if (call.recovery_queued === true) reason += ' The lead is already on the recovery queue and would not be added twice.';
  return say('no_show', reason);
}

/**
 * Explain a set of calls under one rule. Counts are derived from the returned rows
 * and never stand alone: every count comes with the rows it counts.
 */
export function explainCalls(calls, { now, rule }) {
  if (!Array.isArray(calls)) throw new TypeError('calls must be an array of strategy-call rows.');
  const r = resolveRule(rule);
  const at = resolveNow(now);
  const rows = calls.map((c) => explainCall(c, { now: at, rule }));
  const counts = Object.fromEntries(VERDICTS.map((v) => [v, rows.filter((x) => x.verdict === v).length]));
  return { now: at.toISOString(), grace_rule: r.rule, grace_minutes: r.minutes, grace_source: r.source, total: rows.length, counts, rows };
}

/** Calls whose verdict depends on which grace rule is used. This is the decision the manager has to make. */
export function compareRules(calls, { now }) {
  const a = explainCalls(calls, { now, rule: 'spec' });
  const b = explainCalls(calls, { now, rule: 'running_code' });
  const rows = a.rows
    .map((row, i) => ({ call_id: row.call_id, scheduled_at: row.scheduled_at, current_status: row.current_status,
      minutes_past: row.minutes_past, spec: row.verdict, running_code: b.rows[i].verdict }))
    .filter((x) => x.spec !== x.running_code);
  return { now: a.now, total: rows.length, rows };
}
