# sales.CAP.payment_confirmation_and_seat_grant — Payment webhook confirmation, seat grant and portal access

When a payment settles, the right person is marked paid, gets portal access, consumes exactly one seat, and is placed on the class-readiness path, with no double counting on a replay.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- No delivery-level webhook dedup exists, so the replay surface cannot be fully characterised today: unknown until a delivery-keyed dedup store or a replay test exists

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Payment webhook confirmation, seat grant and portal access
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.payment_confirmation_and_seat_grant`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
When a payment settles, the right person is marked paid, gets portal access, consumes exactly one seat, and is placed on the class-readiness path, with no double counting on a replay.
Intended users: prospect or member (as subject), Roselyn (sales owner), Taiwo (admissions ops).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Verify the HMAC signature over the raw body and reject on failure
- Classify the event: recurring charge, subscription ref (SUB-), enrolment ref (CB-), or unknown
- Mark paid, grant portal access, increment the seat, or advance the billing period
- Fire the follow-on automation (class-readiness enrolment, funnel row) best-effort
- Record the outcome to the rolling webhook-health window
**Inputs**
- A signed PaySimple webhook body (raw bytes required for HMAC verification)
- event_type, external id, RecurringScheduleId, payment id and amount
**Outputs**
- payment_status 'paid', portal_enabled true, amount_paid and paysimple_payment_id on the enrolment
- cohorts.seats_taken incremented by exactly one
- an active subscription or an advanced billing period
- an accepted or rejected_signature health sample
**Exceptions that must be handled**
- Already paid: return without incrementing seats again (enrollmentService.ts:114-115)
- payment_failed must never override a paid state (enrollmentService.ts:183)
- A real recurring charge that matches no subscription is logged as a loud alert rather than silently dropped (webhookController.ts:95-98)
- A payment with no external id and no schedule is acknowledged with 200 to stop provider retries, and does nothing
- There is no delivery-level dedup store: event_id is read for logging only (webhookController.ts:54), there is no webhook_events table and no unique index on it, so protection is business-state-derived per path rather than per delivery
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- query_subscription_ledger
- query_enrollment_funnel_state
- detect_payment_webhook_replay_gap
- escalate_to_human
**Application surfaces**
- /admin/revenue
- /admin/accelerator/enrollments
- POST /api/webhook/paysimple
**Source modules**
- backend/src/controllers/webhookController.ts
- backend/src/services/enrollmentService.ts
- backend/src/services/subscriptionScheduleService.ts
- backend/src/services/paysimpleWebhookHealth.ts
**Dependencies**
- PaySimple webhook secret
- raw-body capture on the route (express.raw with type always true)
- enrollments, subscriptions, cohorts, account_credits
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R5**.
Why that ceiling: This capability records money and grants paid entitlement; it is the authoritative write for revenue. The agent may observe and, in shadow mode, state what the confirmation outcome should have been and compare it to what the deterministic handler did, because that reference stream exists. It may never perform the write: production_database is default-denied and a wrong confirmation grants or denies a paid seat.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R2)**
The agent explains, for a named person, what their payment and seat state is and which webhook path produced it.

Acceptance: Every claim traces to the enrolment, subscription or health sample it came from; the agent reports unknown where no record exists.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- No delivery-level webhook dedup exists, so the replay surface cannot be fully characterised today: unknown until a delivery-keyed dedup store or a replay test exists
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/routes/webhookRoutes.ts:30
- backend/src/controllers/webhookController.ts:20-185
- backend/src/services/paysimpleService.ts:439-490 (verifyWebhookSignature)
- backend/src/services/enrollmentService.ts:103-149 (markEnrollmentPaid)
- backend/src/services/enrollmentService.ts:178-188 (markEnrollmentFailed)
- backend/src/services/subscriptionScheduleService.ts:199-247 (advancePeriodForScheduledPayment)
- backend/src/services/paysimpleWebhookHealth.ts:27-121

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every claim traces to the enrolment, subscription or health sample it came from; the agent reports unknown where no record exists.

When every box above is ticked, stop and show the demo.
