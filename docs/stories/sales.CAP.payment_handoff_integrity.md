# sales.CAP.payment_handoff_integrity — Payment-handoff integrity across the hosted-page boundary

The person who agreed to buy is the person the charge lands on, and the schedule that bills them draws against a payment method that actually exists.

**Built today:** partial. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- Whether every historical subscription has been checked across the handoff boundary is unknown: no backfill audit record exists

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Payment-handoff integrity across the hosted-page boundary
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.payment_handoff_integrity`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** partial · **Source:** manager_defined
## The business outcome
The person who agreed to buy is the person the charge lands on, and the schedule that bills them draws against a payment method that actually exists.
Intended users: Roselyn (sales owner), Ali, finance.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- For each subscription, compare the customer id stored at checkout with the id the charge landed on
- Resolve the billing account from the first payment rather than from the stored customer id
- Flag any stored id that does not belong to its enrolment's payer
- Flag any schedule whose account cannot be resolved, and say whether an exclusion explains it
**Inputs**
- Stored PaySimple customer ids on enrolments and subscriptions
- the customer id the charge actually landed on
- the AccountId from the first payment
- the exclusion lists
**Outputs**
- A list of identity mismatches across the handoff
- a list of schedules whose account cannot be resolved
- a named cause per finding; no writes
**Exceptions that must be handled**
- A lookup failure is not proof of ownership: fail closed and treat the id as unverified (subscriptionService.ts:291-292)
- A customer id claimed by two enrolments is the exact path by which a stranger's charge reaches the wrong person: it must be excluded, not reconciled
- An excluded member, ACH-awaiting-consent or card-blocked, must be reported as excluded rather than as broken
- Whether every historical subscription has been checked across this boundary is unknown
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- flag_payment_handoff_anomaly
- query_subscription_ledger
- create_tickets
- escalate_to_human
**Application surfaces**
- /admin/revenue
- GET /api/admin/revenue/payments
- POST /api/admin/revenue/reconcile (dry run)
**Source modules**
- backend/src/services/subscriptionScheduleService.ts
- backend/src/services/subscriptionService.ts
- backend/src/services/appPaymentReconcileService.ts
**Dependencies**
- PaySimple read access
- subscriptions, enrollments
- sales.app_originated_payment_reconciliation
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: Detecting an identity mismatch is read-only and is exactly the check that would have caught three students sitting unlinked. A supervised production pilot of the detection is defensible; correcting a mismatch touches who gets billed, so it stays a human decision and R7 is prohibited.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent explains, for a named subscription, which customer id was stored, which the charge landed on, and whether the billing account resolves.

Acceptance: Every claim traces to a gateway read or a stored row; an unverifiable id is reported as unverified rather than as matching.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- Whether every historical subscription has been checked across the handoff boundary is unknown: no backfill audit record exists
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- CLAUDE_CODE_AI_EMPLOYEE_CONSOLIDATION_LOOP_PROMPT.md:106
- backend/src/services/subscriptionScheduleService.ts:85-90 ('The hosted checkout page mints its own customer when the payer pays, so the id we stored at checkout points at a customer with no payment methods on it')
- backend/src/services/subscriptionScheduleService.ts:91-107 (resolveAccountForSubscription: the first payment carries both real ids)
- backend/src/services/appPaymentReconcileService.ts:22-28 (customer 43728423 at checkout, charge on 43728431 minted four minutes later; three students unlinked, one locked out two days)
- backend/src/services/subscriptionService.ts:276-294 (ownedByEnrollment: a cached customer id is verified against the payer email and rejected otherwise, because billing the wrong person is far worse than a duplicate)
- backend/src/services/subscriptionScheduleService.ts:34-63 (the ACH-awaiting-consent and card-blocked exclusion lists)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every claim traces to a gateway read or a stored row; an unverifiable id is reported as unverified rather than as matching.

When every box above is ticked, stop and show the demo.
