# sales.CAP.outbound_sequence_health_watch — Outbound sequence health watch: detect and propose

A broken or stalled outbound sequence is found and reported with a proposed repair, so the sales pipeline does not silently stop moving while still looking healthy.

**Built today:** partial. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Executing any proposed repair that re-sends mail needs live_email, a default-denied capability
- Ownership is contested: these three legacy agents are campaign-delivery infrastructure whose natural owner may be the marketing or platform domain rather than sales

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Outbound sequence health watch: detect and propose
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.outbound_sequence_health_watch`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** partial · **Source:** inherited
## The business outcome
A broken or stalled outbound sequence is found and reported with a proposed repair, so the sales pipeline does not silently stop moving while still looking healthy.
Intended users: Roselyn (sales owner), Ali (approver), platform on-call.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Scan active outbound sequences
- Compute a health score from connectivity, delivery rate, generation success, engagement and error rate
- Identify stalled sequences and failed sends
- Write the finding plus a named proposed repair
- Stop; executing the repair is a separate, human-approved step
**Inputs**
- Active campaign rows
- scheduled send records and their failure states
- channel connectivity state
- delivery, engagement and error rates
**Outputs**
- A health score 0-100 per sequence
- a list of stalled sequences (active leads, no pending actions)
- a named proposed repair per finding, unexecuted
**Exceptions that must be handled**
- A channel provider cannot be reached: report the finding as unknown rather than scoring the sequence healthy
- The failure is a provider outage, not a configuration fault: the proposal must say so rather than proposing a retry that will fail again
- The same finding recurs across runs: deduplicate, so a genuinely new finding is not buried
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- detect_stalled_outbound_sequence
- create_tickets
- escalate_to_human
**Application surfaces**
- /admin/campaigns
- /admin/ops
- GET /api/admin/campaigns
- GET /api/admin/campaign-diagnostics
**Source modules**
- backend/src/services/campaignHealthScanner.ts
- backend/src/services/agents/campaignRepairAgent.ts
- backend/src/services/agents/campaignSelfHealingAgent.ts
**Dependencies**
- campaigns and campaign_health tables
- scheduled send records
- channel provider status
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: Detection and reporting are read-only, so a supervised production pilot of the watch is defensible. It stops short of R7 because the legacy agents' auto-retry, auto-heal and auto-resolve are exactly the action classes nobody has authorized, and because billingHealthCheck.ts:8-11 states the standing rule that a watchdog which can act can cause the incident it was built to catch.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent answers, from the approved health rules, why a named sequence scores as it does.

Acceptance: Every score is traceable to its input components, and an unreachable component yields unknown rather than a passing default.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Executing any proposed repair that re-sends mail needs live_email, a default-denied capability
- Ownership is contested: these three legacy agents are campaign-delivery infrastructure whose natural owner may be the marketing or platform domain rather than sales
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/agentRegistrySeed.ts:318-328
- backend/src/services/agentRegistrySeed.ts:329-343
- backend/src/services/agentRegistrySeed.ts:496-510
- backend/src/services/aiOpsScheduler.ts:174
- backend/src/services/aiOpsScheduler.ts:175
- backend/src/services/aiOpsScheduler.ts:179
- backend/src/services/campaignHealthScanner.ts
- backend/src/services/agents/campaignRepairAgent.ts
- backend/src/services/agents/campaignSelfHealingAgent.ts
- backend/src/services/billing/billingHealthCheck.ts:8-11

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every score is traceable to its input components, and an unreachable component yields unknown rather than a passing default.

When every box above is ticked, stop and show the demo.
