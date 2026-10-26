# sales.CAP.outbound_batch_preparation_for_approval — Outbound enrolment batch prepared for human approval

The cold-outbound batch arrives as a reviewable packet with a named approver, instead of high-scoring prospects being auto-approved and enrolled with nobody looking.

**Built today:** partial. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Roselyn cannot reach an approval surface today, so the approver named on a packet cannot act on it
- The slice records this agent as weekly at 300 prospects (cron '0 14 * * 1'); the live wiring is daily Mon-Fri at 20 a day (aiOpsScheduler.ts:226). The real current volume is unknown until Roselyn confirms which is intended

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Outbound enrolment batch prepared for human approval
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.outbound_batch_preparation_for_approval`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** partial · **Source:** inherited
## The business outcome
The cold-outbound batch arrives as a reviewable packet with a named approver, instead of high-scoring prospects being auto-approved and enrolled with nobody looking.
Intended users: Roselyn (sales owner), Ali (approver).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Select recommendations at or above the fit threshold
- Assemble them into one packet with scores and the proposed sequence
- Record the packet against a named approver
- Stop; enrolment and any send happen only after a human approves
**Inputs**
- Pending prospect recommendations with a fit score
- a minimum fit threshold
- a per-run volume cap
- suppression and unsubscribe state
**Outputs**
- One approval packet naming the prospects, their scores, the proposed sequence, the volume and the approver
- no enrolment and no send until the packet is approved
**Exceptions that must be handled**
- Fewer qualifying prospects than the cap: report the real number, never pad a batch to hit a volume target
- A prospect appears in two packets: deduplicate before the packet is presented, not after enrolment
- A prospect has unsubscribed or is suppressed: exclude before the packet is built
- The approver is unavailable: the packet waits; an unapproved packet must never time out into approval
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- propose_outbound_batch_for_approval
- query_enrollment_funnel_state
- escalate_to_human
**Application surfaces**
- /admin/leads
- /admin/campaigns
- /admin/approvals
- GET /api/admin/leads
- GET /api/admin/approval-requests
**Source modules**
- backend/src/services/agents/apolloLeadIntelligenceAgent.ts
- backend/src/services/approvalRequestService.ts
**Dependencies**
- sales.icp_prospect_discovery_and_fit_scoring
- suppression and unsubscribe state
- an approval surface Roselyn can actually reach
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R4**.
Why that ceiling: The packet is a document, but what it authorizes is prospect contact, which needs live_email. The legacy agent auto-approved high-scoring recommendations with no named approver, so capping at stateful sandbox work is what keeps the approval gate real rather than nominal.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R1)**
Packet assembly runs against committed fixtures in an isolated dev database.

Acceptance: A fixture batch with fewer qualifying prospects than the cap produces the smaller real number: a test asserting padding must fail.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Roselyn cannot reach an approval surface today, so the approver named on a packet cannot act on it
- The slice records this agent as weekly at 300 prospects (cron '0 14 * * 1'); the live wiring is daily Mon-Fri at 20 a day (aiOpsScheduler.ts:226). The real current volume is unknown until Roselyn confirms which is intended
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/agentRegistrySeed.ts:481-495
- backend/src/services/aiOpsScheduler.ts:226
- .loop-architect/runs/20261007-school-agent-factory/legacy-slices/sales.json (row 2)
- backend/src/services/delivery/execution/executionPolicy.ts:33-42

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] A fixture batch with fewer qualifying prospects than the cap produces the smaller real number: a test asserting padding must fail.

When every box above is ticked, stop and show the demo.
