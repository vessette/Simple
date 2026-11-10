# System classes: where Sales, Enrollment & Subscriptions belongs

**Story:** `sales.RESEARCH-1-SYSTEM-CLASSES` · **Release:** Discovery and validation
**Accountable human:** Roselyn · **Prepared by:** Victoria Spencer-Auber · **Drafted:** 2026-11-05 · **Re-verified:** 2026-11-10
**Status:** draft for Roselyn's review. Nothing in this document enables, grants or changes an agent.

All platform citations refer to the public platform repository
`ColaberryIntern/ColaberryEnterprise_AI_LeadershipAccelerator` at commit `456de02`
(9:42 AM CST on 2026-11-10). The draft was first written against `ccbd870` (5 November 2026);
every query and citation was re-run against `456de02`. Paths are relative to that repository's root.

---

## The answer in one paragraph

This domain needs **one tool-using agent with read-and-propose tools, sitting on top of the
fixed workflows it already has**. It does not need an agentic system yet, and it does not need a
multi-agent system at all. The reason is the shape of its 32 candidate capabilities: 12 of them
are reserved to a human at every level, 8 of those move money, none has a ceiling above
`autonomy:R6`, and of the 34 tools the capabilities need, only 4 exist on the platform today.
An agent here has no autonomous action to take and very few tools to take it with. Its value is
in pulling records together and handing a human a prepared decision.

---

## The domain's own figures

These come from the domain's capability matrix (the source of the story brief) and were
re-counted from the file rather than copied.

| Figure | Value | Source |
|---|---|---|
| Candidate capabilities | 32 | `capabilities/sales.json` `counts.distinct_capabilities`; query Q1 |
| Inherited legacy records | 16 (5 migrated, 6 superseded, 4 unknown, 1 retired) | `sales.json:3646` (`legacy_dispositions`); Q1 |
| Reserved to a human at every level (`human_decision: true`) | 12 | Q1 |
| ...of which move money (`financial_consequence: moves_money`) | 8 | Q1; `sales.json:3765` |
| Ceiling `autonomy:R2` / `R4` / `R5` / `R6` / `R0` | 4 / 8 / 7 / 12 / 1 | Q1 |
| Capabilities with a ceiling of R7, R8 or R9 | 0 | Q1; `sales.json:3765` |
| Starting autonomy | R0 for all 32 | Q1 |
| Implementation state | 17 implemented, 7 partial, 7 absent, 1 unknown | Q1 |
| Distinct tools required | 34, of which 4 exist in a real registry | Q2; `sales.json:3767` |
| Capabilities blocked on live email | 15 (`live_email` is default-denied) | Q1; `backend/src/services/delivery/execution/executionPolicy.ts:33-42` |
| AI employee for this domain | none (`agent_id: null`) | `backend/src/services/agentDomain/agentDomainRegistry.ts:190` |
| Can Roselyn reach a review surface? | no (`can_reach_surface: false`, no `admin_users` row) | `agentDomainRegistry.ts:188-189`, `:82-84` |

Paths in the Source column without a directory are under `backend/src/services/agentDomain/`.

---

## The five classes

### 1. Chatbot
Answers a question in one turn from a fixed body of knowledge and takes no action. Its risk is
what it *says*, not what it *does*. This domain already has one: the Sales Hub Cory endpoint
answers from pinned facts and is told never to invent a price, date or policy
(`backend/src/controllers/salesHubCoryController.ts:25`, `:38`, `:44`). It is the right class for
`sales.prospect_question_answering_from_approved_kb` and for nothing else in this domain.

### 2. Fixed workflow
Code decides every step in advance; a model may fill one step (score, classify, summarise) but
never chooses what happens next. This is what the platform overwhelmingly runs: of the registry
entries with a trigger, 202 are `cron`, 37 `on_demand` and 9 `event_driven` (query Q3). Every
sales-adjacent entry I found is a cron workflow: `NoShowDetector` (`backend/src/services/agentRegistrySeed.ts:195-204`),
`ApolloLeadIntelligenceAgent` (`:567-576`), `ApolloWeeklyEnrollmentAgent` (`:583-592`),
`RevenueOptimizationAgent` (`:705-712`), `RevenueOpportunityAgent` (`:1875-1882`) and
`OfferRoutingAgent` (`:2311-2319`).

### 3. Tool-using agent
A model is given a small, bounded set of tools and chooses which to call, in response to a
person's request, then returns the result to that person. The application, not the model, owns
the permissions. On this platform the only live model-callable tool today is `read_attachments`,
granted to Cory, Reese and Dara and to no sales agent
(`backend/src/services/agents/tools/agentToolRegistry.ts:16-26`).

### 4. Agentic system
The model pursues a goal over many steps: it plans, acts, checks its own result and keeps state
between steps, often without a person starting each step. On this platform's ladder that is
`autonomy:R4` ("execute and verify stateful, multi-step sandbox tasks") and above, and it only
pays off when there is something the system is allowed to *do* and a reference to check itself
against.

### 5. Multi-agent system
Several agents divide a goal and hand work to each other. It needs a handoff mechanism, and the
platform states plainly that none exists: `autonomy:R8` is "unreachable by fact rather than by
choice" (`backend/src/services/agentDomain/agentDomainReleaseLadder.ts:128-142`).

---

## Recommendation: a tool-using agent, built over the existing workflows

**Keep the fixed workflows that already run, and add one tool-using agent whose tools only
observe and propose.** Three numbers drive this.

**1. 12 of 32 capabilities (37.5%) are reserved to a human at every level.** For those, the
most any system may do is prepare the decision: gather the payment record, the subscription
schedule and the enrollment, and put them in front of Roselyn. Gathering from several places in
response to a question is exactly what a tool-using agent does and what a fixed workflow does
badly, because which record matters next depends on what the last one showed. The live incident
behind `sales.payment_handoff_integrity` (a PaySimple hosted page minting its own customer, three
students unlinked, one locked out for two days; `sales.json:3764`) is that kind of trace.

**2. The ceilings stop at R6, and the money ceilings stop at R2 or R4.** The 8 money-moving
capabilities cap at R2 (refunds, cancellations, comped seats), R4 (checkout links, subscription
checkout, team seats) or R5 in shadow only (payment confirmation, reconciliation)
(`sales.json:3765`). Refunds are the hardest stop: the refund and cancellation terms themselves
are "drafted and pending final approval" (`salesHubCoryController.ts:33`). An agentic system
earns its cost by acting; here the actions that matter most are the ones it may never take.

**3. 30 of the 34 required tools do not exist yet.** Only `query_lead_conversion_metrics`,
`escalate_to_human`, `create_tickets` and `read_attachments` are real (Q2;
`backend/src/services/reese/agentToolCapabilities.ts:88`, `:106`, `:231`). By prefix, the 34
are almost entirely observe-tier (`query_` 8, `detect_` 7, `read_` 3, `monitor_` 2, others 1
each) or suggest-tier (`propose_` 4, `generate_` 2), and none is a `send_` tool (Q2;
`sales.json:3767`). A system can't be more agentic than its tool set; the first job is building
those read tools, and a tool-using agent is the class that uses them.

The other 20 capabilities are mostly watches and reports (billing health, abandoned checkouts,
pipeline digests). Most of those are better as **fixed workflows**, because a scheduled, repeatable
check is cheaper and more predictable than a model deciding what to look at.

**If the numbers changed, so would the answer.** If the human-reserved count fell well below 12,
or if the read tools existed and an approved reference stream covered more than two capabilities,
the case for moving up a class would strengthen. If more capabilities turned out to be pure
reporting, the case for the agent at all would weaken toward "fixed workflows plus the existing
chatbot".

---

## What this domain does NOT need

**A multi-agent system.** There is no agent in this domain to coordinate with (`agent_id: null`,
`agentDomainRegistry.ts:190`), no capability's ceiling reaches R8 (Q1), and the platform has no
handoff mechanism (`agentDomainReleaseLadder.ts:128-142`). The 4 legacy records marked `unknown`
are cross-domain ownership questions (campaign delivery and measurement that probably belong to
marketing or platform; `sales.json` notes). People resolve those by reassigning ownership. They are
not a reason for agents to hand work to each other.

---

## What would justify the next class up (agentic system)

All four of these, not any one:

1. **Roselyn can review.** She needs an `admin_users` row so she can open the review surface
   (`agentDomainRegistry.ts:188-189`). Today this blocker is recorded on all 32 capabilities, and
   she is not on Basecamp either, so the ticket fallback is unavailable (`sales.json:3763`). No
   capability can leave `draft` until this changes.
2. **At least one capability has passed R3 in a sandbox.** That means its tools exist in the
   registries (today 4 of 34), and it has run user-initiated sandbox operations that Roselyn has
   checked.
3. **An approved reference to verify against.** Shadow-mode comparison exists for two capabilities
   only (payment confirmation and reconciliation; `sales.json:3765`). An agentic system that
   checks its own work needs that reference for the capabilities it runs.
4. **The refund and cancellation policy is approved.** While it is "drafted and pending"
   (`salesHubCoryController.ts:33`), no system at any class may apply it.

Even then, agentic behaviour would be justified only for the non-money capabilities with an R4+
ceiling. The 4 capabilities capped at R2 stay below the agentic line regardless.

---

## Findings worth flagging to Roselyn

- **A fixed workflow already makes an approval decision with no human.** `ApolloWeeklyEnrollmentAgent`
  approves Apollo recommendations with fit >= 50 and enrolls them into cold outbound
  (`backend/src/services/agents/apolloLeadIntelligenceAgent.ts:87-88`, `:103`). The registry
  describes it as weekly, up to 300 (`agentRegistrySeed.ts:583-592`), but the scheduler runs it
  Monday to Friday at 20 a day (`backend/src/services/aiOpsScheduler.ts:226`). The capability
  matrix already re-scopes it to an approval packet (`sales.json:463`). Its **real current volume
  is unknown**: whether it is enabled in production can't be read from the repo.
- **The capability matrix has one stale claim.** It says `revenueDashboardService.ts:11` still
  computes revenue as enrolled x 4500 (`sales.json:1602`, `:3313`). That constant is gone: zero
  matches for `PRICE_PER_ENROLLMENT`, and the file header records the fix, implemented 2026-10-09
  (`backend/src/services/revenueDashboardService.ts:1-8`; query Q4). The rule still stands; the
  violation it points to has been fixed.

---

## Unknowns

- **How often each existing sales workflow actually runs in production, and whether it is enabled.**
  The registry and scheduler show the configured schedule, not what ran. Source needed: the
  production agent run log, which is not in this repository.
- **What Roselyn wants first and what she considers "good".** No source exists. That's the job of
  `sales.RESEARCH-4-MANAGER-INTERVIEW`.
- **How many capabilities would stay human-reserved after her review.** All 12 flags are draft
  (`requirement_validation_state: draft` on all 32; Q1). The recommendation above depends on that
  number, so it should be revisited after her review.

---

## Sources

Platform repository: https://github.com/ColaberryIntern/ColaberryEnterprise_AI_LeadershipAccelerator
at commit `456de02`. All `file:line` references above are in that repository.

| Ref | What it shows |
|---|---|
| `backend/src/services/agentDomain/capabilities/sales.json` | Domain capability matrix, researched 2026-10-09: counts, capabilities, legacy dispositions, notes (`:3646`, `:3760-3767`) |
| `backend/src/services/agentDomain/agentDomainRegistry.ts:82-84`, `:182-194` | Sales domain row: no agent, Roselyn cannot reach the surface |
| `backend/src/services/agentDomain/agentDomainStoryTemplates.ts:179-188` | The brief for this story (where 32 / 16 / 12 come from) |
| `backend/src/services/agentDomain/agentDomainReleaseLadder.ts:128-142` | R8 / agent-to-agent handoff does not exist |
| `backend/src/services/agentRegistrySeed.ts:195`, `:567`, `:583`, `:705`, `:1875`, `:2311` | Sales-adjacent registry entries, all cron |
| `backend/src/services/aiOpsScheduler.ts:225-226` | Actual Apollo schedules |
| `backend/src/services/agents/apolloLeadIntelligenceAgent.ts:87-103` | Weekly auto-approval logic |
| `backend/src/services/agents/tools/agentToolRegistry.ts:16-26` | Only live model-callable tool grants |
| `backend/src/services/reese/agentToolCapabilities.ts:88`, `:106`, `:231` | The three existing named tools |
| `backend/src/services/delivery/execution/executionPolicy.ts:33-42` | Default-denied capabilities, including `live_email` and `production_database` |
| `backend/src/controllers/salesHubCoryController.ts:25-44` | Existing sales chatbot; refund terms pending approval |
| `backend/src/services/revenueDashboardService.ts:1-8` | 4500 revenue constant removed |

### Queries

Run from `backend/src/` in the platform repository.

**Q1, capability counts:**
```sh
node -e 'const c=require("./services/agentDomain/capabilities/sales.json").capabilities;
const n=(f)=>c.filter(f).length, t=(k)=>c.reduce((a,x)=>(a[x[k]]=(a[x[k]]||0)+1,a),{});
console.log(c.length, n(x=>x.human_decision), n(x=>x.financial_consequence==="moves_money"),
 t("max_permitted_autonomy"), t("starting_autonomy"), t("implementation_state"),
 t("requirement_validation_state"), n(x=>JSON.stringify(x.blocked_by).includes("live_email")))'
```
Result: `32 12 8 {R5:7, R6:12, R4:8, R2:4, R0:1} {R0:32} {implemented:17, partial:7, absent:7, unknown:1} {draft:32} 15`.

**Q2, required tools and which exist:** collect the distinct `required_tools` across all 32
capabilities (34), then search `services/reese/agentToolCapabilities.ts` and
`services/agents/tools/agentToolRegistry.ts` for each name. Matches: `query_lead_conversion_metrics`,
`escalate_to_human`, `create_tickets`, `read_attachments`.

**Q3, registry trigger types:**
```sh
grep -o "trigger_type: '[a-z_]*'" services/agentRegistrySeed.ts | sort | uniq -c
```
Result: 202 `cron`, 37 `on_demand`, 9 `event_driven`.

**Q4, revenue constant removed:**
```sh
grep -c PRICE_PER_ENROLLMENT services/revenueDashboardService.ts
```
Result: `0`.
