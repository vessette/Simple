# sales.CAP.enrollment_completion_follow_through — Enrolment completion follow-through, from checkout started to seat active

Nobody who intended to enrol is lost between starting a checkout and holding an active seat; each stalled enrolment is owned, visible and chased by a named person.

**Built today:** partial. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Roselyn is not provisioned on Basecamp, so sales follow-through tasks today go unassigned or to Taiwo (PROGRESS.md:1563; generateLaunchTasks.js:66)
- The step-by-step definition of 'completion' is unknown until Roselyn names the steps and the owner of each

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Enrolment completion follow-through, from checkout started to seat active
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.enrollment_completion_follow_through`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** partial · **Source:** manager_defined
## The business outcome
Nobody who intended to enrol is lost between starting a checkout and holding an active seat; each stalled enrolment is owned, visible and chased by a named person.
Intended users: Roselyn (sales owner), Taiwo (admissions ops).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Enumerate every enrolment that is not yet an active paid seat, by the step it is stuck at
- Attribute each to the named owner for that step
- State the specific next action and who performs it
- Carry the state forward so a stuck enrolment is still visible tomorrow
**Inputs**
- Pending and abandoned checkouts
- pending_invoice enrolments
- paid enrolments without portal access
- the payment-readiness campaign state
**Outputs**
- A per-person follow-through state and owner
- a list of enrolments stuck at a named step
- the specific next action for each
**Exceptions that must be handled**
- A paid student locked out of the portal is a completion failure, not a payment failure: nine real depositors were silently locked out for two weeks (enrollmentService.ts:232-242)
- An invoice-path enrolment reserves its seat immediately, so a stalled invoice holds a seat that a paying student cannot buy
- A person who both abandoned a checkout and holds a free Explorer account must appear once, as one person
- Roselyn is not on Basecamp, so the owner of a sales step may be unassigned or Taiwo today, which means the owner field can be honestly empty
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- assess_enrollment_completion_risk
- query_enrollment_funnel_state
- detect_abandoned_checkout
- create_tickets
- escalate_to_human
**Application surfaces**
- /admin/accelerator/enrollments
- /admin/leads
- /admin/revenue
- GET /api/admin/enrollments
- GET /api/admin/revenue/payments
**Source modules**
- backend/src/services/enrollmentService.ts
- frontend/src/pages/admin/enrollmentPaymentFilter.ts
**Dependencies**
- sales.abandoned_checkout_identification
- sales.payment_confirmation_and_seat_grant
- an owner surface Roselyn can reach
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R5**.
Why that ceiling: Assembling and maintaining the follow-through list is read-only, and shadow mode against Roselyn's own judgement of who is genuinely stuck is reachable once she can see the list. The contact itself needs live_email and stays human, so nothing above R5 applies.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent states, for a named person, which step of enrolment they are stuck at and what the next action is.

Acceptance: Every state traces to the enrolment and subscription rows; a person with two rows is reported as one person, and an unowned step is reported as unowned rather than assigned to whoever is handy.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Roselyn is not provisioned on Basecamp, so sales follow-through tasks today go unassigned or to Taiwo (PROGRESS.md:1563; generateLaunchTasks.js:66)
- The step-by-step definition of 'completion' is unknown until Roselyn names the steps and the owner of each
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- CLAUDE_CODE_AI_EMPLOYEE_CONSOLIDATION_LOOP_PROMPT.md:106
- CLAUDE_CODE_AI_EMPLOYEE_CONSOLIDATION_LOOP_PROMPT.md:319 ('Roselyn owns Sales, Enrollments and Subscriptions')
- backend/src/scripts/setupLaunchProject.js:104-111
- backend/src/scripts/generateLaunchTasks.js:66 ('Roselen is the Sales/Admissions human-in-the-loop')
- frontend/src/pages/admin/enrollmentPaymentFilter.ts:1-20
- backend/src/services/enrollmentService.ts:443-471 (the Payment Readiness Campaign auto-enrol)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every state traces to the enrolment and subscription rows; a person with two rows is reported as one person, and an unowned step is reported as unowned rather than assigned to whoever is handy.

When every box above is ticked, stop and show the demo.
