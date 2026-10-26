# sales.CAP.manager_decision_queue_for_sales_actions — A decision queue the accountable manager can actually reach

Roselyn can see, decide and record every financial and outreach decision her agent prepares; without this, every other capability in this domain is stalled at draft.

**Built today:** absent. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Provisioning the surface is a governance decision for Ali: an admin_users row, a scoped mgmt_role, or an alternative surface
- Roselyn is also not on Basecamp, so the ticket-based fallback path is unavailable too (PROGRESS.md:1563)

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# A decision queue the accountable manager can actually reach
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.manager_decision_queue_for_sales_actions`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** absent · **Source:** manager_defined
## The business outcome
Roselyn can see, decide and record every financial and outreach decision her agent prepares; without this, every other capability in this domain is stalled at draft.
Intended users: Roselyn (sales owner), Ali (approver).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Present each prepared proposal with its evidence
- Let the named manager accept, reject or defer, with a reason
- Record the decision against the capability and the proposal
- Leave anything undecided visibly undecided; nothing times out into approval
**Inputs**
- Prepared proposals from every other capability in this domain
- Roselyn's identity and the scope she is permitted
**Outputs**
- A recorded decision per proposal, with the decider, the time and the reason
- the audit trail that lets a capability move from draft to confirmed
**Exceptions that must be handled**
- She has no admin_users row today, so there is no surface to present anything on
- The nearest fitting existing permission is the revenue mgmt_role (dashboard, revenue, leads), which is a community_members role and not an admin login: granting it does not by itself make the surface reachable
- No proposal may be auto-approved by elapsed time, story completion or a successful conversation
- Whether she should receive an admin login, a scoped mgmt_role, or a different surface entirely is a governance decision, not an implementation one
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- escalate_to_human
- create_tickets
**Application surfaces**
- /admin/approvals
- /admin/revenue
- GET /api/admin/approval-requests
**Source modules**
- backend/src/services/agentDomain/agentDomainRegistry.ts
- backend/src/services/access/mgmtRoles.ts
- backend/src/services/approvalRequestService.ts
**Dependencies**
- an admin_users row or an equivalent scoped surface
- the approval-request substrate
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R2**.
Why that ceiling: This is the control on which every other capability's promotion depends, so the agent's role in it is to present and record, never to decide. It cannot exceed answering questions about the queue's contents, and it is blocked outright until the manager has a surface.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R0)**
The workflow, the decision types, the required evidence per decision and the rollback conditions are written down and reviewed; nothing is built.

Acceptance: Every capability in this matrix names the decision it needs from Roselyn, and no capability claims a confirmed requirement.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Provisioning the surface is a governance decision for Ali: an admin_users row, a scoped mgmt_role, or an alternative surface
- Roselyn is also not on Basecamp, so the ticket-based fallback path is unavailable too (PROGRESS.md:1563)
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/agentDomain/agentDomainRegistry.ts:158-170 (can_reach_surface false; requested_capabilities empty; agent_id null)
- .loop-architect/runs/20261007-school-agent-factory/verified-domain-registry.json (sales entry: admin_user_id null, admin_role null)
- docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16 ('resolved; no login')
- docs/architecture/ai-workforce-management/AI_EMPLOYEE_ROSTER.md:34 ('Cannot start without an owner record')
- backend/src/services/access/mgmtRoles.ts:54 (revenue role: sections dashboard, revenue, leads)
- backend/src/scripts/assignOrgDepartments20260819.ts:98 (team Customer Support)
- PROGRESS.md:1563 (Roselyn not provisioned on Basecamp)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every capability in this matrix names the decision it needs from Roselyn, and no capability claims a confirmed requirement.

When every box above is ticked, stop and show the demo.
