# sales.CAP.comped_seat_grant_and_revocation — Comped seat grant and revocation

Staff, partners and agreed exceptions get full program access at no charge, on a plan that never lapses on its own and is revoked explicitly.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- The rule for granting a comp to someone who already has a paid subscription is unknown and must be named by Roselyn and Ali

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Comped seat grant and revocation
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.comped_seat_grant_and_revocation`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
Staff, partners and agreed exceptions get full program access at no charge, on a plan that never lapses on its own and is revoked explicitly.
Intended users: Ali (approver), Roselyn (sales owner), admin staff.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Confirm the enrolment exists
- Create the comp subscription, which is never reachable from a self-serve checkout
- On revocation, end the comp explicitly rather than letting it expire
**Inputs**
- enrollment_id
- the granting admin's identity
**Outputs**
- A comp subscription at 0 dollars with a period long enough that it never lapses
- or an explicit revocation
**Exceptions that must be handled**
- The comp plan must never reach a hosted checkout: startCheckout rejects it outright (subscriptionService.ts:338)
- A comped member must not be counted as paying revenue: the paying-member scope filter requires payment_status 'paid' and excludes Explorers (subscriptionAnalyticsService.ts:168)
- Granting a comp to someone with an active paid subscription: the interaction between the two rows is unknown and needs a named rule
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- query_subscription_ledger
- escalate_to_human
**Application surfaces**
- /admin/accelerator
- /admin/community-members
- POST /api/admin/accelerator/... (grant and revoke free access)
- POST /api/admin/community-members/... (grant and revoke free access)
**Source modules**
- backend/src/services/subscriptionService.ts
- backend/src/services/subscriptionRosterService.ts
**Dependencies**
- subscriptions
- the staff roster exclusion used by the revenue rosters
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R2**.
Why that ceiling: A comp sets the price to zero for a named person, which is a discount, and discounting is explicitly forbidden to an agent. The agent may report who holds a comp and why; granting or revoking stays a human decision.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R2)**
The agent reports who currently holds a comped seat, since when, and whether they are excluded from the paying-member counts.

Acceptance: Every comp listed traces to a subscriptions row; the agent states explicitly that comped seats are excluded from revenue, and never proposes a grant as though it were a routine step.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- The rule for granting a comp to someone who already has a paid subscription is unknown and must be named by Roselyn and Ali
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/subscriptionService.ts:68-80 (comp plan, 0 dollars, ~10-year period)
- backend/src/services/subscriptionService.ts:579-616 (grantFreeAccess)
- backend/src/services/subscriptionService.ts:617-628 (revokeFreeAccess)
- backend/src/services/subscriptionService.ts:629-643 (activeCompEnrollmentIds)
- backend/src/routes/admin/acceleratorRoutes.ts:89-100
- backend/src/routes/admin/communityMemberRoutes.ts:64-79
- backend/src/services/subscriptionRosterService.ts:69 (getStaffRoster)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every comp listed traces to a subscriptions row; the agent states explicitly that comped seats are excluded from revenue, and never proposes a grant as though it were a routine step.

When every box above is ticked, stop and show the demo.
