# sales.CAP.enrollment_checkout_link_issuance — Enrolment checkout: PaySimple customer, hosted payment link, pending enrolment

A named prospect receives a working payment link for a specific open cohort, and a pending enrolment row exists so the seat and the payment can later be reconciled to that person.

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

# Enrolment checkout: PaySimple customer, hosted payment link, pending enrolment
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.enrollment_checkout_link_issuance`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
A named prospect receives a working payment link for a specific open cohort, and a pending enrolment row exists so the seat and the payment can later be reconciled to that person.
Intended users: prospect (self-serve), Roselyn (sales owner), Taiwo (admissions ops).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Validate the request body against the Zod schema and reject malformed input with 400
- Capture signup consent separately from the purchase
- Validate cohort availability: must be open and not full
- Create or find the PaySimple customer and create the hosted payment link
- Create the pending enrolment row carrying the external id
- Return the link; nothing is charged until the payer pays on the hosted page
**Inputs**
- full_name, email, company, title, phone, company_size, cohort_id (Zod-validated)
- marketing opt-in consent
- the cohort's open/seat state
**Outputs**
- A PaySimple customer id
- a hosted payment link
- an external id of the form CB-{customerId}-{timestamp}
- an enrolments row at payment_status 'pending'
**Exceptions that must be handled**
- Cohort closed or full: 400 before any PaySimple call, so no payable link exists for a seat that does not
- PaySimple call fails: no enrolment row is created and the caller sees an error, rather than a pending row with no link
- The default invoice amount is a hardcoded 4500 (paysimpleService.ts:399) which does not match the live plan prices of 149 and 199 per month (subscriptionService.ts:73-80): any caller relying on the default would issue a wrong-priced link
- The hosted page mints its own PaySimple customer when the payer pays, so the customer id stored here is frequently not the one the charge lands on (appPaymentReconcileService.ts:22-28)
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- read_plan_catalog
- query_cohort_seat_capacity
- query_enrollment_funnel_state
- escalate_to_human
**Application surfaces**
- /enroll
- /enroll/success
- /enroll/cancel
- /pricing
- POST /api/create-invoice
- POST /api/create-invoice-request
- GET /api/cohorts
- GET /api/enrollment/verify
**Source modules**
- backend/src/controllers/enrollmentController.ts
- backend/src/services/enrollmentService.ts
- backend/src/services/paysimpleService.ts
- backend/src/schemas/enrollmentSchema.ts
**Dependencies**
- PaySimple API credentials and environment (live or sandbox)
- an open cohort with seats
- sales.payment_confirmation_and_seat_grant to close the loop
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R4**.
Why that ceiling: Issuing a payment link creates a payable charge against a named person, which is a financial commitment. R5 shadow mode would require a reference stream of real link issuances to compare against and none exists as an approved reference outcome; R6 and above is a production money action and is prohibited. The agent may describe and verify the flow in a sandbox and never issue a production link.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R2)**
The agent explains the checkout flow, the current plan prices from the single source of truth, and what a given enrolment's payment state means.

Acceptance: Every price quoted traces to PLANS (subscriptionService.ts:73-80); the agent refuses to state a price it cannot trace and never uses the 4500 default.
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
- backend/src/routes/enrollmentRoutes.ts:14
- backend/src/controllers/enrollmentController.ts:33-100
- backend/src/services/enrollmentService.ts:19-31 (validateCohortAvailability)
- backend/src/services/enrollmentService.ts:33-66 (createPendingEnrollment)
- backend/src/services/paysimpleService.ts:239-283 (createPaymentLink)
- backend/src/services/paysimpleService.ts:391-414 (createEnrollmentInvoice)
- backend/src/models/Enrollment.ts:309 (table enrollments)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every price quoted traces to PLANS (subscriptionService.ts:73-80); the agent refuses to state a price it cannot trace and never uses the 4500 default.

When every box above is ticked, stop and show the demo.
