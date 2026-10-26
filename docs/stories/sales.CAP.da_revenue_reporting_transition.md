# sales.CAP.da_revenue_reporting_transition — Data Analyst revenue and enrolment reporting duties transitioning to AI

The recurring revenue, enrolment and pipeline reporting a human analyst does by hand becomes a drafted, traceable report, once anyone writes down what that work actually is.

**Built today:** unknown. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- The Data Analyst duty list for this domain does not exist in the repository: this capability cannot be scoped, sized or promoted until Roselyn is interviewed
- REPORTING_MAP.md:15 records that no report-definition object exists, so there is nothing to transition onto either

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Data Analyst revenue and enrolment reporting duties transitioning to AI
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.da_revenue_reporting_transition`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** unknown · **Source:** proposed_new
## The business outcome
The recurring revenue, enrolment and pipeline reporting a human analyst does by hand becomes a drafted, traceable report, once anyone writes down what that work actually is.
Intended users: Roselyn (sales owner), Ali, finance.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Interview Roselyn and whoever currently does the analyst work, and write down each recurring report: what it covers, who receives it, how often, in which timezone, over which channel
- Map each duty to an existing data source or record it as unsourced
- Only then propose which duties an agent drafts and which stay human
**Inputs**
- unknown: the Data Analyst duty list for this domain does not exist in the repository
**Outputs**
- unknown until the duty list exists
- the one certain output is the duty list itself, produced by interviewing Roselyn
**Exceptions that must be handled**
- No document in the repository enumerates DA duties for this or any domain; the single DA-to-Roselyn reference is a label in a mockup, which is not a responsibility list
- The nearest artifact, REPORTING_MAP.md, confirms that no object combining report, recipient, cadence, timezone and channel exists
- A 'Data Analyst agent' does exist in the repository but is an unrelated deterministic SQL-result enrichment helper, not an owner of reporting duties: it must not be mistaken for this capability
- Until the duty list exists, no scope, no count and no autonomy ceiling above R0 can be set honestly
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- escalate_to_human
- read_attachments
**Application surfaces**
- unknown
- unknown
**Source modules**
- unknown
**Dependencies**
- a recorded interview with Roselyn
- sales.revenue_and_subscription_reporting
- a reporting-definition object that does not exist today
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R0**.
Why that ceiling: The scope of this capability is unknown, and an autonomy ceiling over an undefined scope would be a fabrication. R0, defining the workflow and the human decisions, is the only honest level until the duty list exists. This is deliberately the lowest ceiling in the matrix.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R0)**
Interview Roselyn, enumerate each recurring analyst report with its recipient, cadence, timezone and channel, and record which duties are candidates for drafting.

Acceptance: A written duty list exists with at least one named report per duty and a named data source or an explicit 'unsourced' per report. Until it exists this capability stays at R0 and reports its scope as unknown rather than guessing one.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- The Data Analyst duty list for this domain does not exist in the repository: this capability cannot be scoped, sized or promoted until Roselyn is interviewed
- REPORTING_MAP.md:15 records that no report-definition object exists, so there is nothing to transition onto either
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- .loop-architect/runs/20261007-school-agent-factory/execution-contract.md:45-47 (amendment item 11, the DA-transition requirement)
- .loop-architect/runs/20261007-school-agent-factory/plan.md:307-309 (source 4: DA responsibilities transitioning to AI)
- .loop-architect/runs/20261007-school-agent-factory/plan.md:633-642 (the manager-interview story that is supposed to produce the duty list)
- docs/admin-knowledge-ops-mockup.html:883-886 (the only DA-to-Roselyn link anywhere: a mockup persona labelled 'DA Admissions')
- docs/architecture/ai-workforce-management/REPORTING_MAP.md:15 ('Confirmed absent: any single object combining what to report on, who receives it, how often, in what timezone, over which channel')

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] A written duty list exists with at least one named report per duty and a named data source or an explicit 'unsourced' per report. Until it exists this capability stays at R0 and reports its scope as unknown rather than guessing one.

When every box above is ticked, stop and show the demo.
