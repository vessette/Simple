# sales.CAP.payment_webhook_replay_dedup_watch — Payment webhook replay and delivery-dedup gap watch

A replayed or duplicated payment notification cannot quietly advance a billing period or grant a second seat, and the absence of a delivery-level dedup store stops being invisible.

**Built today:** absent. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- Whether a differing-payment-id replay has ever occurred is unknown: there is no delivery-level record to measure against
- Adding a delivery-keyed dedup store is a schema change and therefore a governance escalation, not an implementation decision

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Payment webhook replay and delivery-dedup gap watch
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.payment_webhook_replay_dedup_watch`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** absent · **Source:** proposed_new
## The business outcome
A replayed or duplicated payment notification cannot quietly advance a billing period or grant a second seat, and the absence of a delivery-level dedup store stops being invisible.
Intended users: Roselyn (sales owner), Ali, platform on-call, finance.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Read the health window and the recent period advances and seat grants
- Look for state changes that a replayed delivery could explain
- Report each with the dedup mechanism that did or did not protect it
- Say plainly that protection is business-state-derived per path, not delivery-keyed
**Inputs**
- Webhook health samples
- advanced billing periods and their payment ids
- seat-grant events
- event ids as logged
**Outputs**
- A report of suspected replays and of any state change that a replay could have caused
- an explicit statement that no delivery-level dedup store exists
**Exceptions that must be handled**
- There is no webhook_events table, no unique index on event_id and no replay-dedup store: protection comes from four separate business-state guards, each scoped to its own path
- The recurring-charge path is keyed on payment id rather than subscription status, on purpose, because a status guard would make every renewal a no-op: a replay carrying a different payment id for the same schedule is therefore not covered by that key
- Whether such a replay has ever occurred is unknown: no delivery-level record exists to check against
- This watch reports; it must not add or change a guard
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- detect_payment_webhook_replay_gap
- query_subscription_ledger
- create_tickets
- escalate_to_human
**Application surfaces**
- /admin/revenue
- /admin/ops
- POST /api/webhook/paysimple (observed, not called)
**Source modules**
- backend/src/controllers/webhookController.ts
- backend/src/services/paysimpleWebhookHealth.ts
- backend/src/services/subscriptionScheduleService.ts
**Dependencies**
- the webhook health window
- subscriptions
- cohorts.seats_taken
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: The watch reads and reports only. A supervised production pilot is defensible because the thing it watches is already happening whether or not anyone is looking. Adding a dedup store is a schema change that goes through review, so R7 is prohibited.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R0)**
The replay surface is documented: each path, its dedup key, and what that key does and does not cover.

Acceptance: A written table names all four existing guards and states explicitly which replay shapes remain uncovered.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- Whether a differing-payment-id replay has ever occurred is unknown: there is no delivery-level record to measure against
- Adding a delivery-keyed dedup store is a schema change and therefore a governance escalation, not an implementation decision
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/controllers/webhookController.ts:54 (event_id is read for logging only)
- backend/src/controllers/webhookController.ts:83-105 (the recurring-charge path)
- backend/src/services/subscriptionScheduleService.ts:194-218 (idempotency keyed on payment id, deliberately not on subscription status)
- backend/src/services/subscriptionService.ts:423 (activation idempotency keyed on status)
- backend/src/services/paymentReconciliationService.ts:199 (the seats_taken guard)
- backend/src/services/paysimpleWebhookHealth.ts:21-121 (rolling window, severity 9 critical and severity 6 warning)
- backend/src/services/schedulerService.ts:2194-2200

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] A written table names all four existing guards and states explicitly which replay shapes remain uncovered.

When every box above is ticked, stop and show the demo.
