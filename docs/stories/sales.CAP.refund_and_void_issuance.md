# sales.CAP.refund_and_void_issuance — Refund and void issuance against a settled or unsettled payment

A customer who is owed money back gets it, once, with a ledger row and the granted account credit voided, and no refund can exceed what was collected.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- The refund and cancellation terms are drafted and pending final approval (backend/src/controllers/salesHubCoryController.ts:33), so there is no approved policy for any capability to apply

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Refund and void issuance against a settled or unsettled payment
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.refund_and_void_issuance`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
A customer who is owed money back gets it, once, with a ledger row and the granted account credit voided, and no refund can exceed what was collected.
Intended users: Roselyn (sales owner), Ali (approver), finance.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Look up the payment and preview it for the human
- Guard against over-refunding using prior refunded cents
- Reject partial amounts: the gateway supports full reversal only
- Decide void versus reverse from the settlement state
- Write the ledger row as pending, call the gateway, then mark succeeded or failed
**Inputs**
- payment_id
- optional amount in dollars
- optional reason
- the issuing admin's email
**Outputs**
- A refunds ledger row written pending before the gateway call and then marked succeeded or failed
- a gateway void or full reversal
- the granted account credit voided
**Exceptions that must be handled**
- Partial refund requested: rejected with partial_unsupported, because no partial route exists on the gateway
- Already reversed: rejected with already_reversed
- Not settled: void rather than reverse, decided from isSettled and isVoidable
- Billing unconfigured: 503 before any attempt
- The ledger row is deliberately written before the gateway call so a gateway failure leaves evidence rather than silence
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- query_refund_ledger
- propose_refund_recommendation
- escalate_to_human
**Application surfaces**
- /admin/refunds
- GET /api/admin/refunds
- GET /api/admin/refunds/lookup
- POST /api/admin/refunds
**Source modules**
- backend/src/services/refundService.ts
- backend/src/controllers/adminRefundController.ts
**Dependencies**
- PaySimple credentials
- the refunds table
- account_credits for the credit void
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R2**.
Why that ceiling: A refund moves money out and is irreversible. This is the hardest stop in the domain: the agent may answer questions about the refund ledger and the stated policy and, at most, hand a human a recommendation to consider. It never touches the refund path, not even in a sandbox, because the refund policy itself is recorded as drafted and pending approval (salesHubCoryController.ts:33) and exercising an unapproved policy is not a sandbox detail.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R2)**
The agent answers refund-ledger and refund-policy questions from approved knowledge, and may draft a recommendation for a human to accept or reject.

Acceptance: Every answer cites the ledger row or the approved policy text; where the policy is unapproved the agent says so rather than stating terms, and it never asserts that a refund will be issued.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- The refund and cancellation terms are drafted and pending final approval (backend/src/controllers/salesHubCoryController.ts:33), so there is no approved policy for any capability to apply
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/routes/admin/refundRoutes.ts:7-9
- backend/src/controllers/adminRefundController.ts:4-53
- backend/src/services/refundService.ts:59 (lookupPayment)
- backend/src/services/refundService.ts:93-203 (issueRefund)
- backend/src/services/paysimpleService.ts:353-362 (isVoidable, isSettled)
- backend/src/services/paysimpleService.ts:367 (voidPayment)
- backend/src/services/paysimpleService.ts:374 (refundPayment, full reversal only)
- backend/src/models/Refund.ts:70 (table refunds)
- frontend/src/pages/admin/AdminRefundsPage.tsx

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every answer cites the ledger row or the approved policy text; where the policy is unapproved the agent says so rather than stating terms, and it never asserts that a refund will be issued.

When every box above is ticked, stop and show the demo.
