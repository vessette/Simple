# sales.CAP.subscription_cancellation_and_schedule_suspension — Subscription cancellation and recurring-schedule suspension

A member who cancels stops being charged, their recurring schedule is actually suspended at the gateway, and the cancellation reason is recorded.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- Cancellation terms are drafted and pending final approval (backend/src/controllers/salesHubCoryController.ts:33)

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Subscription cancellation and recurring-schedule suspension
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.subscription_cancellation_and_schedule_suspension`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
A member who cancels stops being charged, their recurring schedule is actually suspended at the gateway, and the cancellation reason is recorded.
Intended users: member (self-serve), Roselyn (sales owner).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Resolve the member's active subscription
- Suspend the recurring schedule at the gateway
- Clear the stored schedule id so nothing re-reads a dead schedule
- Record the cancellation and its reason
**Inputs**
- enrollment_id
- a cancellation reason
**Outputs**
- A suspended PaySimple recurring schedule
- paysimple_schedule_id cleared on the subscription row
- status, canceled_at and cancel_reason recorded
**Exceptions that must be handled**
- Gateway suspend fails: the local row must not be marked cancelled while the schedule still charges, or the member keeps paying for access they have cancelled
- No schedule id on the row: the member is on a manual or legacy billing path and the suspend is a no-op, which must be reported rather than treated as success
- Cancellation terms are drafted and pending approval, so what a member is owed on cancellation is unknown
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- query_subscription_ledger
- escalate_to_human
**Application surfaces**
- /portal/subscription
- POST /api/portal/subscription/cancel
**Source modules**
- backend/src/services/subscriptionService.ts
- backend/src/services/subscriptionScheduleService.ts
- backend/src/services/paysimpleRecurring.ts
**Dependencies**
- PaySimple credentials
- subscriptions
- the member's identity
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R2**.
Why that ceiling: Cancelling alters subscription state and stops a charge; getting it half-done either keeps charging a cancelled member or stops charging an active one. It is a human decision, and because the cancellation terms are not yet approved the agent is held to answering questions only.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R2)**
The agent explains a named member's subscription state, whether a gateway schedule exists, and what the recorded cancellation reason is.

Acceptance: Every claim traces to the subscription row or a gateway read; where no schedule id exists the agent says the suspend would be a no-op rather than implying the member is safe from charges.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- Cancellation terms are drafted and pending final approval (backend/src/controllers/salesHubCoryController.ts:33)
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/routes/participantRoutes.ts:437
- backend/src/services/subscriptionService.ts:644-682 (cancelSubscription)
- backend/src/services/subscriptionScheduleService.ts:159-198 (suspendScheduleForSubscription)
- backend/src/services/paysimpleRecurring.ts:138 (suspendRecurringSchedule)
- backend/src/models/Subscription.ts:85 (canceled_at, cancel_reason)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every claim traces to the subscription row or a gateway read; where no schedule id exists the agent says the suspend would be a no-op rather than implying the member is safe from charges.

When every box above is ticked, stop and show the demo.
