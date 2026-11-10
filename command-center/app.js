// DOM wiring for the Command Center. All decisions live in lib.js; this file
// only fetches, calls lib.js, and draws. Data is written with textContent,
// never innerHTML, so nothing from the API can inject markup.
import {
  ENDPOINTS, RUNGS, AGENT_LADDER, NO_LADDER_MAPPING, agentLadderPosition, formatCentral, summarizeAgent, summarizeDomain, listCapabilities, summarizeCoverage, missingStoryFields, PLATFORM_UNREACHABLE, PANEL_SOURCES, noToolGrantsConstraint, domainRungs,
  rungStatus, behaviourByRung, splitRequests, listGaps,
} from './lib.js';

const TIMEOUT_MS = 15000;
const NOT_IN_RESPONSE = 'not in response';

// --- tiny DOM helper -------------------------------------------------------
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
const show = (v) => (v === null || v === undefined ? el('span', { class: 'missing' }, NOT_IN_RESPONSE) : String(v));
const body = (id) => document.querySelector(`#${id} .panel-body`);
function fill(id, ...nodes) { body(id).replaceChildren(...nodes); }
function notice(kind, text) { return el('p', { class: `notice ${kind}` }, text); }
function raw(label, payload) {
  return el('details', { class: 'raw' }, el('summary', {}, `Raw response: ${label}`),
    el('pre', {}, JSON.stringify(payload, null, 2)));
}

// --- network ---------------------------------------------------------------
// One attempt, explicit timeout, no retry: a human clicks Connect again.
async function fetchJson(base, path, token) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(base.replace(/\/+$/, '') + path, { headers, signal: ctrl.signal });
    if (res.status === 401) return { ok: false, error: `HTTP 401 from ${path}: not logged in. Paste a valid token from the admin dashboard (it may have expired).` };
    if (res.status === 403) {
      // The platform explains a 403 in its body; if the body is unreadable, the generic text stands.
      const b = await res.json().catch(() => null);
      const why = b?.error ? `${b.error}${b.code ? ` (${b.code})` : ''}` : 'this account is not allowed to read it.';
      return { ok: false, error: `HTTP 403 from ${path}: ${why} Ask Cory on the story page about access.` };
    }
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} from ${path}` };
    return { ok: true, data: await res.json() };
  } catch (e) {
    const why = e.name === 'AbortError' ? `timed out after ${TIMEOUT_MS / 1000}s`
      : `${e.name}: ${e.message} (often CORS, a wrong URL, or the API being unreachable)`;
    return { ok: false, error: `${path} ${why}` };
  } finally {
    clearTimeout(timer);
  }
}

// --- panels ----------------------------------------------------------------
function renderAgent(result) {
  if (!result.ok) return fill('p-agent', notice('error', result.error));
  const a = summarizeAgent(result.data);
  if (!a.found) {
    return fill('p-agent', notice('warn', `No agent. ${a.why} The endpoint answered; this is not a loading state.`),
      raw(ENDPOINTS.agent, result.data));
  }
  const row = (k, v) => el('tr', {}, el('th', {}, k), el('td', {}, v));
  fill('p-agent',
    a.disclosure ? notice('warn', a.disclosure) : null,
    el('table', { class: 'kv' },
      row('Agent', show(a.name)),
      row('Enabled', a.enabled === null ? show(null) : a.enabled ? 'Yes' : 'No'),
      row('Autonomy level (as recorded)', show(a.autonomyLevel)),
      row('Tools granted', a.toolCount === null ? show(null)
        : `${a.toolCount}${a.tools && a.tools.length ? `: ${a.tools.map((t) => (typeof t === 'string' ? t : JSON.stringify(t))).join(', ')}` : ''}`),
      row('Autonomy last set', show(formatCentral(a.autonomySetAt))),
      row('Set how', a.autonomySource === null ? show(null) : `source: ${a.autonomySource}`),
      row('Set by whom', el('span', { class: 'missing' }, a.autonomySetByNote ? `not recorded by the platform. ${a.autonomySetByNote}` : NOT_IN_RESPONSE)),
      row('Effective authority', el('span', { class: 'missing' },
        'not sourced: effectiveAuthority() in autonomyLadder.ts is not available to this page')),
      row('Stage', show(a.stage)),
      row('Accountable manager', show(a.managerEmail)),
      row('Manager can reach the agent', a.managerCanReach === null ? show(null)
        : a.managerCanReach ? 'Yes' : el('span', { class: 'human' }, `No. ${a.managerBlocker ?? ''}`)),
    ), raw(ENDPOINTS.agent, result.data));
}

function domainSummary(d) {
  const tally = (obj) => (obj && typeof obj === 'object'
    ? Object.entries(obj).map(([k, v]) => `${k} ${v}`).join(' · ') : show(null));
  const row = (k, v) => el('tr', {}, el('th', {}, k), el('td', {}, v));
  const of = (n) => (n === null ? show(null) : `${n} of ${d.total ?? NOT_IN_RESPONSE}`);
  return el('table', { class: 'kv' },
    row('Domain', show(d.title)),
    row('Accountable human', show(d.accountableHuman)),
    row('Researched', show(d.researchedAt)),
    row('Capabilities', show(d.total)),
    row('Confirmed / draft', el('span', {}, of(d.confirmed), ' confirmed, ', el('span', { class: 'badge draft' }, of(d.draft), ' draft'))),
    row('Outstanding manager decisions', of(d.outstandingDecisions)),
    row('Complete release coverage', of(d.completeReleaseCoverage)),
    row('Unique tools required', show(d.toolsRequired)),
    row('By classification', tally(d.byClassification)),
    row('By implementation', tally(d.byImplementation)));
}

const stateBadge = (v) => el('span', { class: `badge ${v === 'draft' ? 'draft' : ''}` }, v === 'draft' ? 'DRAFT, not agreed' : show(v));
const list = (items) => (items.length ? el('ul', {}, items.map((i) => el('li', {}, String(i)))) : el('p', { class: 'missing' }, 'none'));

function capabilityRow(c) {
  return el('tr', {},
    el('td', {}, el('strong', {}, show(c.name)), el('div', { class: 'note' }, show(c.id))),
    el('td', {}, show(c.implementationState)),
    el('td', {}, stateBadge(c.validationState)),
    el('td', {}, show(c.release)),
    el('td', {}, c.targetAutonomy ? `${c.targetAutonomy} (draft target)` : show(null)),
    // null is ambiguous (not computed vs no authority); say only what was returned.
    el('td', {}, c.effectiveAuthority ?? el('span', { class: 'missing' }, 'none returned (null)')),
    el('td', {}, c.tools === null ? show(null) : `${c.tools.length} needed`),
    el('td', {}, c.tests === null ? show(null) : String(c.tests.length)),
    el('td', {}, show(c.approver)),
    el('td', {}, el('details', {}, el('summary', {}, `${c.blockedBy.length} blockers · ${c.evidence.length} evidence`),
      el('h4', {}, 'Tools needed (grants are on the agent, panel 1)'), list(c.tools ?? []),
      el('h4', {}, 'Blocked by'), list(c.blockedBy),
      el('h4', {}, 'Evidence'), list(c.evidence))));
}

function renderCapabilities(caps, domain, coverage, missing, domainRes, coverageRes) {
  const parts = [];
  if (!domainRes.ok) parts.push(notice('error', domainRes.error));
  else if (domain) parts.push(el('h3', {}, 'Domain summary'), domainSummary(domain));
  else parts.push(notice('warn', 'The domain endpoint answered without a counts block.'));
  if (!coverageRes.ok) parts.push(notice('error', coverageRes.error));
  if (coverage?.headline) parts.push(notice('warn', coverage.headline));
  if (caps !== null) {
    parts.push(el('h3', {}, 'Capabilities, in the order research recorded them'));
    const total = domain?.total ?? coverage?.total;
    if (total != null) parts.push(el('p', { class: 'note' }, `Showing ${caps.length} of ${total} capabilities.`));
    if (missing.length) parts.push(el('p', { class: 'note' }, `Not in these rows, so not shown: ${missing.join(', ')}.`));
    if (caps.length === 0) parts.push(notice('warn', 'The coverage endpoint answered, but no capability records were recognised in it. See its raw response below.'));
    else {
      parts.push(el('div', { class: 'scroll' }, el('table', { class: 'grid' },
        el('thead', {}, el('tr', {}, ...['Capability', 'Implementation', 'Requirements', 'Release now', 'Target', 'Effective authority', 'Tools', 'Tests', 'Approver', 'Details']
          .map((h) => el('th', {}, h)))),
        el('tbody', {}, caps.map(capabilityRow)))));
    }
  }
  if (domainRes.ok) parts.push(raw(ENDPOINTS.domain, domainRes.data));
  if (coverageRes.ok) parts.push(raw(ENDPOINTS.coverage, coverageRes.data));
  fill('p-caps', ...parts);
}

const RUNG_LABEL = {
  unreachable_platform: 'unreachable: platform',
  above_ceiling: 'unreachable: above ceiling',
  ceiling: 'ceiling',
  within_ceiling: '',
  current_release: 'now',
  draft_target: 'target (draft)',
  ceiling_unknown: '',
};

function agentLadder(agent) {
  const pos = agent?.found ? agentLadderPosition(agent.autonomyLevel) : null;
  return [
    el('h3', {}, 'Agent ladder: where your employee is'),
    el('ol', { class: 'agent-ladder' }, AGENT_LADDER.map((lvl, i) => el('li', { class: i === pos ? 'current' : '' },
      lvl, i === pos ? el('span', { class: 'tag' }, ` ${show(agent.name)} is here`) : null))),
    pos === null ? notice('info', agent?.found
      ? `The employee's autonomy_level "${agent.autonomyLevel ?? NOT_IN_RESPONSE}" is not on this ladder.`
      : 'No agent loaded, so no position is marked.') : null,
    el('p', { class: 'note' }, NO_LADDER_MAPPING),
  ];
}

// The no_tool_grants rule, named, with how many capabilities it holds down now.
function noToolGrantsNotice(r, agent) {
  const rule = 'Rule no_tool_grants (effectiveAuthority() in autonomyLadder.ts): while an agent has no tools granted, any capability above autonomy:R2 is held at autonomy:R2. This page shows the authority the platform returns, not the level a record asks for.';
  if (r === null) return notice('info', `${rule} How many capabilities it constrains cannot be counted: the agent's tool grants or the capability rows are not loaded.`);
  const how = {
    returned: 'counted from the reason the platform returned on each row',
    rule_applied: `the agent has ${agent?.toolCount ?? 0} tools granted, and this counts rows whose current release is above autonomy:R2`,
    tools_granted: `the agent has ${agent?.toolCount} tools granted, so the rule does not apply`,
  }[r.basis];
  const words = r.count === 0
    ? `It currently constrains none of the ${r.total} capabilities (0 of ${r.total})`
    : `It currently constrains ${r.count} of ${r.total} capabilities`;
  return el('div', {}, el('p', {}, rule), el('p', { class: 'notice warn' }, `${words}: ${how}.`));
}

function renderLadder(agent, caps, rungs = null) {
  const wording = rungs
    ? el('p', { class: 'note' }, `Rung wording as returned in releases[] by GET ${ENDPOINTS.domain}.`)
    : el('p', { class: 'note' }, 'Rung wording from the STORY-000 brief: the domain route did not return all ten autonomy releases.');
  rungs = rungs ?? RUNGS;
  const meanings = el('table', { class: 'grid' }, el('tbody', {}, rungs.map((r) =>
    el('tr', {}, el('td', {}, r.id), el('td', {}, r.meaning), el('td', { class: `rung ${PLATFORM_UNREACHABLE[r.id] ? 'unreachable_platform' : ''}` },
      PLATFORM_UNREACHABLE[r.id] ?? '')))));
  const parts = [...agentLadder(agent), el('h3', {}, 'Capability ladder (autonomy:R0 to R9)'), wording, meanings];
  if (caps === null) parts.push(notice('info', 'Per-capability positions are not drawn: capability records are not loaded.'));
  else if (caps.length) {
    parts.push(el('h3', {}, 'Effective authority'), noToolGrantsNotice(noToolGrantsConstraint(caps, agent), agent));
    const head = el('tr', {}, ...['Capability', 'Asks for now (release)', 'Effective authority (returned)', 'Ceiling'].map((h) => el('th', {}, h)),
      ...rungs.map((r) => el('th', { title: r.meaning }, `R${r.n}`)));
    const rows = caps.map((c) => el('tr', {},
      el('td', {}, show(c.name)),
      el('td', {}, show(c.release)),
      el('td', {}, c.effectiveAuthority ?? el('span', { class: 'missing' }, 'none returned (null)')),
      el('td', {}, c.maxAutonomy ?? el('span', { class: 'missing' }, 'not recorded')),
      ...rungs.map((r) => {
        const s = rungStatus(r, c);
        return el('td', { class: `rung ${s}` }, RUNG_LABEL[s]);
      })));
    parts.push(el('h3', {}, 'Where each capability is, and where research proposes it go'),
      el('p', { class: 'note' }, 'Each ceiling would be marked at the rung a capability stops at. No ceiling (max_permitted_autonomy) is recorded for any capability, so each row says "not recorded" and no rung is drawn as unreachable except R8. A draft target is a proposal, not a ceiling.'),
      el('div', { class: 'scroll' }, el('table', { class: 'grid ladder' }, el('thead', {}, head), el('tbody', {}, rows))));
  }
  const reasons = (caps ?? []).filter((c) => c.maxAutonomy);
  if (reasons.length) {
    parts.push(el('h3', {}, 'Why each ceiling is where it is'), el('ul', {}, reasons.map((c) =>
      el('li', {}, el('strong', {}, `${show(c.name)} stops at ${c.maxAutonomy}: `),
        c.ceilingReason ?? el('span', { class: 'missing' }, 'reason not in response')))));
  }
  fill('p-ladder', ...parts);
}

function renderBehaviour(caps) {
  if (caps === null) return fill('p-behaviour', notice('info', 'Not connected. Release behaviour comes from the capability records.'));
  if (caps.length === 0) return fill('p-behaviour', notice('warn', 'No capability records, so no release behaviour.'));
  if (caps.every((c) => c.releaseBehaviour === null)) {
    return fill('p-behaviour', notice('warn', 'Not sourced. None of the capability rows carries release_behaviour[], so no rung has a written behaviour or acceptance criteria here. Nothing is filled in by this page.'));
  }
  fill('p-behaviour', ...caps.map((c) => {
    const groups = behaviourByRung(c);
    const ids = Object.keys(groups);
    return el('details', { class: 'cap' }, el('summary', {}, show(c.name), c.releaseBehaviour === null ? ' (field not in response)' : ` (${c.releaseBehaviour.length} entries)`),
      ids.length === 0 ? notice('warn', 'release_behaviour[] is empty: no next rung is defined.')
        : ids.map((id) => el('div', { class: 'rung-block' }, el('h4', {}, id), groups[id].map((b) =>
          el('div', {}, el('p', {}, show(b.behaviour)),
            b.criteria.length ? el('ul', {}, b.criteria.map((k) => el('li', {}, typeof k === 'string' ? k : JSON.stringify(k))))
              : el('p', { class: 'missing' }, 'no acceptance criteria in response'))))));
  }));
}

function renderRequests(result) {
  if (!result.ok) return fill('p-requests', notice('error', result.error));
  const { changes, tools } = splitRequests(result.data);
  const table = (title, list, note) => [el('h3', {}, title), note ? el('p', { class: 'note' }, note) : null,
    list === null ? notice('warn', `No ${title.toLowerCase()} list found in the response shape. See the raw response below.`)
      : list.length === 0 ? notice('warn', `The endpoint returned an empty list: no ${title.toLowerCase()} have been filed.`)
        : el('div', { class: 'scroll' }, el('table', { class: 'grid' },
          el('thead', {}, el('tr', {}, ...['Request', 'Status', 'Proposed by', 'Decided by', 'Decided at'].map((h) => el('th', {}, h)))),
          el('tbody', {}, list.map((r) => el('tr', {}, ...[r.title, r.status, r.proposedBy, r.decidedBy, r.decidedAt].map((v) => el('td', {}, show(v))))))))];
  fill('p-requests',
    ...table('Change requests', changes),
    ...table('Tool requests', tools, 'Filing a tool request grants nothing. A tool is granted only when a human approves it.'),
    raw(ENDPOINTS.requests, result.data));
}

function renderGaps(caps, agent = null, domain = null, missing = []) {
  fill('p-gaps', el('ul', { class: 'gaps' }, listGaps(caps, agent, domain, missing).map((g) => el('li', { class: g.kind }, g.text))),
    el('p', { class: 'note' }, `Anything this page cannot source from a real endpoint is shown as "${NOT_IN_RESPONSE}" or "not sourced", never with an example value.`));
}

function renderDisconnected() {
  for (const id of ['p-agent', 'p-caps', 'p-requests']) fill(id, notice('info', 'Not connected. Enter the API base URL above and press Connect.'));
  renderLadder(null, null);
  renderBehaviour(null);
  renderGaps(null);
}

// --- entry -----------------------------------------------------------------
async function connect(event) {
  event.preventDefault();
  const base = document.getElementById('base').value.trim();
  const token = document.getElementById('token').value.trim();
  if (!base) return;
  const status = document.getElementById('status');
  status.textContent = 'Fetching…';
  // Loading has its own look (dashed, aria-busy) so it is never mistaken for an empty answer.
  for (const [id, keys] of Object.entries(PANEL_SOURCES)) {
    const node = notice('loading', `Loading from ${keys.map((k) => ENDPOINTS[k]).join(' and ')}…`);
    node.setAttribute('aria-busy', 'true');
    fill(id, node);
  }

  const [agentRes, domainRes, coverageRes, reqRes] = await Promise.all(
    [ENDPOINTS.agent, ENDPOINTS.domain, ENDPOINTS.coverage, ENDPOINTS.requests].map((p) => fetchJson(base, p, token)));

  const agent = agentRes.ok ? summarizeAgent(agentRes.data) : null;
  const domain = domainRes.ok ? summarizeDomain(domainRes.data) : null;
  const caps = coverageRes.ok ? listCapabilities(coverageRes.data) : null;
  const coverage = coverageRes.ok ? summarizeCoverage(coverageRes.data) : null;
  const missing = coverageRes.ok ? missingStoryFields(coverageRes.data) : [];
  renderAgent(agentRes);
  renderCapabilities(caps, domain, coverage, missing, domainRes, coverageRes);
  renderLadder(agent, caps, domainRes.ok ? domainRungs(domainRes.data) : null);
  renderBehaviour(caps);
  renderRequests(reqRes);
  renderGaps(caps, agent, domain, missing);
  const failed = [agentRes, domainRes, coverageRes, reqRes].filter((r) => !r.ok).length;
  status.textContent = failed ? `${4 - failed} of 4 endpoints answered.` : 'All 4 endpoints answered.';
}

function labelSources() {
  for (const [id, keys] of Object.entries(PANEL_SOURCES)) {
    document.querySelector(`#${id} .src`).textContent = `Reads: ${keys.map((k) => `GET ${ENDPOINTS[k]}`).join(' · ')}`;
  }
}

document.getElementById('connect').addEventListener('submit', connect);
labelSources();
renderDisconnected();
