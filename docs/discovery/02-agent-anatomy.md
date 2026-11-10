# Agent anatomy: the nine elements, mapped onto the sales agent

**Story:** `sales.RESEARCH-2-AGENT-ANATOMY` · **Release:** Discovery and validation
**Accountable human:** Roselyn · **Prepared by:** Victoria Spencer-Auber · **Date:** 2026-11-10
**Status:** draft for Roselyn's review. Nothing in this document enables, grants or changes an agent.

All platform citations refer to the public repository
`ColaberryIntern/ColaberryEnterprise_AI_LeadershipAccelerator` at commit `949fe19`
(11:36 AM CST on 2026-11-10). Paths are relative to `backend/src/` unless they start with `docs/`.
Live figures come from `GET /api/admin/agent-domains-mine` and `/agent-domains-mine/sales/coverage`,
read in November 2026.

---

## Headline: 2 of the 9 elements are unknown

| Element | State for this domain's agent today |
|---|---|
| 1. Reasoning | **Unknown** |
| 2. Memory | **Unknown** |
| 3. Inputs | Draft only |
| 4. Communication | Exists, but Roselyn can't reach it |
| 5. Tools | Missing |
| 6. Procedures | Draft only |
| 7. Coordination | Missing: does not exist in the platform |
| 8. Safeguards | Exists (platform-wide) |
| 9. Verification | Missing |

What the labels mean:
- **Unknown:** I could find no evidence either way.
- **Missing:** confirmed absent.
- **Draft only:** written down in the research matrix, but not approved and not used by any agent.

---

## Which agent this is

The story brief says no agent exists for this domain yet. The evidence is split:

- **The repository has none.** The sales domain row has `agent_id: null` (`services/agentDomain/agentDomainRegistry.ts:190`). The name "Vick" appears nowhere in the code.
- **The live platform has one.** An agent record named **Vick** exists. It is not enabled, its agent level is `observe`, it has 0 tools granted, and its level was set automatically at 11:08 AM CDT on 2026-10-18 (`/agent-domains-mine`). The domain route says its own `agent_id` is a derived value it does not check against the database.

So Vick is a database record with no definition in the code. The elements below describe what would have to exist for Vick to do any of the 32 capabilities.

---

## 1. Reasoning

How the agent decides what to say or do.

- **Exists today (platform):**
  - Agents on this platform reason through a model prompt built by `buildAgentSystemPrompt()` (`services/agentBlueprint/agentSystemPrompt.ts:98`). That prompt layers in the agent's role charter (`:111`), its manager's directives (`:2`) and its approved memories (`:121`), plus a shared safety block (`:4`).
  - The Talk conversation uses the model set in `AI_MODEL`, defaulting to `gpt-4o-mini` (`services/agentManagerConversationService.ts:63`, `:504-506`).
  - Each agent record has a `system_prompt` field (`models/AiAgent.ts:343`).
- **Exists today (Vick):** **Unknown.** None of the routes this project can read return Vick's `system_prompt` or role charter.
- **Missing:**
  - Vick's role charter, if there isn't one. A charter is an `AgentRoleCharter` row, holding a mission, responsibilities, boundaries and what Vick may do alone, with approval, or never (`models/AgentRoleCharter.ts:76-89`).
  - A decision on which model Vick uses.
- **First honest version:** a role charter whose responsibilities come from `docs/discovery/03-role-and-da-transition.md` (the "splits" and "transitions" rows), whose `authority_forbidden` list holds the human-only items from that document, and which Roselyn approves.

## 2. Memory

What the agent carries from one conversation to the next.

- **Exists today (platform):**
  - `AgentMemoryProposal`: an agent proposes something it learned, attaches evidence, and a human approves it (`models/AgentMemoryProposal.ts:1-6`).
  - At runtime only **approved** memories are read back (`services/agentMemoryProposalService.ts:132-135`), and they're injected into the prompt (`agentSystemPrompt.ts:121`).
  - The platform's own audit warns against approval flags nobody checks (`docs/architecture/ai-workforce-management/MEMORY_MAP.md:41-45`).
- **Exists today (Vick):** **Unknown.** I can't see whether Vick has any memory proposals.
- **Missing:** any decision on what a sales agent should remember. For example: a lead's warm or cold history, or why a lead didn't convert.
- **First honest version:** nothing remembered automatically. Vick proposes a memory only for a lead outcome Roselyn has confirmed, and she approves each one. Leads' personal details stay in the CRM, not in agent memory.

## 3. Inputs

What the agent reads.

- **Exists today:** inputs are written down **per capability** in the research matrix. Every one of the 32 capabilities has an `inputs` field (`services/agentDomain/capabilities/sales.json`). All 32 are `draft` (`/coverage`, `validation_state`).
- **Exists today (Vick):** Vick reads nothing. It has 0 tools, and an agent reads data only through a tool (element 5).
- **Missing:**
  - Approved inputs. Roselyn has validated none of the 32.
  - Any input from the systems Roselyn actually uses: GoHighLevel (her CRM) and Zoom. Neither appears in the coverage data, so whether any connection exists is **unknown**.
  - One agreed price. The coverage data records four copies that disagree.
- **First honest version:** read-only access to the platform's own lead and enrollment records (the `query_lead_conversion_metrics` tool exists, `services/reese/agentToolCapabilities.ts:231-234`), plus an approved, single-version program and price sheet.

## 4. Communication

How the agent talks to people.

- **Exists today (platform):**
  - **Talk**, a continuing thread between one manager and one agent (`models/AgentManagerConversation.ts:1-6`; `services/agentManagerConversationService.ts`).
  - **Email** can technically be reused (`docs/architecture/ai-workforce-management/COMMUNICATION_MAP.md:49-59`).
  - One agent, Reese, already contacts people on its own initiative, with safety caps (`COMMUNICATION_MAP.md:35-38`).
- **Exists today (Vick):** a Talk thread is possible, but **Roselyn can't open it**: `manager_has_no_admin_login` (`agentDomainRegistry.ts:82-84`, `:188-189`).
- **Missing:**
  - Roselyn's admin login.
  - Any permission to send to leads: `live_email` is denied by default for every agent (`services/delivery/execution/executionPolicy.ts:33-42`).
  - Text messaging and calls: no evidence in the coverage data.
  - Per-manager timezone, which the communication audit confirms is absent (`COMMUNICATION_MAP.md:40-44`).
- **First honest version:** Vick talks only to Roselyn, through Talk, once she has a login. Every message to a lead is a draft that a person sends.

## 5. Tools

What the agent can actually do.

- **Exists today (platform):**
  - Only one model-callable tool is granted to any agent: `read_attachments`, granted to Cory, Reese and Dara (`services/agents/tools/agentToolRegistry.ts:16-26`).
  - A named-tool catalogue describes what other tools read and produce (`services/reese/agentToolCapabilities.ts`).
- **Exists today (Vick):** **0 tools granted** (`/agent-domains-mine`). The 32 capabilities need **34 distinct tools, of which only 4 exist by name** (`sales.json`, `required_tools`; the counts were re-run for `01-system-classes.md`, query Q2):
  - `query_lead_conversion_metrics`
  - `create_tickets`
  - `read_attachments`
  - `escalate_to_human`
- **A caution about one of those four:** `escalate_to_human` today creates a *curriculum* handoff ticket through Dara's chain (`agentToolCapabilities.ts:88-94`). It exists by name, but a sales version would have to route to Roselyn.
- **Missing:** 30 of the 34 tools, and any grant at all.
- **First honest version:** read-only tools only, for example `query_lead_conversion_metrics`, plus a sales-routed `escalate_to_human`. Granting even one lifts the `no_tool_grants` limit (element 8), so each grant is a real decision for Roselyn, not a formality.

## 6. Procedures

The steps the agent follows.

- **Exists today:**
  - Each of the 32 capabilities in the research matrix has a `workflow` and `exceptions` field, plus a `release_behaviour` list for each rung (`sales.json`; all 32 have `release_behaviour`).
  - Roselyn's own five steps are written down in `docs/discovery/03-role-and-da-transition.md`.
- **Exists today (Vick):** **Unknown** whether a role charter holds any procedure (element 1). Everything above is draft.
- **Missing:**
  - Approval of any workflow.
  - The steps for "enrollment completion", which the research matrix says are unknown until Roselyn names them. Her answer that "enrolled means paid" is a start.
  - The list of reasons for a lead not converting.
- **First honest version:** one procedure, warm/cold/not-interested sorting with a reason, written from Roselyn's step 1 and approved by her.

## 7. Coordination

How the agent works with other agents.

- **Exists today:** **nothing.** "No agent-to-agent handoff capability exists in this platform today" (`services/agentDomain/agentDomainReleaseLadder.ts:128-142`). Rung R8 is unreachable for that reason.
- **Exists today (Vick):** nothing.
- **Missing:** everything a handoff would require:
  1. a record of which agent owns which piece of work, so nothing is done twice;
  2. a message or ticket one agent can pass to another, with what was done and what's left;
  3. a rule for which agent wins when two disagree;
  4. a human who can see and undo any handoff.

  None of these exists for agents.
- **Why it matters here:**
  - Roselyn asked for Cory's work to be mapped before Vick is built, so there are no duplicate tasks.
  - The Cora voice agent already calls warm and cold leads (`docs/synthflow-warm-lead-prompt.md:3-4`).
  - Without handoffs, overlap can only be prevented by **people deciding who owns what** (`03-role-and-da-transition.md`, row 1).
- **First honest version:** no coordination at all. A written ownership table, kept by a person, says which tasks are Cora's, Cory's and Vick's.

## 8. Safeguards

What stops the agent from doing harm.

- **Exists today (platform-wide, applies to Vick automatically):**
  - **`effectiveAuthority()`** (`services/agentDomain/autonomyLadder.ts:185`) only ever lowers a capability's level:
    - by its ceiling (`:199`);
    - by the separate pilot approval required in production (`:204`);
    - to R2 when no tools are granted (`:210`);
    - and it keeps any human decision human at every level (`:215`).
  - **Eight default-denied capabilities**, including `live_email` and `production_database` (`executionPolicy.ts:33-42`).
  - **Finishing work never promotes**: `NON_PROMOTING_SIGNALS` (`services/agentDomain/promotionCriteria.ts:79-84`).
  - **A second human signature** for the `act_audited` and `communicate` agent levels (`services/agentDomain/promotionSecondSignature.ts:1-12`, `:94`).
  - **A shared safety-rules block** in every agent prompt (`services/agentBlueprint/platformSafetyRules.ts:33`).
- **Exists today (Vick):** all of the above. Vick is not enabled.
- **Missing:**
  - Sales-specific forbidden actions in a role charter (element 1). For example: never quote a price that isn't on the approved sheet, and never contact a lead marked cold or not interested.
  - The legal limit on contacting cold leads that Roselyn mentioned is **unknown**. It isn't in the repository.
- **First honest version:** the platform safeguards as they are, plus a charter `authority_forbidden` list covering money, sending, and contact with cold leads.

## 9. Verification

How anyone knows the agent is working.

- **Exists today (platform):**
  - The ladder defines R5 as "Evaluate in shadow mode against approved reference outcomes" (`autonomyLadder.ts:64`).
  - Each capability has acceptance criteria per rung in `release_behaviour` (`sales.json`).
- **Exists today (Vick):** **0 tests recorded on all 32 capabilities** (`/coverage`, `tests: []`). No capability has complete release coverage (0 of 32, `/agent-domains-mine/sales`).
- **Missing:**
  - Any test.
  - Approved reference outcomes to compare against.
  - Every pass mark. The readiness tests in `03-role-and-da-transition.md` leave each pass mark for Roselyn, and no evaluation criteria exist in the platform (`docs/architecture/ai-workforce-management/CURRENT_STATE.md:94`).
- **First honest version:** a shadow comparison for one capability. Vick's warm/cold proposals are set beside Roselyn's call outcomes for a set of real leads she chooses, at a pass mark she sets.

---

## Gaps, in the order they block

1. **Roselyn's admin login.** Without it there's no Talk thread (communication) and no approval of a charter, memory or tool.
2. **One approved price and program sheet.** Without it, any input that quotes a price is wrong.
3. **Vick's role charter.** Without it, reasoning, procedures and the sales-specific safeguards have nothing to stand on.
4. **The first tool grant.** Until one is granted, everything stays at R2 or below.
5. **A written ownership table for Cora, Cory and Vick.** There is no coordination mechanism to fall back on.
6. **Pass marks and reference outcomes.** Without them, verification can't start.

---

## Sources

Platform repository: https://github.com/ColaberryIntern/ColaberryEnterprise_AI_LeadershipAccelerator at commit `949fe19`.

| Element | Reference | What it shows |
|---|---|---|
| Identity | `services/agentDomain/agentDomainRegistry.ts:82-84`, `:186-191` | Sales row: `agent_id: null`, Roselyn can't reach the surface |
| 1 | `services/agentBlueprint/agentSystemPrompt.ts:1-5`, `:98`, `:111`, `:121` | Prompt assembly: charter, directives, approved memory, safety block |
| 1 | `services/agentManagerConversationService.ts:63`, `:504-506` | Model used by Talk (`AI_MODEL`, default `gpt-4o-mini`) |
| 1 | `models/AiAgent.ts:322-361` | Agent record fields: `system_prompt`, `tools_granted`, `autonomy_level` |
| 1 | `models/AgentRoleCharter.ts:76-89` | Role charter fields, including the three authority lists |
| 2 | `models/AgentMemoryProposal.ts:1-6`; `services/agentMemoryProposalService.ts:132-135` | Memory needs human approval; only approved memory is read back |
| 2 | `docs/architecture/ai-workforce-management/MEMORY_MAP.md:41-45` | The warning against unchecked approval flags |
| 3, 5 | `services/agentDomain/capabilities/sales.json` | `inputs`, `required_tools`, `workflow`, `release_behaviour` for all 32 |
| 3, 5 | `services/reese/agentToolCapabilities.ts:88-94`, `:106-109`, `:231-234` | The existing named tools and what they produce |
| 4 | `models/AgentManagerConversation.ts:1-6` | The Talk thread |
| 4 | `docs/architecture/ai-workforce-management/COMMUNICATION_MAP.md:35-44`, `:49-59` | Channel inventory; no timezone field |
| 4, 8 | `services/delivery/execution/executionPolicy.ts:33-42` | The eight default-denied capabilities |
| 5 | `services/agents/tools/agentToolRegistry.ts:16-26` | The only live tool grants |
| 7 | `services/agentDomain/agentDomainReleaseLadder.ts:128-142` | No agent-to-agent handoff exists |
| 7 | `docs/synthflow-warm-lead-prompt.md:3-4` | The Cora voice agent already handles warm leads |
| 8 | `services/agentDomain/autonomyLadder.ts:185`, `:199`, `:204`, `:210`, `:215` | `effectiveAuthority()` and its rules |
| 8 | `services/agentDomain/promotionCriteria.ts:79-84` | `NON_PROMOTING_SIGNALS` |
| 8 | `services/agentDomain/promotionSecondSignature.ts:1-12`, `:94` | The second signature rule |
| 8 | `services/agentBlueprint/platformSafetyRules.ts:33` | The shared safety block |
| 9 | `services/agentDomain/autonomyLadder.ts:64` | R5 = shadow mode against approved reference outcomes |
| 9 | `docs/architecture/ai-workforce-management/CURRENT_STATE.md:94` | No performance-target model for an agent |

**Live API, read November 2026:**
- `/agent-domains-mine`: Vick, not enabled, `observe`, 0 tools.
- `/agent-domains-mine/sales`: 0 of 32 with complete release coverage.
- `/agent-domains-mine/sales/coverage`: all 32 `draft`, `tests: []` on every row.
