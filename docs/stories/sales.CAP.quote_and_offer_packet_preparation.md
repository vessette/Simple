# sales.CAP.quote_and_offer_packet_preparation — Quote and offer packet preparation for a human to price and send

A prospect or employer gets a clear, consistent offer packet quickly, assembled from approved plans and terms, with the price set and sent by a human.

**Built today:** absent. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Approved terms for a team or custom offer do not exist in writing: unknown until Roselyn and Ali supply them
- Refund and cancellation terms are drafted and pending approval, so a packet cannot state them

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Quote and offer packet preparation for a human to price and send
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.quote_and_offer_packet_preparation`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** absent · **Source:** proposed_new
## The business outcome
A prospect or employer gets a clear, consistent offer packet quickly, assembled from approved plans and terms, with the price set and sent by a human.
Intended users: Roselyn (sales owner), Ali (approver), prospective employer.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Read the requirement and the approved plan catalogue
- Assemble the packet from approved plans, published tiers and disclosed student-paid costs
- Mark every element the agent cannot price or state, and say why
- Hand it to a human, who sets any price and performs any send
**Inputs**
- The prospect or employer's requirement
- seat count for a team offer
- the approved plan catalogue and published tiers
**Outputs**
- A draft offer packet citing approved plans and terms
- an explicit list of anything the packet cannot state, including any unapproved term
- no price committed, no discount, no send
**Exceptions that must be handled**
- No discount, no custom price and no bespoke term may appear: those are financial commitments reserved to Ali and Roselyn
- Student-paid third-party costs must be disclosed on any total-cost statement
- Refund and cancellation terms are pending approval and must not be stated
- The word 'free' must not appear; the approved phrasing is a zero-cost start
- Four price copies exist in the codebase: the packet must quote the plan source of truth and nothing else
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- propose_quote_packet
- read_plan_catalog
- read_approved_sales_knowledge
- escalate_to_human
**Application surfaces**
- /pricing
- /sponsorship
- /admin/leads
- (no route proposed; the packet is handed over, not published)
**Source modules**
- backend/src/services/subscriptionService.ts (plan catalogue)
**Dependencies**
- sales.prospect_question_answering_from_approved_kb
- sales.team_license_and_sponsored_seat_administration
- approved terms that do not all exist yet
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R4**.
Why that ceiling: Assembling a packet writes no money, but an offer is a price representation, so human_decision is true and the ceiling stops at sandbox work. A production pilot would mean the agent's packet reaching a buyer, which is both a price commitment and prospect contact.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R1)**
Packet assembly runs against fixtures in an isolated dev environment, quoting only the plan catalogue.

Acceptance: A packet containing a discount, a bespoke price, a refund term or the word 'free' fails a named test.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Approved terms for a team or custom offer do not exist in writing: unknown until Roselyn and Ali supply them
- Refund and cancellation terms are drafted and pending approval, so a packet cannot state them
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- CLAUDE_CODE_AI_EMPLOYEE_CONSOLIDATION_LOOP_PROMPT.md:106
- backend/src/services/subscriptionService.ts:73-80 (the plan source of truth the packet must quote from)
- frontend/src/pages/PricingPage.tsx:20-23 (the three published tiers)
- backend/src/controllers/sponsorController.ts:64 (sponsor inquiry, the nearest existing intake)
- backend/src/controllers/salesHubCoryController.ts:24-42 (the grounding and disclosure rules a packet must obey)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] A packet containing a discount, a bespoke price, a refund term or the word 'free' fails a named test.

When every box above is ticked, stop and show the demo.
