# sales.CAP.prospect_outreach_draft_for_human_send — Prospect outreach and sales material drafted for a human to send

Roselyn and Ali get ready-to-review outreach and sales material on demand, and the send stays a human act, which is the cadence the business already runs on.

**Built today:** absent. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- Approved brand, tone and claim rules for sales outreach are not yet written down for this domain: unknown until Roselyn and Ali supply them
- Roselyn is not on Basecamp, so the approval step in the recorded cadence has no surface today

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Prospect outreach and sales material drafted for a human to send
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.prospect_outreach_draft_for_human_send`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** absent · **Source:** manager_defined
## The business outcome
Roselyn and Ali get ready-to-review outreach and sales material on demand, and the send stays a human act, which is the cadence the business already runs on.
Intended users: Roselyn (sales owner), Ali (approver), sales reps.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Read the prospect's context and the approved knowledge
- Draft the message or the material, grounding every factual claim
- Attach the source of every price, date and policy claim
- Hand the draft to the named human and stop
**Inputs**
- The prospect's context and stage
- the approved sales knowledge base and pinned facts
- the approved brand and tone rules
- the named human who will send
**Outputs**
- A draft addressed to a named human for review
- the sources every claim rests on
- no send, no queue entry, no scheduled action
**Exceptions that must be handled**
- No price, date or policy may appear in a draft unless it traces to an approved source
- A refund or cancellation claim must not appear at all while those terms are pending approval
- A suppressed or unsubscribed prospect must not be drafted to
- The draft must never be placed on a send queue: that is a send by another name
- The word 'free' must not be used in any material (a standing legal constraint on this business)
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- propose_prospect_outreach_draft
- read_approved_sales_knowledge
- read_plan_catalog
- escalate_to_human
**Application surfaces**
- /admin/leads
- /admin/content-composer
- (no new route; draft is handed over, not posted to a send endpoint)
**Source modules**
- backend/src/controllers/salesHubCoryController.ts (the grounding precedent)
**Dependencies**
- sales.prospect_question_answering_from_approved_kb
- approved brand and tone rules
- suppression state
- a named human sender
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R4**.
Why that ceiling: A draft is a document, but this domain is recorded as the highest external-side-effect risk in the fleet, and the cadence that protects it is that a human sends. live_email is default-denied, so the agent is capped at stateful sandbox drafting; human_decision stays true because a draft states prices and therefore makes a financial representation.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R1)**
Drafting runs against committed prospect fixtures in an isolated dev environment, with no send path linked.

Acceptance: Baseline tests pass, and a draft containing an untraceable price or the word 'free' fails a named test.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- Approved brand, tone and claim rules for sales outreach are not yet written down for this domain: unknown until Roselyn and Ali supply them
- Roselyn is not on Basecamp, so the approval step in the recorded cadence has no surface today
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/scripts/setupLaunchProject.js:104-111
- backend/src/scripts/setupLaunchProject.js:108 ('CB drafts sales material -> Ali approval -> Roselen executes calls -> Taiwo tracks enrollments + subscriptions')
- backend/src/scripts/generateLaunchTasks.js:66
- CLAUDE_CODE_AI_EMPLOYEE_CONSOLIDATION_LOOP_PROMPT.md:106
- backend/src/services/delivery/execution/executionPolicy.ts:33-42
- docs/architecture/ai-workforce-management/AI_EMPLOYEE_ROSTER.md:33 ('Highest external-side-effect risk after Sales')
- backend/src/controllers/salesHubCoryController.ts:24-42 (the grounding rules a draft must obey)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Baseline tests pass, and a draft containing an untraceable price or the word 'free' fails a named test.

When every box above is ticked, stop and show the demo.
