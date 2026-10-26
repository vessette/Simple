# sales.CAP.renewal_and_revenue_follow_through_worklist — Renewal and revenue follow-through worklist

Roselyn starts each day with a short, ordered list of members whose money needs attention, renewals due, past due, lapsed, cards expiring, rather than reading five dashboards.

**Built today:** partial. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- The ordering rule and the definition of 'needs attention' are unknown until Roselyn names them
- The exclusion lists are hardcoded in a service file rather than configurable, so a new exclusion needs a code change

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Renewal and revenue follow-through worklist
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.renewal_and_revenue_follow_through_worklist`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** partial · **Source:** manager_defined
## The business outcome
Roselyn starts each day with a short, ordered list of members whose money needs attention, renewals due, past due, lapsed, cards expiring, rather than reading five dashboards.
Intended users: Roselyn (sales owner), Ali.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Gather renewals due, past due, lapsed without follow-up and expiring cards
- Remove anyone on a standing exclusion list
- Order by consequence rather than by date alone
- State the reason and the next action per row; a human makes every contact
**Inputs**
- Subscriptions by status and period end
- lapsed-without-follow-up rows
- past-due rows
- card-expiry findings
- the exclusion lists
**Outputs**
- One ordered worklist per day with a reason per row and the named next action
- an explicit empty list when nothing needs attention
**Exceptions that must be handled**
- Two members are on hardcoded exclusion lists, awaiting ACH consent and card-blocked (subscriptionScheduleService.ts:34-63): these must never be chased as ordinary renewals
- A lapsed period is written off, never back-charged (paysimpleRecurring.ts:84), so a lapse row must never propose a catch-up charge
- An empty list must be reported as empty; a padded worklist is worse than none
- The ordering rule is unknown until Roselyn says what she wants first
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- identify_renewal_followup_candidates
- query_subscription_ledger
- monitor_billing_health
- escalate_to_human
**Application surfaces**
- /admin/revenue
- GET /api/admin/revenue/subscriptions
- GET /api/admin/revenue/payments
**Source modules**
- backend/src/services/billing/billingHealthCheck.ts
- backend/src/services/subscriptionAnalyticsService.ts
- backend/src/services/subscriptionScheduleService.ts
**Dependencies**
- sales.billing_health_watch
- sales.revenue_and_subscription_reporting
- the standing exclusion lists
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R5**.
Why that ceiling: Building the worklist reads money data and writes none. Shadow mode against Roselyn's own daily list is reachable. Every row's action is a contact or a charge, both of which stay human, so nothing above R5 applies.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent answers which members need renewal attention today and why.

Acceptance: Every row cites its source check; excluded members are provably absent; an empty day is reported as empty.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- The ordering rule and the definition of 'needs attention' are unknown until Roselyn names them
- The exclusion lists are hardcoded in a service file rather than configurable, so a new exclusion needs a code change
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- CLAUDE_CODE_AI_EMPLOYEE_CONSOLIDATION_LOOP_PROMPT.md:106
- backend/src/scripts/setupLaunchProject.js:104-111
- backend/src/services/billing/billingHealthCheck.ts:102 (LAPSED_WITHOUT_FOLLOWUP_SQL)
- backend/src/services/billing/billingHealthCheck.ts:181 (checkExpiringCards)
- backend/src/services/subscriptionScheduleService.ts:249 (markPastDueForSchedule)
- backend/src/services/subscriptionAnalyticsService.ts:305-400 (needs-attention list)
- backend/src/services/renewal/renewalReminderSelection.ts:92 (LAPSE_FOLLOWUP_DAYS 1 and 7)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every row cites its source check; excluded members are provably absent; an empty day is reported as empty.

When every box above is ticked, stop and show the demo.
