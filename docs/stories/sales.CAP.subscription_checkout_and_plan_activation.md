# sales.CAP.subscription_checkout_and_plan_activation — Membership subscription checkout and plan activation

A member can start the annual or monthly plan, have any account credit applied to the first charge, and be activated into the paid cohort when the payment settles.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Membership subscription checkout and plan activation
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.subscription_checkout_and_plan_activation`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
A member can start the annual or monthly plan, have any account credit applied to the first charge, and be activated into the paid cohort when the payment settles.
Intended users: member or student (self-serve), Roselyn (sales owner).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Reject any plan that is not annual or monthly, so the comped plan can never reach a checkout
- Refuse when billing is unconfigured rather than creating an unpayable link
- Apply whole account-credit rows up to the payable target, reducing only the first charge
- Mint a SUB- external id, create the hosted link, write the pending subscription row
- On a confirmed payment, activate: anchor the period to the class start date, convert the enrolment, cancel superseded renewal rows
**Inputs**
- enrollment_id
- plan (annual or monthly only)
- available account credit rows
- the target paid cohort's start date
**Outputs**
- A hosted payment link
- a subscriptions row at status 'pending' carrying payment_ref SUB-...
- on settlement: an active subscription, a billing period anchored to the class start date, and conversion from Explorer to paying member
**Exceptions that must be handled**
- Credit is not consumed until the payment settles, so an abandoned checkout keeps the credit (subscriptionService.ts:346-349)
- activateByRef is idempotent: a second call for an already-active subscription is a no-op (subscriptionService.ts:423)
- A stored PaySimple customer id that does not belong to this enrolment is ignored and a fresh customer is minted, because billing the wrong person is worse than a duplicate customer (subscriptionService.ts:296-330)
- The comped plan must never be chargeable; it is granted, not purchased
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- read_plan_catalog
- query_subscription_ledger
- query_account_credit_ledger
- escalate_to_human
**Application surfaces**
- /portal/subscription
- /pricing
- /try
- GET /api/portal/subscription
- POST /api/portal/subscription/checkout
- POST /api/portal/subscription/confirm
**Source modules**
- backend/src/services/subscriptionService.ts
- backend/src/controllers/participantController.ts:105-133
**Dependencies**
- PaySimple credentials
- account_credits
- a real paid cohort that is not a demo or Explorer cohort
- sales.payment_confirmation_and_seat_grant
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R4**.
Why that ceiling: Starting a checkout creates a charge and activation mutates subscription state and billing dates. Both are financial actions reserved to a human. Sandbox verification is the ceiling; a production pilot of either would be the agent charging a customer.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R2)**
The agent answers plan, price, credit and billing-date questions from PLANS and the member's own subscription row.

Acceptance: Every price and date traces to code or to the member's row; an unknown is reported as unknown rather than computed from an assumption.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/routes/participantRoutes.ts:434-437
- backend/src/services/subscriptionService.ts:73-80 (PLANS: annual 149/mo billed yearly, monthly 199/mo, comp 0)
- backend/src/services/subscriptionService.ts:335-407 (startCheckout)
- backend/src/services/subscriptionService.ts:416-577 (activateByRef)
- backend/src/services/subscriptionService.ts:683 (confirmCheckout)
- backend/src/services/subscriptionService.ts:96-119 (billingAnchorMs, periodEndMs)
- backend/src/models/Subscription.ts:85 (table subscriptions)
- frontend/src/pages/PricingPage.tsx:20-23

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every price and date traces to code or to the member's row; an unknown is reported as unknown rather than computed from an assumption.

When every box above is ticked, stop and show the demo.
