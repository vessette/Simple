# sales.CAP.subscription_churn_and_renewal_risk_analysis — Subscription churn and renewal-risk analysis

The members most likely to lapse are known before they lapse, with the reason, so retention effort goes where it changes the outcome.

**Built today:** absent. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Cancellation-reason data quality is unknown: whether it supports a driver analysis at all has not been measured
- The minimum population for reporting a rate rather than a count is unknown until Roselyn sets it

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Subscription churn and renewal-risk analysis
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.subscription_churn_and_renewal_risk_analysis`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** absent · **Source:** proposed_new
## The business outcome
The members most likely to lapse are known before they lapse, with the reason, so retention effort goes where it changes the outcome.
Intended users: Roselyn (sales owner), Ali.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Assemble tenure, payment and cancellation history per member
- Rank renewal risk and name the driver for each
- Report the churn rate only where the underlying population is measurable
- Hand the list to a human; every retention contact is a human act
**Inputs**
- Subscription tenure and status history
- payment and past-due history
- recorded cancellation reasons
- engagement or attendance signals where they exist
**Outputs**
- A ranked renewal-risk list with a named reason per member
- a measured churn rate by cohort, plan and tenure, or unknown where the data does not support one
**Exceptions that must be handled**
- Recorded cancellation reasons may be sparse or free-text: where they are, report the churn driver as unknown rather than inferring one
- Comped and Explorer members are not paying members and must not appear in a churn rate
- A small population makes a percentage misleading: report counts, not rates, below a threshold Roselyn names
- No risk score may be presented as a prediction of revenue
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- analyze_subscription_churn
- detect_renewal_risk
- query_subscription_analytics
- escalate_to_human
**Application surfaces**
- /admin/revenue
- GET /api/admin/revenue/subscriptions
- GET /api/admin/revenue/tenure/:month
**Source modules**
- backend/src/services/subscriptionAnalyticsService.ts
**Dependencies**
- sales.revenue_and_subscription_reporting
- sales.renewal_and_revenue_follow_through_worklist
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R5**.
Why that ceiling: Analysis is read-only and shadow mode against actual lapses is a genuine reference stream: the agent's risk list can be scored against who actually lapsed. It stops at R5 because the action implied by every row is a contact or a retention offer, both human decisions.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R0)**
The risk definition, the drivers, the exclusions and the minimum population are written down and reviewed.

Acceptance: No risk figure is produced; the data-quality question about cancellation reasons is answered by measurement, not assumption.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Cancellation-reason data quality is unknown: whether it supports a driver analysis at all has not been measured
- The minimum population for reporting a rate rather than a count is unknown until Roselyn sets it
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/subscriptionAnalyticsService.ts:305-486 (tenure funnel and plan rosters, the only tenure view today)
- backend/src/services/subscriptionScheduleService.ts:249 (past_due marking)
- backend/src/services/renewal/renewalReminderSelection.ts:76-92 (lapse follow-up windows)
- backend/src/models/Subscription.ts:85 (canceled_at, cancel_reason)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] No risk figure is produced; the data-quality question about cancellation reasons is answered by measurement, not assumption.

When every box above is ticked, stop and show the demo.
