# sales.CAP.revenue_definition_integrity_guard — Revenue-definition integrity guard: app-originated checkout only

No surface in the business reports revenue that was not collected through an app-originated checkout, so nobody ever plans against a figure that was multiplied into existence.

**Built today:** partial. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- The known live violation at revenueDashboardService.ts:94-95 is unfixed; whether that surface should be corrected or retired is a decision for Ali and Roselyn

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Revenue-definition integrity guard: app-originated checkout only
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.revenue_definition_integrity_guard`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** partial · **Source:** existing_application
## The business outcome
No surface in the business reports revenue that was not collected through an app-originated checkout, so nobody ever plans against a figure that was multiplied into existence.
Intended users: Roselyn (sales owner), Ali, finance, marketing.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Enumerate every surface that renders a revenue figure
- Trace each figure to its source
- Flag any figure derived from a count times a price, or from an enrolment rather than a payment
- Report the finding; the fix is a code change a human makes
**Inputs**
- Every surface that states a revenue figure
- the metric registry's status for each metric
- the collected-revenue source of truth
**Outputs**
- A list of surfaces whose revenue figure is not app-originated-collected
- the specific rule each one breaks
- no edits
**Exceptions that must be handled**
- An enrolment is not a payment: a campaign with ten enrolments and no collected money must not report revenue
- A missing source becomes unavailable with a reason, never zero
- revenueDashboardService.ts:94-95 still ships actualRevenue as enrolled x 4500, the exact pattern deleted from campaignLinkService and declared unavailable in metricRegistry: this is a live, unfixed violation and is reported, not silently corrected here
- paysimpleService.ts:399 defaults an invoice to 4500, a third copy of the same stale price
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- detect_revenue_definition_violation
- query_revenue_payments_feed
- create_tickets
- escalate_to_human
**Application surfaces**
- /admin/revenue
- /admin/marketing
- /admin/pipeline
- GET /api/admin/revenue/payments
- GET /api/admin/marketing/...
**Source modules**
- backend/src/services/adminOs/metricRegistry.ts
- backend/src/services/campaignLinkService.ts
- backend/src/services/marketingAnalyticsService.ts
- backend/src/services/revenueDashboardService.ts
**Dependencies**
- the metric registry
- sales.revenue_and_subscription_reporting
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: The guard only reads and reports, so a supervised production pilot is defensible and valuable. It stops below R7 because fixing a violation is a code change that goes through review, and because the agent must never be the thing that decides a revenue definition.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent states, for any revenue figure it is shown, whether it meets the app-originated-collected rule and which citation says so.

Acceptance: Every verdict cites one of the four rule statements; the agent never asserts a revenue number of its own.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- The known live violation at revenueDashboardService.ts:94-95 is unfixed; whether that surface should be corrected or retired is a decision for Ali and Roselyn
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/appPaymentReconcileService.ts:30-47 (the scope guard and its rationale)
- backend/src/services/adminOs/metricRegistry.ts:181-188 (net revenue status 'unavailable', 'reconciled against app-originated checkouts only')
- backend/src/services/adminOs/metrics/marketingMetrics.ts:169-174 (ROAS unavailable)
- backend/src/services/campaignLinkService.ts:12-28 ('revenue in this business means app-originated checkout only')
- backend/src/services/marketingAnalyticsService.ts:6-33 (the enrolments x 4500 figure removed, with the reasoning)
- backend/src/services/revenueDashboardService.ts:11 (PRICE_PER_ENROLLMENT = 4500, still live)
- backend/src/services/revenueDashboardService.ts:94-95 (actualRevenue = enrolled x 4500)
- backend/src/services/__tests__/marketingMetricHonesty.test.ts

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every verdict cites one of the four rule statements; the agent never asserts a revenue number of its own.

When every box above is ticked, stop and show the demo.
