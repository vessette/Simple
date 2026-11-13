# sales.CAP.icp_prospect_discovery_and_fit_scoring.L3-TOOL-REQUEST — ICP prospect discovery and program-fit scoring · 3 · request the tool

**Ask for the tool, and let a human decide whether the agent may have it.**

File a tool request for this capability, and let it be decided. This is a real governance gate with a real human on the other side of it, not paperwork.

**How to file it.** Open the Change Requests page in the admin and file one against `sales`, the domain you own. It posts to `POST /api/admin/agent-domain-change-requests-mine`. Roselyn or an admin decides it at `POST /api/admin/agent-domain-change-requests/:id/decide`. You cannot decide your own.

**The tools this capability was recorded as needing**
- scan_prospect_fit_against_icp
- query_lead_conversion_metrics
- escalate_to_human

**What the request has to say**, and all of it comes from work you have already done:
- The exact thing the tool would do, in one sentence.
- Why it is needed, citing your step 1 run log -- what was slow, repetitive or error-prone.
- What you proved in step 2: that the product can already produce this outcome by hand, or exactly which gap stops it.
- The scope: what the tool may touch and what it must never touch.
- Who approves a run, and what happens when the tool is wrong.

Say explicitly which parts of the work the tool takes and which stay with a person.

**A declined request is a completed story.** The decision is the outcome, not the approval. Record what was decided and why, and if it was declined, what would have to change.

The four steps of this capability run in order. A later step opened before its predecessor is complete is the thing this ladder exists to prevent -- say so and go back rather than working ahead.

**Release:** autonomy:R0 · Legacy migration plan (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# ICP prospect discovery and program-fit scoring
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.icp_prospect_discovery_and_fit_scoring`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** inherited
## The business outcome
A reviewable queue of sourced prospects, each carrying a program-fit score and an ROI estimate, so selling time goes to the best-fit names instead of to sourcing.
Intended users: Roselyn (sales owner), Ali (approver), Taiwo (admissions ops).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Read the ICP profile off the campaign
- Query Apollo for matching people within the per-profile cap
- Score program fit 0-100 and estimate ROI
- Write a recommendation row in a pending state
- Stop; a human approves or rejects each recommendation
**Inputs**
- ICP profile attached to an autonomous campaign
- Apollo search result set
- max_leads_per_profile (config, 50)
- min_program_fit_score (config, 40)
**Outputs**
- Lead recommendation rows pending admin approval
- program-fit score 0-100
- ROI estimate
**Exceptions that must be handled**
- Apollo returns 429 or 5xx: no recommendations written for that profile that run
- Score cannot be computed: record the prospect with score unknown, never a default number
- Prospect already recommended or already a lead: skip, do not create a second row
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- scan_prospect_fit_against_icp
- query_lead_conversion_metrics
- escalate_to_human
**Application surfaces**
- /admin/leads
- /admin/opportunities
- GET /api/admin/leads
- GET /api/admin/lead-sources/groups
- POST /api/admin/apollo/import
**Source modules**
- backend/src/services/agents/apolloLeadIntelligenceAgent.ts
- backend/src/services/apolloService.ts
- backend/src/controllers/adminLeadController.ts:91-143
**Dependencies**
- Apollo API credentials
- campaigns table carrying an ICP profile
- leads table
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R5**.
Why that ceiling: Sourcing and scoring write no money and contact nobody, so shadow mode against the human's own accept/reject decisions is the honest ceiling. R6 and above would turn the recommendation into an action, and the approval step is the control that kept the legacy agent safe.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R1)**
Scoring runs against committed Apollo fixtures in an isolated dev database; no live Apollo call.

Acceptance: Baseline tests pass on fixtures, and a fixture whose fit score cannot be computed is recorded as unknown rather than defaulted to a number.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Apollo is a paid external dependency: any change to call volume or plan is a governance escalation, not an implementation decision
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/agentRegistrySeed.ts:465-479
- backend/src/services/aiOpsScheduler.ts:225
- backend/src/services/agents/apolloLeadIntelligenceAgent.ts
- backend/src/services/apolloService.ts
- .loop-architect/runs/20261007-school-agent-factory/legacy-slices/sales.json (row 1)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] A change request for a tool exists against this domain, filed by the builder, naming the tool, its scope, what it must never touch, and who approves a run.
- [ ] The request cites the step 1 run log and the step 2 result as its evidence.
- [ ] A named human other than the builder has recorded a decision on it. A decline counts; an undecided request does not.

When every box above is ticked, stop and show the demo.
