# sales.CAP.prospect_question_answering_from_approved_kb — Grounded answers to prospect questions from the approved sales knowledge base

A sales rep live with a prospect gets an accurate, grounded answer on price, enrolment, seats, schedule and scholarships in seconds, and never invents a price, a date or a policy.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Refund and cancellation terms are drafted and pending final approval (salesHubCoryController.ts:33), so the agent cannot answer refund questions on substance
- Four separate copies of the price exist (PLANS, the pinned facts, the KB seed template, and two hardcoded 4500 constants): which is authoritative for a spoken answer is unknown until reconciled

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Grounded answers to prospect questions from the approved sales knowledge base
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.prospect_question_answering_from_approved_kb`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
A sales rep live with a prospect gets an accurate, grounded answer on price, enrolment, seats, schedule and scholarships in seconds, and never invents a price, a date or a policy.
Intended users: Roselyn (sales owner, named owner of these KB entries), sales reps, Taiwo (admissions ops).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Validate the request and retrieve the top-matching KB entries client-side
- Ground every factual claim in the pinned facts and the retrieved context
- Disclose the student-paid third-party costs on any cost question
- Say the refund terms are drafted and pending approval on any refund question
- Fall back to local retrieval, not to invention, when the model is unavailable
**Inputs**
- The rep's question
- up to eight retrieved KB question-and-answer pairs as context
- the pinned canonical facts
**Outputs**
- One grounded answer in the agent's own words
- a mandatory disclosure of the student-paid Anthropic and API costs whenever total cost comes up
- an explicit 'I do not have that detail' where the KB is silent
**Exceptions that must be handled**
- The KB is silent: say so and suggest confirming with Ali, never fill the gap
- A cost question: the Anthropic subscription and API costs must be disclosed, because omitting them misstates the total
- A refund question: state that the terms are drafted and pending approval rather than quoting terms
- The prices in the pinned facts are a fourth copy of the price, separate from PLANS: they must be reconciled or they will drift
- The answer reaches a prospect only through the rep; the agent never contacts the prospect
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- read_approved_sales_knowledge
- read_plan_catalog
- escalate_to_human
**Application surfaces**
- /sales-hub (static)
- /knowledge/sales (static)
- /pricing
- POST /api/sales-hub/cory
- GET /api/v1/knowledge/sales
**Source modules**
- backend/src/controllers/salesHubCoryController.ts
- backend/src/services/publicKbService.ts
- backend/src/services/kbService.ts
- backend/src/seeds/seedKbData.ts
**Dependencies**
- cora_kb_entries
- the pinned-facts block
- an LLM endpoint, with a 503 fallback to local retrieval
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R5**.
Why that ceiling: Answering from approved knowledge is the textbook R2 capability, and because this surface is rep-facing rather than prospect-facing a shadow-mode comparison against Roselyn's own answers is reachable. It stops at R5 because every answer states a price, and a price stated to a rep is repeated to a prospect: the human decision flag is set for that reason even though no money moves in this capability.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R2)**
The agent answers a rep's question grounded only in the approved KB and the pinned facts.

Acceptance: Every factual claim traces to a KB entry or a pinned fact; a cost answer always discloses the student-paid Anthropic and API costs; a refund answer states the terms are pending approval. A fabricated price, date or policy in any sampled answer fails the release outright.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Refund and cancellation terms are drafted and pending final approval (salesHubCoryController.ts:33), so the agent cannot answer refund questions on substance
- Four separate copies of the price exist (PLANS, the pinned facts, the KB seed template, and two hardcoded 4500 constants): which is authoritative for a spoken answer is unknown until reconciled
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/controllers/salesHubCoryController.ts:24-33 (PINNED_FACTS: prices, seat cap, dates, student-paid costs)
- backend/src/controllers/salesHubCoryController.ts:35-42 (never invent prices, dates, policies or numbers)
- backend/src/controllers/salesHubCoryController.ts:44-60 (handleSalesHubCory, Zod-validated)
- backend/src/routes/leadRoutes.ts:100
- backend/src/routes/v1Routes.ts:36
- backend/src/services/publicKbService.ts:1-9 (public-safe projection, never exposes routing fields)
- backend/src/services/publicKbService.ts:40-60 (getPublicSalesKb)
- backend/src/seeds/seedKbData.ts:58-64 (Roselen seeded as a responsible person)
- backend/src/seeds/seedKbData.ts:211-243 (Pricing and Enrolment entries, primary_person_id Roselen, automation_potential High)
- frontend/public/sales-hub/
- frontend/public/knowledge/sales/

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every factual claim traces to a KB entry or a pinned fact; a cost answer always discloses the student-paid Anthropic and API costs; a refund answer states the terms are pending approval. A fabricated price, date or policy in any sampled answer fails the release outright.

When every box above is ticked, stop and show the demo.
