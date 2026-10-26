# sales.CAP.pipeline_stage_and_lead_temperature_stewardship — Pipeline stage, lead temperature and forecast stewardship

The pipeline reflects reality: every lead sits at the stage it is actually at, with a temperature and a history, so the forecast is about the business rather than about stale rows.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- The forecast's revenue figure is derived from a stale hardcoded price and must not be reported as revenue (see sales.revenue_definition_integrity_guard)

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Pipeline stage, lead temperature and forecast stewardship
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.pipeline_stage_and_lead_temperature_stewardship`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
The pipeline reflects reality: every lead sits at the stage it is actually at, with a temperature and a history, so the forecast is about the business rather than about stale rows.
Intended users: Roselyn (sales owner), Taiwo (admissions ops), Ali.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Read the lead's current stage, temperature and activity
- Propose or record a stage or temperature change with its history
- Recompute opportunity scores
- Serve pipeline stats and the forecast
**Inputs**
- Lead rows with their stage, temperature and activity history
- opportunity scores
**Outputs**
- Updated stages and temperatures with history
- pipeline stats
- an opportunity score per lead
- a forecast projection
**Exceptions that must be handled**
- The forecast's revenue projection is computed from a hardcoded 4500 per enrolment (revenueDashboardService.ts:11, :94-95), which is not the live price and not collected money: the forecast must be read as a count projection, not a revenue figure
- A stage moved by a human must not be silently moved back by a recompute
- A lead with no activity has no temperature: report unknown rather than cold
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- query_lead_conversion_metrics
- query_enrollment_funnel_state
- assess_enrollment_completion_risk
- escalate_to_human
**Application surfaces**
- /admin/leads
- /admin/lead/:id
- /admin/opportunities
- /admin/pipeline
- PATCH /api/admin/leads/:id/pipeline-stage
- GET /api/admin/leads/pipeline-stats
- GET /api/admin/leads/:id/temperature-history
- PATCH /api/admin/leads/:id/temperature
- GET /api/admin/opportunities
- GET /api/admin/opportunities/summary
- GET /api/admin/opportunities/forecast
- POST /api/admin/opportunities/recompute
**Source modules**
- backend/src/controllers/adminLeadController.ts
- backend/src/controllers/adminOpportunityController.ts
- backend/src/services/inbox/opportunityScoringService.ts
**Dependencies**
- leads
- activities
- the opportunity scoring service
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: Stage and temperature are reversible CRM state that moves no money and reaches no prospect, so a supervised production pilot of proposing moves is defensible. It stops at R6 because writing a stage change without review can silently overwrite a human's judgement about a live deal.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent explains where a named lead sits, what its temperature is based on, and what the pipeline stats say.

Acceptance: Every figure traces to a named endpoint; the forecast is described as a count projection and never as revenue.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- The forecast's revenue figure is derived from a stale hardcoded price and must not be reported as revenue (see sales.revenue_definition_integrity_guard)
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/controllers/adminLeadController.ts:318-353 (handleAdminUpdatePipelineStage)
- backend/src/controllers/adminLeadController.ts:354-371 (handleAdminGetPipelineStats)
- backend/src/controllers/adminLeadController.ts:496-544 (temperature history and update)
- backend/src/controllers/adminOpportunityController.ts:46-72 (handleGetOpportunityScores)
- backend/src/controllers/adminOpportunityController.ts:73-90 (summary)
- backend/src/controllers/adminOpportunityController.ts:82-90 (forecast projections)
- backend/src/controllers/adminOpportunityController.ts:91 (recompute)
- backend/src/routes/admin/insightRoutes.ts:80-83
- frontend/src/pages/admin/AdminOpportunitiesPage.tsx
- frontend/src/pages/admin/AdminLeadsPage.tsx
- frontend/src/pages/admin/AdminLeadDetailPage.tsx

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every figure traces to a named endpoint; the forecast is described as a count projection and never as revenue.

When every box above is ticked, stop and show the demo.
