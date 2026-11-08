// Pure logic for the Command Center. No DOM, no network: everything here is
// unit-tested in lib.test.js. The page must never invent data, so every
// helper returns null (rendered as "not in response") instead of a guess.

export const DOMAIN = 'sales';

export const ENDPOINTS = {
  agent: '/api/admin/agent-domains-mine',
  // The -mine routes refuse any domain that is not the caller's own; the plain
  // /agent-domains/:key routes need the program section and check no ownership.
  domain: `/api/admin/agent-domains-mine/${DOMAIN}`,
  coverage: `/api/admin/agent-domains-mine/${DOMAIN}/coverage`,
  requests: '/api/admin/agent-domain-change-requests-mine',
};

// The owner's own words, copied verbatim from the STORY-000 brief.
export const RUNGS = [
  ['autonomy:R0', 'Define the workflow, requirements, risks and human decisions.'],
  ['autonomy:R1', 'Prepare isolated development, fixtures and baseline tests.'],
  ['autonomy:R2', 'Answer questions using approved knowledge and records.'],
  ['autonomy:R3', 'Perform approved, user-initiated sandbox tool operations.'],
  ['autonomy:R4', 'Execute and verify stateful, multi-step sandbox tasks.'],
  ['autonomy:R5', 'Evaluate in shadow mode against approved reference outcomes.'],
  ['autonomy:R6', 'Conduct a separately approved, supervised production pilot.'],
  ['autonomy:R7', 'Automate only explicitly authorized action classes within limits.'],
  ['autonomy:R8', 'Coordinate necessary, authorized handoffs with other agents.'],
  ['autonomy:R9', 'Demonstrate reliable operation, monitoring, recovery and ownership.'],
].map(([id, meaning], n) => ({ id, n, meaning }));

// Unreachable by platform fact, not by anyone's choice.
export const PLATFORM_UNREACHABLE = {
  'autonomy:R8': 'Coordinated handoff between two agents does not exist in this platform today.',
};

// The AGENT ladder, a separate ladder from R0..R9 above. Nothing in the
// platform maps one onto the other (promotionSecondSignature.ts says so in its
// header), so an agent is never placed on R0..R9 and a capability never here.
export const AGENT_LADDER = ['observe', 'suggest', 'act_audited', 'communicate'];
export const NO_LADDER_MAPPING = 'The agent ladder and the R0-R9 capability ladder are separate. No mapping between them exists in the platform (promotionSecondSignature.ts), so the employee is not placed on R0-R9.';

/** "suggest" -> 1. Values not on the agent ladder -> null. */
export function agentLadderPosition(level) {
  const i = AGENT_LADDER.indexOf(level);
  return i === -1 ? null : i;
}

/** "autonomy:R3" -> 3. Anything else -> null. */
export function rungNumber(level) {
  const m = typeof level === 'string' ? /^autonomy:R(\d)$/.exec(level.trim()) : null;
  return m ? Number(m[1]) : null;
}

/**
 * The response shapes are not documented in this folder, so records are found
 * by a field they must carry: the payload itself, an array, or the first array
 * property whose items carry that field.
 */
export function findRecords(payload, field) {
  if (Array.isArray(payload)) return payload.filter((r) => r && typeof r === 'object');
  if (!payload || typeof payload !== 'object') return [];
  if (field in payload) return [payload];
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.some((r) => r && typeof r === 'object' && field in r)) {
      return value.filter((r) => r && typeof r === 'object');
    }
  }
  return [];
}

function pick(obj, ...keys) {
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  return null;
}

/** ISO timestamp -> "11:08 AM CDT on 2026-10-18". Invalid input -> null. */
export function formatCentral(iso) {
  const d = typeof iso === 'string' ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).formatToParts(d).map(({ type, value }) => [type, value]));
  return `${p.hour}:${p.minute} ${p.dayPeriod} ${p.timeZoneName} on ${p.year}-${p.month}-${p.day}`;
}

/**
 * Panel 1, from GET /api/admin/agent-domains-mine. The response lists
 * domains[]; the agent's fields sit on the sales entry with an agent_ prefix.
 * Returns { found:false, why } when there is no sales domain or no agent on it.
 */
export function summarizeAgent(payload) {
  const domains = payload && Array.isArray(payload.domains) ? payload.domains : [];
  const d = domains.find((x) => x && x.domain_key === DOMAIN);
  if (!d) return { found: false, why: `No ${DOMAIN} domain is linked to this login.` };
  if (!d.agent_id) return { found: false, why: `The ${DOMAIN} domain exists but has no agent.` };
  const notRecorded = Object.fromEntries((Array.isArray(payload.not_recorded) ? payload.not_recorded : [])
    .map((n) => [n.field, n.reason]));
  const tools = Array.isArray(d.agent_tools_granted) ? d.agent_tools_granted : null;
  return {
    found: true,
    name: pick(d, 'agent_display_name'),
    enabled: typeof d.agent_enabled === 'boolean' ? d.agent_enabled : null,
    autonomyLevel: pick(d, 'agent_autonomy_level'),
    autonomySource: pick(d, 'agent_autonomy_level_source'),
    autonomySetAt: pick(d, 'agent_autonomy_level_set_at'),
    autonomySetByNote: notRecorded['agent.autonomy_level_set_by'] ?? null,
    tools,
    toolCount: tools ? tools.length : pick(d, 'agent_tools_granted_count'),
    stage: pick(d, 'stage'),
    managerEmail: pick(d, 'manager_email'),
    managerCanReach: typeof d.manager_can_reach === 'boolean' ? d.manager_can_reach : null,
    managerBlocker: pick(d, 'manager_blocker'),
    disclosure: pick(payload.summary, 'disclosure'),
  };
}

/**
 * Panel 2 header, from GET /agent-domains-mine/sales. This route carries
 * domain counts only, no capability records (those come from /coverage).
 * Its agent_id is a derived value the route does not check against the live
 * database, so it is deliberately not read here; panel 1 owns the agent.
 */
export function summarizeDomain(payload) {
  const c = payload && typeof payload.counts === 'object' && payload.counts ? payload.counts : null;
  if (!c) return null;
  return {
    title: pick(payload, 'title'),
    accountableHuman: pick(payload, 'accountable_human'),
    researchedAt: pick(payload, 'researched_at'),
    total: pick(c, 'distinct_capabilities'),
    confirmed: pick(c, 'confirmed'),
    draft: pick(c, 'draft'),
    completeReleaseCoverage: pick(c, 'complete_release_coverage'),
    outstandingDecisions: pick(c, 'outstanding_manager_decisions'),
    toolsRequired: pick(c, 'unique_tools_required'),
    byClassification: pick(c, 'by_classification'),
    byImplementation: pick(c, 'by_implementation'),
  };
}

/** Panel 2. Capabilities in the order research recorded them; no sorting. */
// Read from GET /agent-domains-mine/sales/coverage rows[] (live shape,
// 2026-11-06). The story's names come first where both exist. A field the row
// does not carry stays null; releaseBehaviour is null when absent, [] when empty.
export function listCapabilities(payload) {
  const arr = (v) => (Array.isArray(v) ? v : null);
  return findRecords(payload, 'capability_id').map((c) => ({
    id: pick(c, 'capability_id'),
    name: pick(c, 'name', 'capability_name', 'capability_id'),
    classification: pick(c, 'classification'),
    implementationState: pick(c, 'implementation_state', 'current_state'),
    validationState: pick(c, 'requirement_validation_state', 'validation_state'),
    release: pick(c, 'release'),
    targetAutonomy: pick(c, 'target_autonomy'),
    startingAutonomy: pick(c, 'starting_autonomy'),
    maxAutonomy: pick(c, 'max_permitted_autonomy'),
    ceilingReason: pick(c, 'max_permitted_autonomy_reason', 'ceiling_reason', 'autonomy_ceiling_reason'),
    effectiveAuthority: pick(c, 'effective_authority'),
    effectiveAuthorityReason: pick(c, 'effective_authority_reason', 'authority_reason'),
    humanDecision: c.human_decision === true,
    approver: pick(c, 'approver'),
    tools: arr(c.tools),
    tests: arr(c.tests),
    evidence: arr(c.evidence) ?? [],
    blockedBy: arr(c.blocked_by) ?? [],
    releaseBehaviour: arr(c.release_behaviour),
  }));
}

// Fields STORY-000 names for panel 2/4 that the platform may not send.
export const STORY_FIELDS = ['classification', 'starting_autonomy', 'max_permitted_autonomy', 'human_decision', 'release_behaviour'];

/** STORY_FIELDS that no capability row carries at all. */
export function missingStoryFields(payload) {
  const rows = findRecords(payload, 'capability_id');
  if (rows.length === 0) return [];
  return STORY_FIELDS.filter((f) => !rows.some((r) => f in r));
}

/** Coverage summary block: the platform's own headline and counts. */
export function summarizeCoverage(payload) {
  const s = payload && typeof payload.summary === 'object' && payload.summary ? payload.summary : null;
  if (!s) return null;
  return {
    headline: pick(s, 'headline'),
    total: pick(s, 'total_capabilities'),
    withEffectiveAuthority: pick(s, 'capabilities_with_effective_authority'),
    withCompletePath: pick(s, 'with_complete_path'),
  };
}

/**
 * Panel 3: how a rung is drawn for one capability.
 * 'unreachable_platform' beats everything: no ceiling can make R8 reachable.
 */
export function rungStatus(rung, capability) {
  if (PLATFORM_UNREACHABLE[rung.id]) return 'unreachable_platform';
  const ceiling = rungNumber(capability.maxAutonomy);
  if (ceiling !== null) {
    if (rung.n > ceiling) return 'above_ceiling';
    if (rung.n === ceiling) return 'ceiling';
    return 'within_ceiling';
  }
  // No ceiling on record. A draft target is not a ceiling, so nothing above
  // it is drawn as unreachable; only where it is now and where it aims.
  if (rung.n === rungNumber(capability.release)) return 'current_release';
  if (rung.n === rungNumber(capability.targetAutonomy)) return 'draft_target';
  return 'ceiling_unknown';
}

// Which endpoints each panel reads, so every panel can name its source.
export const PANEL_SOURCES = {
  'p-agent': ['agent'],
  'p-caps': ['domain', 'coverage'],
  'p-ladder': ['agent', 'coverage'],
  'p-behaviour': ['coverage'],
  'p-requests': ['requests'],
  'p-gaps': ['agent', 'domain', 'coverage'],
};

/**
 * The no_tool_grants rule (effectiveAuthority() in autonomyLadder.ts): with no
 * tools granted, anything above autonomy:R2 is held at R2. If the platform
 * returns a reason per row, that is counted; otherwise the documented rule is
 * applied to what each row asks for now (its release). Unknown -> null.
 */
export function noToolGrantsConstraint(capabilities, agent) {
  if (!capabilities || capabilities.length === 0) return null;
  const total = capabilities.length;
  if (capabilities.some((c) => c.effectiveAuthorityReason !== null)) {
    return { count: capabilities.filter((c) => c.effectiveAuthorityReason === 'no_tool_grants').length, total, basis: 'returned' };
  }
  if (!agent?.found || agent.toolCount === null) return null;
  if (agent.toolCount > 0) return { count: 0, total, basis: 'tools_granted' };
  const above = capabilities.filter((c) => (rungNumber(c.release) ?? -1) > 2).length;
  return { count: above, total, basis: 'rule_applied' };
}

/** Panel 4: release_behaviour entries grouped under their rung id. */
export function behaviourByRung(capability) {
  const groups = {};
  for (const entry of capability.releaseBehaviour ?? []) {
    const rung = pick(entry, 'rung', 'autonomy_level', 'level') || 'rung not stated';
    (groups[rung] ||= []).push({
      behaviour: pick(entry, 'behaviour', 'behavior'),
      criteria: Array.isArray(entry.acceptance_criteria) ? entry.acceptance_criteria
        : entry.acceptance_criteria ? [entry.acceptance_criteria] : [],
    });
  }
  return groups;
}

/** Panel 5: change requests and tool requests, kept separate. */
export function splitRequests(payload) {
  const norm = (r) => ({
    title: pick(r, 'title', 'summary', 'tool_name', 'capability_name', 'id'),
    status: pick(r, 'status'),
    proposedBy: pick(r, 'proposed_by', 'requested_by', 'created_by'),
    decidedBy: pick(r, 'decided_by', 'reviewed_by'),
    decidedAt: pick(r, 'decided_at', 'reviewed_at'),
  });
  const list = (v) => (Array.isArray(v) ? v.map(norm) : null);
  if (!payload || typeof payload !== 'object') return { changes: null, tools: null };
  return {
    changes: list(pick(payload, 'change_requests', 'changeRequests')),
    tools: list(pick(payload, 'tool_requests', 'toolRequests')),
  };
}

/** Panel 6: the gaps. Always includes R8; the rest depend on loaded data. */
export function listGaps(capabilities, agent = null, domain = null, missingFields = []) {
  const gaps = [{ kind: 'platform', text: `autonomy:R8 is unreachable by fact: ${PLATFORM_UNREACHABLE['autonomy:R8']}` }];
  if (missingFields.length) {
    gaps.push({ kind: 'unsourced', text: `The capability rows do not carry ${missingFields.join(', ')}. The story asks for them; this page leaves them blank rather than inferring them.` });
  }
  if (agent?.found) {
    gaps.push({ kind: 'platform', text: NO_LADDER_MAPPING });
    if (agent.autonomyLevel !== null && agentLadderPosition(agent.autonomyLevel) === null) {
      gaps.push({ kind: 'unsourced', text: `The employee's autonomy_level is "${agent.autonomyLevel}", which is not on the agent ladder (${AGENT_LADDER.join(', ')}).` });
    }
    if (agent.managerCanReach === false) {
      gaps.push({ kind: 'draft', text: `The accountable manager cannot reach this employee: ${agent.managerBlocker ?? 'reason not in response'}` });
    }
  }
  if (domain?.total !== null && domain?.total !== undefined) {
    const of = `of ${domain.total}`;
    if (domain.draft) gaps.push({ kind: 'draft', text: `${domain.draft} ${of} capabilities are draft (${domain.confirmed ?? 0} confirmed): not agreed by anyone yet.` });
    if (domain.outstandingDecisions) gaps.push({ kind: 'draft', text: `${domain.outstandingDecisions} ${of} capabilities have an outstanding manager decision.` });
    if (domain.completeReleaseCoverage !== null) gaps.push({ kind: 'no_behaviour', text: `${domain.completeReleaseCoverage} ${of} capabilities have complete release coverage.` });
  }
  if (capabilities === null) {
    gaps.push({ kind: 'unsourced', text: 'Capability records are not loaded, so individual draft requirements and undefined next rungs cannot be named.' });
    return gaps;
  }
  const n = capabilities.length;
  const drafts = capabilities.filter((c) => c.validationState === 'draft').map((c) => c.name ?? '(unnamed capability)');
  // When every row is draft the domain count above already says so; naming 32 rows adds nothing.
  if (drafts.length && drafts.length < n) gaps.push({ kind: 'draft', text: `Draft, not agreed by anyone: ${drafts.join(', ')}.` });
  const noTests = capabilities.filter((c) => Array.isArray(c.tests) && c.tests.length === 0).length;
  if (noTests) gaps.push({ kind: 'no_behaviour', text: `${noTests} of ${n} loaded capabilities have no tests recorded.` });
  const noAuthority = capabilities.filter((c) => c.effectiveAuthority === null).length;
  if (noAuthority) gaps.push({ kind: 'unsourced', text: `${noAuthority} of ${n} loaded capabilities returned no effective authority (null). Whether null means "none" or "not computed" is unconfirmed. Either way, a target rung is not authority.` });
  if (capabilities.every((c) => c.releaseBehaviour === null)) {
    gaps.push({ kind: 'no_behaviour', text: 'No capability row carries release_behaviour[], so no rung has a defined behaviour or acceptance criteria on this page.' });
  } else {
    for (const c of capabilities) {
      if (c.releaseBehaviour && c.releaseBehaviour.length === 0) gaps.push({ kind: 'no_behaviour', text: `${c.name ?? '(unnamed capability)'}: release_behaviour[] is empty, so no next rung is defined. Defining it is the first piece of work.` });
    }
  }
  return gaps;
}
