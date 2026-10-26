# sales.CAP.revenue_and_subscription_reporting — Collected revenue, MRR, ARR, plan mix and tenure reporting

Roselyn and Ali can see what was actually collected, what recurs, which plans people are on and who needs attention, from one place, with every figure traceable.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Delivering a report by mail needs live_email; the agent drafts, a human or the existing sender delivers

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Collected revenue, MRR, ARR, plan mix and tenure reporting
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.revenue_and_subscription_reporting`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
Roselyn and Ali can see what was actually collected, what recurs, which plans people are on and who needs attention, from one place, with every figure traceable.
Intended users: Roselyn (sales owner), Ali, finance.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Read memberships, deposits and refunds separately rather than from a payments table, because none exists
- Compute collected as memberships plus available deposits, and net as collected less succeeded refunds
- Scope paying members to payment_status paid, not Explorer, active
- Serve the drill-down roster behind every aggregate so a number can always be opened
**Inputs**
- enrollments with payment_status paid and amount_paid above zero
- account_credits of reason open_house_deposit
- the refunds ledger
- subscriptions
**Outputs**
- A unified payments feed
- collected and net totals
- MRR, ARR, ARPU
- plan mix, tenure funnel, needs-attention list
- drill-down rosters per plan and tenure bucket
**Exceptions that must be handled**
- There is no local payments table: every figure is derived from enrolments, credits and the refund ledger (metricRegistry.ts:181-188)
- Refund rows are carried in the feed marked not counted, so a reader can see them without them double-counting
- Comped and Explorer members are excluded from paying-member counts by the scope filter
- A figure whose source is unavailable must render unavailable with its reason, never as zero
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- query_revenue_payments_feed
- query_subscription_analytics
- query_refund_ledger
- query_account_credit_ledger
- generate_revenue_report_draft
**Application surfaces**
- /admin/revenue
- /admin/pipeline
- GET /api/admin/revenue/payments
- GET /api/admin/revenue/subscriptions
- GET /api/admin/revenue/explorers
- GET /api/admin/revenue/tenure/:month
- GET /api/admin/revenue/plan/:plan
- GET /api/admin/revenue/dashboard
**Source modules**
- backend/src/services/revenuePaymentsService.ts
- backend/src/services/subscriptionAnalyticsService.ts
- backend/src/services/subscriptionRosterService.ts
- backend/src/controllers/adminRevenueController.ts
**Dependencies**
- enrollments, subscriptions, account_credits, refunds
- the metric registry's status vocabulary
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: Reporting is read-only and moves no money, so a separately approved supervised production pilot of report drafting is defensible. It stops below R7 because no reporting figure may be published without a human reading it, and because a fabricated revenue figure is the single most damaging output this domain can produce.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent answers revenue, MRR, plan-mix and tenure questions from the existing endpoints, citing the source of every figure.

Acceptance: Every figure is reproducible from a named endpoint and filter; the agent reports unavailable rather than zero where a source is missing, and never derives revenue from a price times a count.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Delivering a report by mail needs live_email; the agent drafts, a human or the existing sender delivers
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/routes/admin/settingsRoutes.ts:21-31
- backend/src/controllers/adminRevenueController.ts:15-120
- backend/src/services/revenuePaymentsService.ts:52-90 (three merged reads: memberships, deposits, refunds)
- backend/src/services/revenuePaymentsService.ts:172-187 (collected = memberships + deposits; net = collected - refunds)
- backend/src/services/subscriptionAnalyticsService.ts:159-180 (paying-member scope)
- backend/src/services/subscriptionAnalyticsService.ts:305-400 (MRR, ARR = MRR x 12, ARPU)
- backend/src/services/subscriptionAnalyticsService.ts:463-486 (tenure and plan rosters)
- backend/src/services/subscriptionRosterService.ts:37-99 (deposit-holder and staff rosters)
- frontend/src/pages/admin/AdminRevenueDashboardPage.tsx

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every figure is reproducible from a named endpoint and filter; the agent reports unavailable rather than zero where a source is missing, and never derives revenue from a price times a count.

When every box above is ticked, stop and show the demo.
