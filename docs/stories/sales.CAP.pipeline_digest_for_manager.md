# sales.CAP.pipeline_digest_for_manager — Sales pipeline digest for the accountable manager

Roselyn opens one recurring digest and knows the state of her pipeline, her enrolments and what needs her today, without assembling it from six admin screens.

**Built today:** partial. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Delivering the digest to Roselyn by mail needs live_email: the agent composes, the existing sender delivers
- The legacy EmailDigest is a generic admin digest, not sales-specific: the generic job stays platform-owned and only the sales slice is claimed here

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Sales pipeline digest for the accountable manager
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.pipeline_digest_for_manager`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** partial · **Source:** inherited
## The business outcome
Roselyn opens one recurring digest and knows the state of her pipeline, her enrolments and what needs her today, without assembling it from six admin screens.
Intended users: Roselyn (sales owner), Ali.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Gather pipeline, enrolment and subscription state
- Compose the digest, marking any figure whose source is unavailable as unavailable rather than zero
- Hand it to the existing digest sender keyed on (date, recipient) so a re-run does not double-send
**Inputs**
- Pipeline counts by stage
- enrolment and checkout state
- the subscription needs-attention list
- configured recipients and schedule
**Outputs**
- One digest per period per recipient
- an explicit 'nothing to report' when that is the truth
- every unavailable figure labelled unavailable with its reason
**Exceptions that must be handled**
- A metric source is unavailable: render it unavailable with the reason, never as 0, the failure metricRegistry.ts:181-188 and marketingAnalyticsService.ts:6-33 exist to prevent
- Digest disabled in settings: produce nothing and say so
- Re-run on the same day: send nothing a second time
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- generate_pipeline_digest
- query_enrollment_funnel_state
- query_subscription_analytics
- read_attachments
**Application surfaces**
- /admin/settings
- /admin/dashboard
- GET /api/admin/settings
- POST /api/admin/digest/test
**Source modules**
- backend/src/services/schedulerService.ts:2515
- backend/src/controllers/adminSettingsController.ts
**Dependencies**
- admin_notification_emails setting
- sales.revenue_and_subscription_reporting
- the existing digest sender
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: The digest reports money but moves none, so a supervised production pilot is reasonable once the unavailable-not-zero rule is proven. It stops below R7 because changing recipients or cadence is a manager decision and the send goes through the existing deterministic sender, not the agent.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
On request the agent answers pipeline-state questions from the same sources the digest would use.

Acceptance: Every figure carries its source, and an unavailable source is reported as unavailable with the reason.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- Delivering the digest to Roselyn by mail needs live_email: the agent composes, the existing sender delivers
- The legacy EmailDigest is a generic admin digest, not sales-specific: the generic job stays platform-owned and only the sales slice is claimed here
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/agentRegistrySeed.ts:225-235
- backend/src/services/schedulerService.ts:2515
- backend/src/routes/admin/settingsRoutes.ts:38
- backend/src/controllers/adminSettingsController.ts (handleSendTestDigest)
- backend/src/services/adminOs/metricRegistry.ts:181-188
- .loop-architect/runs/20261007-school-agent-factory/legacy-slices/sales.json (row 11)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every figure carries its source, and an unavailable source is reported as unavailable with the reason.

When every box above is ticked, stop and show the demo.
