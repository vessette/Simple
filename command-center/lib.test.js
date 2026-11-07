// Run with: node --test command-center/lib.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ENDPOINTS, RUNGS, AGENT_LADDER, agentLadderPosition, rungNumber, findRecords, formatCentral, summarizeAgent, summarizeDomain, listCapabilities,
  rungStatus, behaviourByRung, splitRequests, listGaps, missingStoryFields, summarizeCoverage,
  noToolGrantsConstraint, PANEL_SOURCES,
} from './lib.js';

const cap = (over = {}) => listCapabilities([{ capability_id: 'x', implementation_state: 'not_started', ...over }])[0];

// Same shape as one live /agent-domains-mine/sales/coverage row (2026-11-06), values trimmed.
const coverageResponse = {
  summary: { total_capabilities: 32, capabilities_with_effective_authority: 0, with_complete_path: 0, headline: 'NO coverage to report' },
  rows: [{
    capability_id: 'sales.a', capability_name: 'A', current_state: 'implemented', validation_state: 'draft',
    target_autonomy: 'autonomy:R5', effective_authority: null, release: 'autonomy:R0',
    tools: ['escalate_to_human'], tests: [], evidence: ['file.ts:1'], approver: 'Manager', blocked_by: ['reason'],
  }, {
    capability_id: 'sales.b', capability_name: 'B', current_state: 'partial', validation_state: 'draft',
    target_autonomy: 'autonomy:R2', effective_authority: null, release: 'autonomy:R0', tools: [], tests: [], evidence: [], blocked_by: [],
  }],
};

test('coverage rows map to capabilities using the live field names', () => {
  const [a, b] = listCapabilities(coverageResponse);
  assert.equal(a.name, 'A');
  assert.equal(a.implementationState, 'implemented');
  assert.equal(a.validationState, 'draft');
  assert.equal(a.targetAutonomy, 'autonomy:R5');
  assert.equal(a.effectiveAuthority, null);
  assert.equal(a.releaseBehaviour, null, 'absent release_behaviour stays null, not []');
  assert.equal(a.maxAutonomy, null, 'a target is never read as a ceiling');
  assert.equal(b.name, 'B');
});

test('missing story fields and coverage summary are reported', () => {
  assert.deepEqual(missingStoryFields(coverageResponse),
    ['classification', 'starting_autonomy', 'max_permitted_autonomy', 'human_decision', 'release_behaviour']);
  assert.deepEqual(missingStoryFields({ rows: [] }), []);
  assert.equal(summarizeCoverage(coverageResponse).withEffectiveAuthority, 0);
  assert.equal(summarizeCoverage({}), null);
});

test('rung status without a ceiling: release and draft target marked, nothing unreachable', () => {
  const [a] = listCapabilities(coverageResponse);
  const statuses = RUNGS.map((r) => rungStatus(r, a));
  assert.equal(statuses[0], 'current_release');
  assert.equal(statuses[5], 'draft_target');
  assert.equal(statuses[8], 'unreachable_platform');
  assert.ok(!statuses.includes('above_ceiling'));
});

test('gaps from live-shaped coverage: missing fields, no tests, no authority, no behaviour', () => {
  const caps = listCapabilities(coverageResponse);
  const texts = listGaps(caps, null, null, missingStoryFields(coverageResponse)).map((g) => g.text).join('\n');
  assert.match(texts, /do not carry classification/);
  assert.match(texts, /2 of 2 loaded capabilities have no tests/);
  assert.match(texts, /2 of 2 loaded capabilities returned no effective authority \(null\)/);
  assert.match(texts, /unconfirmed/, 'null is not presented as a confirmed "none"');
  assert.match(texts, /No capability row carries release_behaviour/);
  assert.doesNotMatch(texts, /Draft, not agreed by anyone: A, B/, 'all-draft is stated once by the domain count');
});

test('ladder has ten rungs R0..R9 in order', () => {
  assert.equal(RUNGS.length, 10);
  RUNGS.forEach((r, i) => assert.equal(r.id, `autonomy:R${i}`));
});

test('rungNumber parses valid levels and rejects everything else', () => {
  assert.equal(rungNumber('autonomy:R3'), 3);
  for (const bad of ['R3', 'autonomy:R10', '', null, undefined, 3]) assert.equal(rungNumber(bad), null);
});

test('findRecords handles arrays, single objects, wrapped arrays and junk', () => {
  assert.equal(findRecords([{ a: 1 }], 'a').length, 1);
  assert.equal(findRecords({ a: 1 }, 'a').length, 1);
  assert.equal(findRecords({ items: [{ a: 1 }, { a: 2 }] }, 'a').length, 2);
  assert.deepEqual(findRecords(null, 'a'), []);
  assert.deepEqual(findRecords('nope', 'a'), []);
});

// Same shape as the live GET /api/admin/agent-domains-mine response (2026-11-05), with fake values.
const agentResponse = (over = {}) => ({
  summary: { disclosure: 'These projects are PLANS.' },
  domains: [{
    domain_key: 'sales', stage: 'discovery', manager_email: 'manager@example.com',
    manager_can_reach: false, manager_blocker: 'manager_has_no_admin_login',
    agent_id: 'a1', agent_display_name: 'Agent', agent_enabled: false,
    agent_autonomy_level: 'observe', agent_autonomy_level_set_at: '2026-10-18T16:08:12.423Z',
    agent_autonomy_level_source: 'auto', agent_tools_granted: [], agent_tools_granted_count: 0, ...over,
  }],
  not_recorded: [{ field: 'agent.autonomy_level_set_by', reason: 'not stored' }],
});

test('formatCentral converts to Central time with the zone written out', () => {
  assert.equal(formatCentral('2026-10-18T16:08:12.423Z'), '11:08 AM CDT on 2026-10-18');
  assert.equal(formatCentral('2026-12-01T18:00:00Z'), '12:00 PM CST on 2026-12-01');
  assert.equal(formatCentral('nonsense'), null);
  assert.equal(formatCentral(null), null);
});

test('agent is read from the sales domain entry of the live response shape', () => {
  const a = summarizeAgent(agentResponse());
  assert.equal(a.found, true);
  assert.equal(a.name, 'Agent');
  assert.equal(a.enabled, false);
  assert.equal(a.autonomyLevel, 'observe');
  assert.equal(a.toolCount, 0);
  assert.equal(a.autonomySetByNote, 'not stored');
  assert.equal(a.managerCanReach, false);
});

test('missing domain or missing agent is reported as not found, with the reason', () => {
  assert.equal(summarizeAgent({ domains: [] }).found, false);
  assert.match(summarizeAgent(null).why, /No sales domain/);
  assert.match(summarizeAgent(agentResponse({ agent_id: null })).why, /has no agent/);
});

test('agent fields absent from the response become null, never a default', () => {
  const a = summarizeAgent({ domains: [{ domain_key: 'sales', agent_id: 'a1' }] });
  assert.equal(a.enabled, null);
  assert.equal(a.toolCount, null);
  assert.equal(a.autonomySetByNote, null);
});

test('capabilities keep the order they arrive in', () => {
  const caps = listCapabilities([
    { capability_id: 'x', name: 'b' },
    { capability_id: 'y', name: 'a' },
  ]);
  assert.deepEqual(caps.map((c) => c.name), ['b', 'a']);
});

test('rung status: R8 is unreachable by platform even under a R9 ceiling', () => {
  const c = cap({ max_permitted_autonomy: 'autonomy:R9' });
  assert.equal(rungStatus(RUNGS[8], c), 'unreachable_platform');
  assert.equal(rungStatus(RUNGS[9], c), 'ceiling');
});

test('rung status: above ceiling is unreachable, unknown ceiling stays unknown', () => {
  const c = cap({ max_permitted_autonomy: 'autonomy:R3' });
  assert.equal(rungStatus(RUNGS[2], c), 'within_ceiling');
  assert.equal(rungStatus(RUNGS[3], c), 'ceiling');
  assert.equal(rungStatus(RUNGS[4], c), 'above_ceiling');
  assert.equal(rungStatus(RUNGS[4], cap()), 'ceiling_unknown');
});

test('release behaviour groups by rung and normalises criteria to arrays', () => {
  const g = behaviourByRung(cap({ release_behaviour: [
    { rung: 'autonomy:R0', behaviour: 'b0', acceptance_criteria: ['c1', 'c2'] },
    { rung: 'autonomy:R0', behaviour: 'b0b', acceptance_criteria: 'single' },
    { behaviour: 'orphan' },
  ] }));
  assert.equal(g['autonomy:R0'].length, 2);
  assert.deepEqual(g['autonomy:R0'][1].criteria, ['single']);
  assert.equal(g['rung not stated'][0].behaviour, 'orphan');
});

test('requests: unknown shape yields null lists, not empty ones', () => {
  assert.deepEqual(splitRequests({}), { changes: null, tools: null });
  const r = splitRequests({ change_requests: [], tool_requests: [{ tool_name: 't', status: 'pending' }] });
  assert.deepEqual(r.changes, []);
  assert.equal(r.tools[0].title, 't');
});

test('gaps: R8 always listed; drafts and empty behaviour flagged', () => {
  assert.equal(listGaps(null)[0].kind, 'platform');
  assert.equal(listGaps(null)[1].kind, 'unsourced');
  const caps = listCapabilities([
    { capability_id: 'x', name: 'x', requirement_validation_state: 'draft', effective_authority: 'autonomy:R1', release_behaviour: [] },
    { capability_id: 'y', name: 'y', requirement_validation_state: 'confirmed', effective_authority: 'autonomy:R1', release_behaviour: [{ rung: 'autonomy:R0' }] },
  ]);
  const gaps = listGaps(caps);
  assert.deepEqual(gaps.map((g) => g.kind), ['platform', 'draft', 'no_behaviour']);
  assert.match(gaps[1].text, /Draft, not agreed by anyone: x\./);
  assert.match(gaps[2].text, /^x: release_behaviour\[\] is empty/);
});

test('agent ladder position: known levels in order, everything else null', () => {
  assert.deepEqual(AGENT_LADDER.map(agentLadderPosition), [0, 1, 2, 3]);
  assert.equal(agentLadderPosition('autonomy:R0'), null);
  assert.equal(agentLadderPosition(null), null);
});

test('gaps: the missing ladder mapping and an unreachable manager are named', () => {
  const texts = listGaps(null, summarizeAgent(agentResponse())).map((g) => g.text).join('\n');
  assert.match(texts, /No mapping between them exists/);
  assert.match(texts, /manager cannot reach/);
  assert.doesNotMatch(texts, /not on the agent ladder/);
  assert.match(listGaps(null, summarizeAgent(agentResponse({ agent_autonomy_level: 'autonomy:R2' })))
    .map((g) => g.text).join('\n'), /"autonomy:R2", which is not on the agent ladder/);
});

// Same shape as the live GET /agent-domains-mine/sales response (2026-11-06), trimmed.
const domainResponse = {
  title: 'Sales, Enrollment & Subscriptions', accountable_human: 'Roselyn', researched_at: '2026-10-09', agent_id: null,
  counts: { distinct_capabilities: 32, confirmed: 0, draft: 32, unique_tools_required: 34,
    complete_release_coverage: 0, outstanding_manager_decisions: 32,
    by_classification: { inherited: 6 }, by_implementation: { absent: 7 } },
};

test('domain summary reads counts; the domain route yields no capability rows', () => {
  const d = summarizeDomain(domainResponse);
  assert.equal(d.total, 32);
  assert.equal(d.draft, 32);
  assert.equal(d.toolsRequired, 34);
  assert.equal(summarizeDomain({}), null);
  assert.deepEqual(listCapabilities(domainResponse), []);
});

test('gaps: domain counts are stated with their denominator', () => {
  const texts = listGaps(null, null, summarizeDomain(domainResponse)).map((g) => g.text).join('\n');
  assert.match(texts, /32 of 32 capabilities are draft \(0 confirmed\)/);
  assert.match(texts, /32 of 32 capabilities have an outstanding manager decision/);
  assert.match(texts, /0 of 32 capabilities have complete release coverage/);
});

test('no_tool_grants: 0 tools and every capability at R0 constrains 0', () => {
  const caps = listCapabilities(coverageResponse);
  const r = noToolGrantsConstraint(caps, summarizeAgent(agentResponse()));
  assert.deepEqual(r, { count: 0, total: 2, basis: 'rule_applied' });
});

test('no_tool_grants: counts rows asking above R2 when no tools are granted', () => {
  const caps = listCapabilities([{ capability_id: 'x', release: 'autonomy:R4' }, { capability_id: 'y', release: 'autonomy:R2' }]);
  assert.equal(noToolGrantsConstraint(caps, summarizeAgent(agentResponse())).count, 1);
  assert.equal(noToolGrantsConstraint(caps, summarizeAgent(agentResponse({ agent_tools_granted: ['t'] }))).count, 0);
});

test('no_tool_grants: a returned reason wins; unknown inputs give null', () => {
  const caps = listCapabilities([{ capability_id: 'x', release: 'autonomy:R0', effective_authority_reason: 'no_tool_grants' }]);
  assert.deepEqual(noToolGrantsConstraint(caps, null), { count: 1, total: 1, basis: 'returned' });
  assert.equal(noToolGrantsConstraint(listCapabilities(coverageResponse), null), null);
  assert.equal(noToolGrantsConstraint([], summarizeAgent(agentResponse())), null);
});

test('every panel names at least one real endpoint', () => {
  for (const id of ['p-agent', 'p-caps', 'p-ladder', 'p-behaviour', 'p-requests', 'p-gaps']) {
    assert.ok(PANEL_SOURCES[id].length > 0);
    for (const k of PANEL_SOURCES[id]) assert.ok(ENDPOINTS[k].startsWith('/api/admin/'));
  }
});

test('capability endpoints are the ownership-checked -mine routes', () => {
  assert.equal(ENDPOINTS.domain, '/api/admin/agent-domains-mine/sales');
  assert.equal(ENDPOINTS.coverage, '/api/admin/agent-domains-mine/sales/coverage');
});
