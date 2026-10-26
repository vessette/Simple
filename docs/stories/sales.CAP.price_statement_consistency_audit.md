# sales.CAP.price_statement_consistency_audit — Price-statement consistency audit across every surface that quotes a price

Every surface that states a price states the same price, so a prospect is never quoted a number the business does not charge.

**Built today:** absent. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- The rule distinguishing a live price surface from an archived one is unknown and must be named before the audit can be trusted to report zero

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Price-statement consistency audit across every surface that quotes a price
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.price_statement_consistency_audit`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** absent · **Source:** proposed_new
## The business outcome
Every surface that states a price states the same price, so a prospect is never quoted a number the business does not charge.
Intended users: Roselyn (sales owner), Ali, marketing, sales reps.
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Enumerate every location that states or derives a price
- Compare each against the plan source of truth
- Report every disagreement with its location
- The fix is a code or content change a human makes
**Inputs**
- Every code, seed, static-asset and page location that states or derives a price
- the plan source of truth
**Outputs**
- A list of price statements and whether each agrees with the source of truth
- the drift found, per location
- no edits
**Exceptions that must be handled**
- At least four separate price copies exist, two of them the stale 4500: this audit is expected to find them on its first run, which is its positive control
- A merge-tagged template is not a drift if the tag resolves to the source of truth: resolve before judging
- A deliberately historical price in an archived page is not drift: the audit must distinguish live surfaces from archives, and the rule for that is unknown
- The audit must never edit a price
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- detect_price_statement_drift
- read_plan_catalog
- create_tickets
- escalate_to_human
**Application surfaces**
- /pricing
- /sales-hub (static)
- /knowledge/sales (static)
- /admin/revenue
- GET /api/v1/knowledge/sales
**Source modules**
- backend/src/services/subscriptionService.ts
- backend/src/controllers/salesHubCoryController.ts
- backend/src/seeds/seedKbData.ts
**Dependencies**
- sales.revenue_definition_integrity_guard
- the plan source of truth
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: The audit only reads and reports, so a supervised production pilot is defensible and immediately useful. Changing a price is explicitly forbidden to the agent, so R7 is prohibited: the audit reports drift and a human decides which number is right.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R0)**
The inventory of price-stating surfaces and the live-versus-archive rule are written down and reviewed.

Acceptance: The inventory names every known location including the two stale 4500 constants; a positive control confirms a fabricated location returns no match.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- The rule distinguishing a live price surface from an archived one is unknown and must be named before the audit can be trusted to report zero
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/services/subscriptionService.ts:55-80 ('Single source of truth so real prices (149 / 199) drop in by editing per_month only')
- backend/src/controllers/salesHubCoryController.ts:28 (prices restated in the pinned facts)
- backend/src/seeds/seedKbData.ts:216 (prices as merge tags in the KB answer template)
- frontend/src/pages/PricingPage.tsx:20-23 (prices restated on the pricing page)
- backend/src/services/paysimpleService.ts:399 (invoice default amount 4500)
- backend/src/services/revenueDashboardService.ts:11 (PRICE_PER_ENROLLMENT = 4500)
- frontend/public/sales-hub/kb-data.js
- frontend/public/knowledge/sales/

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] The inventory names every known location including the two stale 4500 constants; a positive control confirms a fabricated location returns no match.

When every box above is ticked, stop and show the demo.
