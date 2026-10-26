# sales.CAP.renewal_reminder_lifecycle — Renewal reminder and autopay-disclosure lifecycle

A member knows before they are charged and after a lapse, on a fixed cadence, exactly once per period and per reminder kind.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Whether the dark switch should be turned on is a manager and owner decision, not an implementation decision

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Renewal reminder and autopay-disclosure lifecycle
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.renewal_reminder_lifecycle`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
A member knows before they are charged and after a lapse, on a fixed cadence, exactly once per period and per reminder kind.
Intended users: member (recipient), Roselyn (sales owner), Ali.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Select subscriptions due a reminder at 7 days out, 1 day out, or 1 and 7 days after a lapse, in Central time
- Branch on whether the member is on autopay
- Send through the existing deterministic sender, keyed for idempotency
- Send the autopay disclosure ahead of the reminder so the disclosure never arrives second
**Inputs**
- Subscriptions with a current_period_end
- the autopay branch derived from paysimple_schedule_id
- the billing timezone
- the send kill switch
**Outputs**
- One reminder per (subscription, period_end, reminder_kind)
- an autopay disclosure half an hour ahead of the reminders
- nothing at all when the switch is off
**Exceptions that must be handled**
- Container restart or a double fire sends nothing a second time: idempotency is on (subscription_id, period_end, reminder_kind)
- The feature ships dark on purpose because turning it on starts mailing real paying customers
- A stale subscription row with no schedule id reads as manual rather than autopay, which previously misfiled autopay members
- Timezone is Central by contract; a reminder computed in UTC would fire on the wrong day
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- identify_renewal_followup_candidates
- query_subscription_ledger
- escalate_to_human
**Application surfaces**
- /admin/revenue
- (no HTTP route; scheduled job)
**Source modules**
- backend/src/services/renewal/renewalReminderService.ts
- backend/src/services/renewal/renewalReminderSelection.ts
- backend/src/services/renewal/autopayNotice.ts
**Dependencies**
- Mandrill or the configured sender
- subscriptions
- the gateway schedule facts
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R4**.
Why that ceiling: The reminder tells a customer money is about to be taken, which makes the copy and the timing a financial communication. It reaches a real customer, so it needs live_email and is default-denied to the agent. The agent may compute who is due and verify idempotency in a sandbox; the send stays with the existing deterministic job.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent states who is due which reminder kind and when, in Central time.

Acceptance: Every due date is reproducible from current_period_end and the lead-day constants; the agent never claims a reminder was sent without the idempotency record.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Whether the dark switch should be turned on is a manager and owner decision, not an implementation decision
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/schedulerService.ts:2240-2255 (ships dark behind RENEWAL_REMINDERS_ENABLED; idempotent on subscription_id, period_end, reminder_kind)
- backend/src/services/renewal/renewalReminderSelection.ts:60-61 (ADVANCE_LEAD_DAYS 7, FINAL_LEAD_DAYS 1)
- backend/src/services/renewal/renewalReminderSelection.ts:64 (BILLING_TIMEZONE America/Chicago)
- backend/src/services/renewal/renewalReminderSelection.ts:76 (REMINDER_KINDS advance_7d, final_1d, after_lapse_1d, after_lapse_7d)
- backend/src/services/renewal/renewalReminderSelection.ts:92 (LAPSE_FOLLOWUP_DAYS 1 and 7)
- backend/src/services/renewal/renewalReminderService.ts
- backend/src/services/renewal/autopayNotice.ts:46 (AUTOPAY_NOTICE_KIND)
- backend/src/services/renewal/autopayNotice.ts:168 (runAutopayNotices)
- backend/src/services/renewal/renewalReminderEmail.ts:139-174

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every due date is reproducible from current_period_end and the lead-day constants; the agent never claims a reminder was sent without the idempotency record.

When every box above is ticked, stop and show the demo.
