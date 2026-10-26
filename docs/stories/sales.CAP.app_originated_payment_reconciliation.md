# sales.CAP.app_originated_payment_reconciliation — App-originated payment reconciliation after a missed webhook

A student whose payment settled but whose webhook never arrived is linked to their payment and activated, while bootcamp and manual charges on the shared gateway can never leak into our revenue.

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

# App-originated payment reconciliation after a missed webhook
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.app_originated_payment_reconciliation`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
A student whose payment settled but whose webhook never arrived is linked to their payment and activated, while bootcamp and manual charges on the shared gateway can never leak into our revenue.
Intended users: Roselyn (sales owner), Taiwo (admissions ops), Ali.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Build the candidate set from enrolments where our app opened a checkout
- Exclude any PaySimple customer id claimed by more than one enrolment, failing closed
- Match a payment only when the amount is one we asked for and the time follows our checkout
- Activate through the shared activateByRef rather than a second activation path
- Write the enrolment link last, and alert when the checkout-window path fires at all, because that means the webhook is broken
**Inputs**
- Recent gateway payments
- pending app checkouts with their amounts and start times
- our PaySimple customer ids
- a dryRun flag
**Outputs**
- Enrolments marked paid and linked to a payment id
- activated subscriptions
- cancelled duplicate pending subscriptions
- counts of candidates, linked, and linked-by-checkout-window
**Exceptions that must be handled**
- A payment with no matching pending checkout is never linked, which is what keeps bootcamp tuition and manual charges out of revenue
- A shared customer id is excluded entirely: a stranger's charge reaching the wrong enrolment is the failure this invariant prevents
- Running twice must not double-link: linked payment ids are tracked across both tables
- A dry run must change nothing and still report what it would have done
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- monitor_payment_reconciliation_backlog
- query_subscription_ledger
- detect_payment_webhook_replay_gap
- escalate_to_human
**Application surfaces**
- /admin/revenue
- POST /api/admin/revenue/reconcile
**Source modules**
- backend/src/services/appPaymentReconcileService.ts
- backend/src/services/paymentReconciliationService.ts
- backend/src/controllers/adminRevenueController.ts
**Dependencies**
- PaySimple credentials
- enrollments, subscriptions
- sales.subscription_checkout_and_plan_activation
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R5**.
Why that ceiling: Reconciliation marks people paid and activates subscriptions, so the write is a human decision. Shadow mode is the ceiling and is genuinely available here because dryRun gives an approved reference stream: the agent can state what it would link and be compared against the deterministic reconciler's own dry run.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R2)**
The agent explains why a named payment is or is not in scope, naming the origin guard that decided it.

Acceptance: Every in-scope or out-of-scope verdict cites the amount match, the time window and the customer-id scope; the agent never says a payment 'should probably' be linked.
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
- backend/src/services/appPaymentReconcileService.ts:22-47 (the two paths and the scope guard)
- backend/src/services/appPaymentReconcileService.ts:88-104 (selectLinkableMembershipPayments, 'our customers only')
- backend/src/services/appPaymentReconcileService.ts:127-140 (matchesCheckoutOrigin: 'must be an amount WE asked for', 'must follow OUR checkout')
- backend/src/services/appPaymentReconcileService.ts:148-158 (matchesAppCheckout, payer identity)
- backend/src/services/appPaymentReconcileService.ts:281 (reconcileAppPayments)
- backend/src/services/appPaymentReconcileService.ts:213-244 (candidate scan: only enrolments where our app opened a checkout)
- backend/src/routes/admin/settingsRoutes.ts:33
- backend/src/controllers/adminRevenueController.ts:122-140 (dryRun supported)
- backend/src/services/paymentReconciliationService.ts:193-212 (the email and customer-id sweep variant)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every in-scope or out-of-scope verdict cites the amount match, the time window and the customer-id scope; the agent never says a payment 'should probably' be linked.

When every box above is ticked, stop and show the demo.
