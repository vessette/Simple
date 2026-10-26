# sales.CAP.strategy_call_no_show_detection_and_recovery — Strategy-call no-show detection and recovery queue

A prospect who misses a strategy call is detected within fifteen minutes and placed on a recovery path, rather than quietly falling out of the pipeline.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Daylight-saving and clock-skew behaviour at the 30-minute boundary is unknown: no boundary test exists

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Strategy-call no-show detection and recovery queue
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.strategy_call_no_show_detection_and_recovery`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** inherited
## The business outcome
A prospect who misses a strategy call is detected within fifteen minutes and placed on a recovery path, rather than quietly falling out of the pipeline.
Intended users: Roselyn (sales owner), Taiwo (admissions ops).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Select calls more than 30 minutes past their scheduled time still marked scheduled
- Mark them no_show and auto-complete the associated CampaignLead
- Cancel any pending prep nudges
- Place the lead on the recovery queue; the outbound contact itself stays with a human or the existing deterministic sender
**Inputs**
- Scheduled strategy-call appointments
- current time
- a 30-minute grace threshold
**Outputs**
- Appointments marked no_show
- completed CampaignLead rows
- cancelled prep nudges
- a recovery queue of leads for a human to contact
**Exceptions that must be handled**
- The call happened but was never marked complete: a human must be able to reverse a no_show, and the reversal must not silently fail to restore what was cancelled
- Lead already on the recovery queue: do not enrol twice
- Clock skew or a daylight-saving transition at the 30-minute boundary: behaviour is unknown, no boundary test exists
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- detect_strategy_call_no_show
- query_enrollment_funnel_state
- escalate_to_human
**Application surfaces**
- /admin/appointments
- /admin/leads
- GET /api/admin/appointments
**Source modules**
- backend/src/services/schedulerService.ts:2335
- backend/src/controllers/adminAppointmentController.ts
**Dependencies**
- appointment records
- campaign_leads
- scheduled nudges
- an active recovery sequence
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R4**.
Why that ceiling: Detection is harmless, but the legacy behaviour ends in enrolling a real person into an outbound recovery sequence, which is prospect contact requiring live_email. The agent is therefore capped at stateful sandbox work and the contact stays human.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent explains which calls qualify as no-shows and why, from the approved rule.

Acceptance: Every answer names the scheduled time, the grace threshold and the current status, and no answer asserts a count without the underlying rows.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Daylight-saving and clock-skew behaviour at the 30-minute boundary is unknown: no boundary test exists
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/agentRegistrySeed.ts:93-104
- backend/src/services/schedulerService.ts:2335
- .loop-architect/runs/20261007-school-agent-factory/legacy-slices/sales.json (row 13)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every answer names the scheduled time, the grace threshold and the current status, and no answer asserts a count without the underlying rows.

When every box above is ticked, stop and show the demo.
