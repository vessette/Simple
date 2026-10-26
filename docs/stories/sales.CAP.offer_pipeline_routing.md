# sales.CAP.offer_pipeline_routing — Offer pipeline classification for unrouted leads

Every inbound lead lands in the right offer pipeline (accelerator, advisory, custom build, enterprise) so no enquiry sits unrouted and the offer discussed is the right one.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Offer pipeline classification for unrouted leads
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.offer_pipeline_routing`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** inherited
## The business outcome
Every inbound lead lands in the right offer pipeline (accelerator, advisory, custom build, enterprise) so no enquiry sits unrouted and the offer discussed is the right one.
Intended users: Roselyn (sales owner), Taiwo (admissions ops).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Select leads with no offer pipeline set
- Classify each into accelerator, advisory, custom_build or enterprise
- Write the label
- Leave genuinely ambiguous leads unlabelled and surface them for a human
**Inputs**
- Unrouted lead rows
- lead source, form type, UTM parameters, company size
**Outputs**
- An offer-pipeline label per lead
- a list of leads the classifier could not place
**Exceptions that must be handled**
- Contradictory signals: leave unrouted and list for a human rather than picking the larger offer
- A new offer exists the classifier does not know: the lead stays unrouted, and adding an offer is a manager decision
- Lead already routed by a human: never overwrite a human routing
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- evaluate_offer_pipeline_fit
- query_enrollment_funnel_state
- escalate_to_human
**Application surfaces**
- /admin/leads
- /admin/lead/:id
- /admin/opportunities
- GET /api/admin/leads
- PATCH /api/admin/leads/:id
- GET /api/admin/opportunities
**Source modules**
- backend/src/services/agents/offerRoutingAgent.ts
- backend/src/controllers/adminLeadController.ts:281-317
**Dependencies**
- leads table
- the offer taxonomy
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: A routing label is reversible, moves no money and reaches no prospect, so a separately approved supervised production pilot is defensible. It stops at R6 because overwriting a human's manual routing is an authorized-action-class question Roselyn has not been asked.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent explains, from the approved offer taxonomy, which pipeline a described lead belongs to and why.

Acceptance: Every answer cites the taxonomy rule it used, and an unmappable lead returns 'cannot place' rather than a guess.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/agentRegistrySeed.ts:2209-2219
- backend/src/services/aiOpsScheduler.ts:341
- backend/src/services/agents/offerRoutingAgent.ts
- .loop-architect/runs/20261007-school-agent-factory/legacy-slices/sales.json (row 14)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every answer cites the taxonomy rule it used, and an unmappable lead returns 'cannot place' rather than a guess.

When every box above is ticked, stop and show the demo.
