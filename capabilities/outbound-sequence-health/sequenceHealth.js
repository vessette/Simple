// Outbound sequence health explainer, autonomy:R2.
// Capability: sales.outbound_sequence_health_watch.
//
// R2 is "answer questions using approved knowledge and records": given the recorded
// inputs for a sequence, say why it scores as it does, component by component. It
// proposes a named repair per finding and executes none of them. Nothing here retries
// a send, resolves an error or writes a health row.
//
// The scoring rules are the platform's scanCampaign() (ColaberryEnterprise_AI_
// LeadershipAccelerator @ 109820a, backend/src/services/campaignHealthScanner.ts:155-201),
// ported unchanged where the inputs are known. They are a DRAFT: no approved health
// rules exist. Two platform behaviours are deliberately not carried over:
//   1. Assumed connectivity. SMS is scored "ok" whenever it is enabled (:148), and
//      email and voice are "ok" when credentials are merely configured (:136, :142).
//      Here a channel's state must be reported; an unreachable one makes the score unknown.
//   2. Credit without evidence. A component with no data gets full points (:164, :171,
//      :179, :189), so a sequence that has stopped sending scores 100. Here that credit
//      is still shown, to match the platform score, but it is listed by name.

const SRC = 'campaignHealthScanner.ts';
export const WEIGHTS = Object.freeze({ connectivity: 30, delivery: 25, ai_generation: 15, engagement: 15, errors: 15 });
export const CHANNEL_STATES = Object.freeze(['ok', 'not_configured', 'outage', 'unreachable']);
const isCount = (v) => Number.isInteger(v) && v >= 0;

function part(name, inputs, rule, line) {
  return { component: name, weight: WEIGHTS[name], inputs, rule, source: `${SRC}:${line}`, state: 'scored', points: null, credited_points: null, note: '' };
}
const unreachable = (p, why) => Object.assign(p, { state: 'unreachable', note: why });
const noData = (p, why) => Object.assign(p, { state: 'no_data', credited_points: p.weight, note: `${why} The platform gives full credit here without evidence.` });
const scored = (p, pts) => Object.assign(p, { points: pts, credited_points: pts });

function connectivity(seq) {
  const ch = seq.channels;
  const p = part('connectivity', { channels: ch ?? null }, 'share of enabled channels (plus AI) that are working', '158-165');
  if (!ch || typeof ch !== 'object' || Object.keys(ch).length === 0) return unreachable(p, 'No channel states were reported.');
  const bad = Object.entries(ch).filter(([, s]) => !CHANNEL_STATES.includes(s));
  if (bad.length) return unreachable(p, `Unrecognised channel state for ${bad.map(([k]) => k).join(', ')}.`);
  const lost = Object.entries(ch).filter(([, s]) => s === 'unreachable').map(([k]) => k);
  if (lost.length) return unreachable(p, `Could not reach ${lost.join(', ')}, so connectivity is unknown.`);
  const ok = Object.values(ch).filter((s) => s === 'ok').length;
  return scored(p, WEIGHTS.connectivity * ok / Object.keys(ch).length);
}

function delivery(seq) {
  const { sent_24h: sent, failed_24h: failed } = seq;
  const p = part('delivery', { sent_24h: sent ?? null, failed_24h: failed ?? null }, 'sent / (sent + failed) in the last 24 hours', '167-172');
  if (!isCount(sent) || !isCount(failed)) return unreachable(p, 'Send counts for the last 24 hours could not be read.');
  if (sent + failed === 0) return noData(p, 'Nothing was sent or failed in the last 24 hours.');
  return scored(p, WEIGHTS.delivery * sent / (sent + failed));
}

function aiGeneration(seq) {
  const { ai_attempted_24h: att, ai_failed_24h: fail } = seq;
  const p = part('ai_generation', { ai_attempted_24h: att ?? null, ai_failed_24h: fail ?? null }, '1 - failed / attempted AI generations in the last 24 hours', '174-180');
  if (!isCount(att) || !isCount(fail)) return unreachable(p, 'AI generation counts could not be read.');
  if (att === 0) return noData(p, 'No AI generations were attempted in the last 24 hours.');
  return scored(p, WEIGHTS.ai_generation * Math.max(0, 1 - fail / att));
}

function engagement(seq) {
  const o = seq.outcomes_7d;
  const p = part('engagement', { outcomes_7d: o ?? null }, 'open credit (full at 10%) and reply credit (full at 2%), from 5+ outcomes in 7 days', '182-190');
  const keys = ['sent', 'opened', 'clicked', 'replied', 'bounced'];
  if (!o || keys.some((k) => !isCount(o[k]))) return unreachable(p, 'Engagement outcomes for the last 7 days could not be read.');
  const total = keys.reduce((a, k) => a + o[k], 0);
  if (total < 5) return noData(p, `Only ${total} outcomes in 7 days, below the minimum of 5.`);
  const open = (o.opened + o.clicked + o.replied) / total, reply = o.replied / total;
  return scored(p, WEIGHTS.engagement * (Math.min(1, open / 0.10) + Math.min(1, reply / 0.02)) / 2);
}

function errors(seq) {
  const { unresolved_errors: un, sent_24h: sent, failed_24h: failed } = seq;
  const p = part('errors', { unresolved_errors: un ?? null, actions_24h: isCount(sent) && isCount(failed) ? sent + failed : null },
    'unresolved errors against actions in the last 24 hours', '192-198');
  if (!isCount(un) || !isCount(sent) || !isCount(failed)) return unreachable(p, 'Error or send counts could not be read.');
  const total = sent + failed;
  const ratio = total > 0 ? 1 - Math.min(1, un / total) : (un === 0 ? 1 : Math.max(0, 1 - un / 5));
  return scored(p, WEIGHTS.errors * ratio);
}

const band = (s) => (s >= 80 ? 'healthy' : s >= 60 ? 'degraded' : 'critical');

/** Score one sequence. Every point is traceable to a component and its inputs. */
export function explainScore(seq) {
  if (!seq || typeof seq !== 'object') throw new TypeError('A sequence record is required.');
  const components = [connectivity, delivery, aiGeneration, engagement, errors].map((f) => f(seq));
  const lost = components.filter((c) => c.state === 'unreachable');
  const credited = components.filter((c) => c.state === 'no_data').map((c) => c.component);
  const evidenced = components.filter((c) => c.state === 'scored');
  const out = {
    sequence_id: seq.id ?? null, name: seq.name ?? null, components,
    score: null, status: 'unknown', credited_without_evidence: credited,
    evidenced_points: Math.round(evidenced.reduce((a, c) => a + c.points, 0)),
    evidenced_max: evidenced.reduce((a, c) => a + c.weight, 0), reason: '',
  };
  if (lost.length) {
    out.reason = `Unknown: ${lost.map((c) => `${c.component} (${c.note})`).join('; ')} No passing default is used.`;
    return out;
  }
  out.score = Math.round(Math.min(100, Math.max(0, components.reduce((a, c) => a + c.credited_points, 0))));
  out.status = band(out.score);
  out.reason = `${out.score} = ${components.map((c) => `${c.component} ${Math.round(c.credited_points * 10) / 10}/${c.weight}`).join(' + ')}.`
    + (credited.length ? ` ${credited.join(', ')} got full credit with no data behind it; only ${out.evidenced_points} of ${out.evidenced_max} evidenced points were earned.` : '');
  return out;
}

/** Stalled: active leads but no pending actions (campaignRepairAgent.ts:126). Unknown if either count is missing. */
export function isStalled(seq) {
  const { active_leads: a, pending_actions: p } = seq ?? {};
  if (!isCount(a) || !isCount(p)) return null;
  return a > 0 && p === 0;
}

/** Named, unexecuted repair proposals. Each finding has a stable key for de-duplication across runs. */
export function proposeRepairs(seq) {
  const id = seq?.id ?? null;
  const found = [];
  const add = (kind, subject, finding, proposal) => found.push({ key: `${id}:${kind}:${subject}`, sequence_id: id, kind, finding, proposal, executed: false });
  const stalled = isStalled(seq);
  if (stalled === null) add('stall_check', 'counts', 'Stall check could not run: active-lead or pending-action count missing.', 'Restore the missing count before judging the sequence.');
  else if (stalled) add('stalled', 'sequence', `${seq.active_leads} active leads but no pending actions.`, 'Review the sequence steps and enrolment, then queue the next step for these leads after approval.');
  for (const [ch, state] of Object.entries(seq?.channels ?? {})) {
    if (state === 'outage') add('provider_outage', ch, `${ch} provider is having an outage.`, `Wait for the ${ch} provider to recover. Do not retry: a retry during an outage fails again.`);
    if (state === 'not_configured') add('config_fault', ch, `${ch} is enabled but not configured.`, `Configure ${ch} credentials, then re-check before any resend.`);
    if (state === 'unreachable') add('unknown', ch, `${ch} could not be checked.`, `Check ${ch} by hand; treat the sequence's health as unknown until then.`);
  }
  const outage = Object.values(seq?.channels ?? {}).includes('outage');
  if (isCount(seq?.failed_24h) && seq.failed_24h > 0 && !outage) {
    add('failed_sends', 'delivery', `${seq.failed_24h} sends failed in the last 24 hours.`, 'Review the failed sends and their errors; resending needs human approval.');
  }
  return found;
}

/** Findings not already reported in an earlier run, so a new one isn't buried under repeats. */
export function newFindings(findings, previousKeys) {
  const seen = new Set(previousKeys ?? []);
  return findings.filter((f) => !seen.has(f.key));
}
