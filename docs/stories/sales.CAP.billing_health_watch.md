# sales.CAP.billing_health_watch — Billing health watch: duplicates, lapses, expiring cards, schedules against the book

Billing problems that quietly cost money or quietly overcharge a member are surfaced daily to a human, by a watchdog that cannot itself charge or cancel anything.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Emailing the report needs live_email; the agent renders, the existing sender delivers
- There is no named rule for suppressing a recurring finding: unknown until Roselyn sets one

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Billing health watch: duplicates, lapses, expiring cards, schedules against the book
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.billing_health_watch`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
Billing problems that quietly cost money or quietly overcharge a member are surfaced daily to a human, by a watchdog that cannot itself charge or cancel anything.
Intended users: Roselyn (sales owner), Ali, finance.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Run the five checks: duplicate actives, lapsed without follow-up, reminder job alive, expiring cards, schedules matching the book
- Filter the gateway's schedules to our own prices so the legacy bootcamp's schedules do not appear
- Render the report and stay silent when nothing needs a human
- Default to dry run: emailing is an explicit choice
**Inputs**
- subscriptions and their schedule ids
- the gateway's recurring-schedule list
- card expiry data
- the reminder job's last-run state
**Outputs**
- A findings report with a severity per finding
- silence when healthy
- no writes of any kind
**Exceptions that must be handled**
- The gateway cannot be read: report the check as unknown rather than passing it
- A finding recurs daily: it must not drown the report; recurrence needs a named rule which is unknown today
- The watchdog must never act: a watchdog that can act can cause the incident it was meant to catch
- Schedules belonging to the legacy bootcamp must never be counted as ours
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- monitor_billing_health
- query_subscription_ledger
- create_tickets
- escalate_to_human
**Application surfaces**
- /admin/revenue
- (no HTTP route; scheduled job)
**Source modules**
- backend/src/services/billing/billingHealthCheck.ts
- backend/src/services/billing/billingHealthReport.ts
- backend/src/services/billing/billingGatewayState.ts
**Dependencies**
- PaySimple read credentials
- subscriptions
- the renewal reminder job
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: The existing implementation is read-only by explicit design, so a supervised production pilot of the watch is the natural ceiling. R7 is prohibited because the only actions a finding implies are charging, cancelling or changing a schedule, all of which are human decisions.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent explains each finding, its severity and what a human would have to do about it.

Acceptance: Every finding cites the check that produced it; an unreadable source yields unknown rather than a pass.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Emailing the report needs live_email; the agent renders, the existing sender delivers
- There is no named rule for suppressing a recurring finding: unknown until Roselyn sets one
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/billing/billingHealthCheck.ts:8-11 ('READ ONLY. This never writes, never charges, never cancels')
- backend/src/services/billing/billingHealthCheck.ts:47 (checkDuplicateActive)
- backend/src/services/billing/billingHealthCheck.ts:102 (LAPSED_WITHOUT_FOLLOWUP_SQL)
- backend/src/services/billing/billingHealthCheck.ts:122 (checkLapsedWithoutFollowup)
- backend/src/services/billing/billingHealthCheck.ts:152 (checkReminderJobAlive)
- backend/src/services/billing/billingHealthCheck.ts:181 (checkExpiringCards)
- backend/src/services/billing/billingHealthCheck.ts:222 (checkSchedulesMatchBook)
- backend/src/services/billing/billingHealthCheck.ts:298 (runBillingHealthCheck)
- backend/src/services/billing/billingHealthReport.ts:27 (renderReport)
- backend/src/services/billing/billingHealthReport.ts:81 (runBillingWatch, dry-run by default)
- backend/src/services/billing/billingGatewayState.ts:24-26 (OUR_PRICES filters the legacy bootcamp's schedules out)
- backend/src/services/schedulerService.ts:2301-2302

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every finding cites the check that produced it; an unreadable source yields unknown rather than a pass.

When every box above is ticked, stop and show the demo.
