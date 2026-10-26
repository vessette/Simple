# sales.CAP.seat_capacity_and_cohort_fill_forecast — Seat capacity and cohort fill forecast

Roselyn knows how many real seats are left in each cohort and whether it will fill, so the seat-scarcity claim made to prospects is true when it is made.

**Built today:** absent. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Whether a fill projection is statistically supportable at current volumes is unknown and must be measured before any projection is reported

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Seat capacity and cohort fill forecast
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.seat_capacity_and_cohort_fill_forecast`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** absent · **Source:** proposed_new
## The business outcome
Roselyn knows how many real seats are left in each cohort and whether it will fill, so the seat-scarcity claim made to prospects is true when it is made.
Intended users: Roselyn (sales owner), Ali, sales reps.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Read seats_taken and max_seats per cohort
- Separate seats truly consumed from seats reserved by an unpaid invoice
- Project fill from the current pace, stating the basis
- Flag any disagreement between the published seat claim and the real count
**Inputs**
- cohorts.seats_taken and max_seats
- pending invoice reservations
- pending and abandoned checkouts
- the published cap
**Outputs**
- Real seats remaining per cohort
- a fill projection with its basis stated
- a flag when the published claim and the real count disagree
**Exceptions that must be handled**
- An invoice-path enrolment reserves a seat before paying, so seats_taken overstates paid seats: the two must be reported separately
- Explorers do not consume a paid seat and must not appear in the count
- A projection from a handful of data points is not a forecast: report the count and say a projection is unavailable rather than producing one
- If the published cap and the real max_seats disagree, report the disagreement rather than choosing one
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- query_cohort_seat_capacity
- query_enrollment_funnel_state
- escalate_to_human
**Application surfaces**
- /admin/accelerator/cohorts
- /pricing
- /enroll
- GET /api/cohorts
- GET /api/admin/cohorts
**Source modules**
- backend/src/services/enrollmentService.ts
- backend/src/services/cohortService.ts
**Dependencies**
- cohorts
- enrollments
- sales.abandoned_checkout_identification
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: Counting seats is read-only, and a supervised production pilot of the count and the disagreement flag is defensible. It stops below R7 because changing max_seats or a published scarcity claim is a commercial decision, and because an overstated seat claim made to a prospect is a representation risk.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R0)**
The definition of a real remaining seat, the treatment of invoice reservations and Explorers, and the projection basis are written down and reviewed.

Acceptance: The definition distinguishes paid seats, reserved seats and Explorers, and states the minimum data required before a projection is reported at all.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Whether a fill projection is statistically supportable at current volumes is unknown and must be measured before any projection is reported
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/enrollmentService.ts:19-31 (validateCohortAvailability: seats_taken against max_seats)
- backend/src/services/enrollmentService.ts:90-94 (an invoice request reserves a seat immediately)
- backend/src/services/enrollmentService.ts:129-133 (a confirmed payment increments the seat)
- backend/src/services/enrollmentService.ts:329-331 (Explorers deliberately do not consume a paid seat)
- backend/src/controllers/salesHubCoryController.ts:29 (the published Founding Cohort cap of 40 seats)
- backend/src/seeds/seedKbData.ts:231 (the seat-availability KB entry, owner Roselen, response time under an hour)
- backend/src/services/cohortService.ts

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] The definition distinguishes paid seats, reserved seats and Explorers, and states the minimum data required before a projection is reported at all.

When every box above is ticked, stop and show the demo.
