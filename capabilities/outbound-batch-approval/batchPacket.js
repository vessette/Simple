// Outbound enrolment batch prepared for human approval, autonomy:R1.
// Capability: sales.outbound_batch_preparation_for_approval.
//
// R1 is "prepare isolated development, fixtures and baseline tests": packet assembly
// runs against committed fixtures only. There is no database, no network call, no
// enrolment and no send here. The packet is a document that waits for a named person.
//
// It replaces the selection half of the platform's runWeeklyLeadEnrollmentAgent()
// (ColaberryEnterprise_AI_LeadershipAccelerator @ 109820a,
// backend/src/services/agents/apolloLeadIntelligenceAgent.ts:94-242): pending
// recommendations at or above a fit threshold, best first, up to a cap. What it does
// NOT carry over:
//   1. bulkApproveRecommendations(ids, null) (:242): approval with no named approver.
//   2. The fallback (:185-207) that searches, imports and enrols new prospects in one
//      step when no recommendation qualifies. Here an empty batch is an empty packet.
//   3. Selection with no unsubscribe or suppression check. Here suppression state is
//      required, and the packet refuses to build without it.

/** A prospect's identity for de-duplication: the email if there is one, else the id. */
export function prospectKey(rec) {
  const email = typeof rec?.email === 'string' ? rec.email.trim().toLowerCase() : '';
  return email || `id:${rec?.prospect_id ?? rec?.id}`;
}

function validate({ recommendations, threshold, cap, approver, sequence, suppressed }) {
  if (!Array.isArray(recommendations)) throw new TypeError('recommendations must be an array.');
  if (typeof threshold !== 'number' || !(threshold >= 0 && threshold <= 100)) throw new RangeError('threshold must be a fit score from 0 to 100.');
  if (!Number.isInteger(cap) || cap < 1) throw new RangeError('cap must be a whole number of at least 1.');
  if (typeof approver !== 'string' || !approver.trim()) throw new RangeError('A packet must name the person who approves it.');
  if (typeof sequence !== 'string' || !sequence.trim()) throw new RangeError('A packet must name the proposed sequence.');
  if (!(suppressed instanceof Set)) throw new TypeError('Suppression state is required (a Set of emails or ids); without it nobody can be safely included.');
}

function exclusion(rec, { threshold, suppressed, inOtherPackets }) {
  if (rec.status !== 'pending') return `status is ${rec.status ?? 'missing'}, not pending`;
  if (rec.unsubscribed === true) return 'unsubscribed';
  const key = prospectKey(rec);
  if (suppressed.has(key) || suppressed.has(rec.email) || suppressed.has(rec.prospect_id ?? rec.id)) return 'suppressed';
  if (inOtherPackets.has(key)) return 'already in another open packet';
  if (typeof rec.fit_score !== 'number' || !Number.isFinite(rec.fit_score)) return 'no fit score, so it cannot be compared with the threshold';
  if (rec.fit_score < threshold) return `fit score ${rec.fit_score} is below the threshold of ${threshold}`;
  return null;
}

/**
 * Build one approval packet. The volume is the real number of qualifying prospects,
 * up to the cap, and never padded to reach it.
 */
export function buildPacket(input) {
  validate(input);
  const { recommendations, threshold, cap, approver, sequence, suppressed } = input;
  const inOtherPackets = new Set((input.inOtherPackets ?? []).map((k) => String(k).toLowerCase()));
  const excluded = [];
  const best = new Map();
  for (const rec of recommendations) {
    const why = exclusion(rec, { threshold, suppressed, inOtherPackets });
    if (why) { excluded.push({ id: rec.id ?? null, reason: why }); continue; }
    const key = prospectKey(rec);
    const held = best.get(key);
    if (!held) { best.set(key, rec); continue; }
    const [keep, drop] = rec.fit_score > held.fit_score ? [rec, held] : [held, rec];
    best.set(key, keep);
    excluded.push({ id: drop.id ?? null, reason: `duplicate of recommendation ${keep.id} for the same prospect` });
  }
  const qualifying = [...best.values()].sort((a, b) => b.fit_score - a.fit_score || String(a.id).localeCompare(String(b.id)));
  const chosen = qualifying.slice(0, cap);
  for (const rec of qualifying.slice(cap)) excluded.push({ id: rec.id ?? null, reason: `over the cap of ${cap}` });
  const prospects = chosen.map((r) => ({ id: r.id, prospect_key: prospectKey(r), name: r.name ?? null, company: r.company ?? null, fit_score: r.fit_score }));
  return {
    packet_key: `${approver.trim()}|${sequence.trim()}|${prospects.map((p) => p.prospect_key).sort().join(',')}`,
    approver: approver.trim(),
    proposed_sequence: sequence.trim(),
    threshold, cap,
    qualifying_count: qualifying.length,
    volume: prospects.length,
    shortfall: Math.max(0, cap - prospects.length),
    prospects, excluded,
    approval: { state: 'awaiting_approval', approver: approver.trim(), expires_at: null },
    enrolled: false, sent: false,
    summary: `${prospects.length} prospect${prospects.length === 1 ? '' : 's'} at or above ${threshold}`
      + (prospects.length < cap ? `, ${cap - prospects.length} short of the cap of ${cap}; the batch is not padded.` : `, at the cap of ${cap}.`)
      + ` Nothing is enrolled or sent until ${approver.trim()} approves.`,
  };
}

/**
 * The approval state at any time. Time alone never approves a packet: there is no expiry,
 * and only an explicit decision by the named approver changes the state.
 */
export function approvalState(packet, decision) {
  if (!decision) return packet.approval.state;
  if (decision.by !== packet.approver) return packet.approval.state;
  if (decision.outcome === 'approved' || decision.outcome === 'rejected') return decision.outcome;
  return packet.approval.state;
}
