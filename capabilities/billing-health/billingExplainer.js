// Billing health watch explainer, autonomy:R2.
// Capability: sales.billing_health_watch. Read-only: Vick explains each finding of the
// platform's billing watch, its severity and what a person would have to do. It never
// charges, cancels or changes a schedule, and it sends nothing.
//
// A person passes in the watch's result (runBillingHealthCheck) and which sources it could
// actually read. Every finding cites the check that produced it. Every check is reported:
// "finding", "passed" or "unknown". A check whose source was unreadable, empty or never
// wired is unknown, never passed, which is where the platform's own watch can go quiet.
//
// Platform: ColaberryEnterprise_AI_LeadershipAccelerator @ 2e4c86f (main, 16 Nov 2026).
//   checks and runner     backend/src/services/billing/billingHealthCheck.ts
//   gateway reads         backend/src/services/billing/billingGatewayState.ts
//   report and schedule   billingHealthReport.ts:81-99; schedulerService.ts:2448-2449

const F = 'billingHealthCheck.ts';
/** The six checks the runner calls (billingHealthCheck.ts:344-350), with what each needs. */
export const CHECKS = Object.freeze({
  duplicateActive: { code: 'duplicate_active_rows', cite: `${F}:47`, source: 'database', name: 'Duplicate active subscriptions' },
  pastDueScheduled: { code: 'scheduled_charge_failed', cite: `${F}:264`, source: 'database', name: 'Automatic payment declined' },
  lapsedNoFollowup: { code: 'lapsed_no_followup', cite: `${F}:122`, source: 'database', name: 'Lapsed with no follow-up' },
  reminderAlive: { code: 'reminder_job_quiet', cite: `${F}:152`, source: 'reminder_history', name: 'Renewal reminder job alive' },
  expiringCards: { code: 'card_expires_before_charge', cite: `${F}:181`, source: 'card_expiry', name: 'Cards expiring before the next charge' },
  scheduleMatch: { code: 'schedule_book_mismatch', cite: `${F}:222`, source: 'gateway_schedules', name: 'Gateway schedules match our book' },
});
const BY_CODE = Object.fromEntries(Object.entries(CHECKS).map(([k, c]) => [c.code, k]));

const SEVERITY = Object.freeze({
  act_now: 'Act now: money is being lost or someone could be charged wrongly today.',
  soon: 'This week: it will cost money or a member if left.',
  watch: 'Keep an eye on it: harmless today, a risk if something changes.',
});
const SOURCE_STATES = Object.freeze(['read', 'unreadable', 'empty', 'not_wired']);

// Why each source state makes a check unknown, with the platform line that would otherwise pass it.
const UNKNOWN_WHY = Object.freeze({
  gateway_schedules: 'The gateway schedules could not be read. The platform logs that and skips the check, so it reports nothing, which looks like a pass (billingGatewayState.ts:50-56; billingHealthCheck.ts:349).',
  card_expiry: 'Card expiry dates were not read. The platform never fetches them: the gateway read fills only schedule ids, so this check returns nothing on every run (billingGatewayState.ts:15-18; billingHealthCheck.ts:182, :348).',
  reminder_history: 'No renewal reminder has ever been recorded as sent, or the history could not be read. The platform treats "never" as healthy (billingHealthCheck.ts:160-161).',
  database: 'The subscriptions database could not be read.',
});

function validate(result, sources) {
  if (result === null || typeof result !== 'object' || !Array.isArray(result.findings)) throw new RangeError('A watch result with a findings array is required.');
  if (sources === null || typeof sources !== 'object') throw new RangeError('Say which sources were read.');
  for (const k of ['database', 'gateway_schedules', 'card_expiry', 'reminder_history']) {
    if (!SOURCE_STATES.includes(sources[k])) throw new RangeError(`sources.${k} must be one of ${SOURCE_STATES.join(', ')}.`);
  }
  for (const f of result.findings) {
    if (!f || typeof f.code !== 'string' || !(f.severity in SEVERITY)) throw new RangeError('Each finding needs a code and a severity of act_now, soon or watch.');
  }
}

const failedCheckName = (f) => (f.code === 'check_failed' ? (String(f.headline).match(/The "(\w+)" check could not run/) || [])[1] : undefined);

function explainFinding(f, previous) {
  const key = BY_CODE[f.code];
  const check = CHECKS[key];
  const rows = Array.isArray(f.rows) ? f.rows.length : 0;
  const recurring = previous.has(f.code);
  const last = previous.get(f.code);
  // Unchanged means the same severity, row count and wording as last run. A bare code from
  // the last run carries no detail, so a matching code counts as unchanged.
  const unchanged = recurring && (last === null || (last.severity === f.severity && last.rows === rows && last.what_is_wrong === f.headline));
  return {
    check: key,
    check_name: check.name,
    cites: check.cite,
    severity: f.severity,
    severity_means: SEVERITY[f.severity],
    what_is_wrong: f.headline,
    what_a_person_does: f.action,
    vick_does: "Nothing. Vick explains; charging, cancelling or changing a schedule is a person's decision.",
    rows,
    recurring,
    changed_since_last_run: recurring && !unchanged,
    held_back: unchanged,
  };
}

function previousMap(previous) {
  if (!Array.isArray(previous)) throw new RangeError("previous must be an array of last run's finding codes or findings.");
  const m = new Map();
  for (const p of previous) {
    if (typeof p === 'string') m.set(p, null);
    else if (p && typeof p.code === 'string') m.set(p.code, { severity: p.severity, rows: p.rows, what_is_wrong: p.what_is_wrong });
    else if (p && typeof p.check === 'string' && CHECKS[p.check]) m.set(CHECKS[p.check].code, { severity: p.severity, rows: p.rows, what_is_wrong: p.what_is_wrong });
  }
  return m;
}

/**
 * Every check's status and every finding's explanation. `sources` says which inputs the run
 * could read: database, gateway_schedules, card_expiry, reminder_history, each one of read,
 * unreadable, empty or not_wired. `previous` (optional) is last run's findings or their codes.
 * The sales manager's rule (18 Nov 2026): a finding appears the first time, and is then held
 * back while it stays unchanged. A changed one (severity, row count or wording) appears again.
 * Held-back findings are still listed by name, never dropped silently.
 */
export function explain(result, sources, previous = []) {
  validate(result, sources);
  const prev = previousMap(previous);
  const findings = [];
  const heldBack = [];
  const unrecognised = [];
  const failed = new Set();
  for (const f of result.findings) {
    const name = failedCheckName(f);
    if (name !== undefined) { failed.add(name); continue; }
    if (BY_CODE[f.code]) { const x = explainFinding(f, prev); (x.held_back ? heldBack : findings).push(x); }
    else unrecognised.push({ code: f.code, severity: f.severity, what_is_wrong: f.headline, cites: null, note: 'No known check produces this code, so Vick cannot cite one. Escalate to the platform owner.' });
  }
  const checks = Object.entries(CHECKS).map(([key, c]) => {
    const base = { check: key, check_name: c.name, cites: c.cite };
    if (failed.has(key)) return { ...base, status: 'unknown', why: `The check threw an error and could not run (${F}:351-360). A check that cannot run is not a pass.` };
    const hit = findings.find((x) => x.check === key) || heldBack.find((x) => x.check === key);
    if (hit) return { ...base, status: 'finding', severity: hit.severity, ...(hit.held_back ? { held_back: true } : {}) };
    if (sources[c.source] !== 'read' || (c.source !== 'database' && sources.database !== 'read')) {
      const src = sources[c.source] !== 'read' ? c.source : 'database';
      return { ...base, status: 'unknown', why: UNKNOWN_WHY[src] };
    }
    return { ...base, status: 'passed', why: 'Its source was read and it found nothing.' };
  });
  const order = { act_now: 0, soon: 1, watch: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.check.localeCompare(b.check));
  const unknown = checks.filter((c) => c.status === 'unknown');
  heldBack.sort((a, b) => order[a.severity] - order[b.severity] || a.check.localeCompare(b.check));
  const clean = unknown.length === 0 && unrecognised.length === 0;
  return {
    healthy: findings.length === 0 && heldBack.length === 0 && clean,
    say_nothing: findings.length === 0 && heldBack.length === 0 && clean,
    checks,
    findings,
    held_back: heldBack,
    unknown: unknown.map((c) => c.check),
    unrecognised,
  };
}

/** Plain text for the manager: findings first, then what could not be checked. */
export function describe(e) {
  if (e.say_nothing) return 'All six billing checks ran on readable sources and found nothing.';
  const lines = e.findings.map((f) => `${f.severity_means.split(':')[0]}. ${f.check_name} (${f.cites}): ${f.what_is_wrong}. What a person does: ${f.what_a_person_does}${f.changed_since_last_run ? ' (Reported last run, and it has changed since.)' : ''}`);
  if (e.held_back && e.held_back.length) lines.push(`Held back, unchanged since the last run: ${e.held_back.map((f) => f.check_name).join('; ')}.`);
  for (const c of e.checks.filter((x) => x.status === 'unknown')) lines.push(`Not checked. ${c.check_name} (${c.cites}): ${c.why}`);
  for (const u of e.unrecognised) lines.push(`Unrecognised finding "${u.code}": ${u.note}`);
  return lines.join('\n');
}
