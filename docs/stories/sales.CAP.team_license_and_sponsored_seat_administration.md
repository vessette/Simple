# sales.CAP.team_license_and_sponsored_seat_administration — Team-license and sponsored-seat administration

An employer can buy a block of reassignable seats, their people can redeem one each, and the sponsor can see who used what, without a seat being redeemed twice.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Whether sponsor-route authorization is fully closed after the magic-link replacement is unknown without a named auth test per route

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Team-license and sponsored-seat administration
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.team_license_and_sponsored_seat_administration`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
An employer can buy a block of reassignable seats, their people can redeem one each, and the sponsor can see who used what, without a seat being redeemed twice.
Intended users: sponsoring employer, sponsored employee, Roselyn (sales owner), Ali (approver).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Capture the sponsor inquiry and send the kit
- Provision the sponsor account with magic-link access
- Let each employee redeem one seat against a code, idempotently
- Record the redemption so the sponsor dashboard and the audit trail agree
**Inputs**
- Sponsor inquiry details
- a redemption code
- the employee's identity
- the sponsor's purchased seat block
**Outputs**
- A sponsorship kit
- a sponsor account and dashboard
- a redeemed seat and an enrolment for the employee
- an audit trail of redemptions
**Exceptions that must be handled**
- Redemption is idempotent on the code: a second attempt must not grant a second seat
- More redemptions than purchased seats: must be refused, not over-allocated
- The sponsor dashboard previously used the sponsor id as a token; the magic-link path replaced that stopgap and the authorization boundary on every sponsor route must be tested
- The team-license price floor shown on the pricing page is one of several price copies and must be reconciled with the plan source of truth
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- query_cohort_seat_capacity
- query_enrollment_funnel_state
- escalate_to_human
**Application surfaces**
- /sponsorship
- /sponsor/dashboard
- /pricing
- POST /api/sponsorship-kit-request
- POST /api/sponsor-inquiry
- POST /api/sponsor/redeem
- GET /api/sponsor/dashboard
- POST /api/sponsor/request-link
- GET /api/sponsor/verify
**Source modules**
- backend/src/controllers/sponsorController.ts
- backend/src/services/sponsorAuthService.ts
- backend/src/services/sponsorAuditService.ts
**Dependencies**
- sponsors and seat blocks
- enrollments
- an email sender for the kit and the magic link
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R4**.
Why that ceiling: A redemption allocates prepaid paid entitlement to a named person, and pricing a team license sets a price. Both are financial decisions. Sandbox verification of the idempotency and over-allocation guards is the ceiling; allocation and pricing in production stay human.

**THIS IS A HUMAN DECISION.** It stays human-required at every autonomy level, forever. An
agent may prepare, summarise and propose; it may never decide. No amount of evidence
promotes this into automation.
**First release behaviour (autonomy:R2)**
The agent explains the team-license tiers, how redemption works, and the state of a named sponsor's seat block.

Acceptance: Every price quoted traces to an approved source; an unreconciled price copy is reported as unknown rather than quoted.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- No agent may charge, refund, discount, change a price or alter a subscription. The forbidden-action precedent is docs/architecture/ai-workforce-management/employees/learner-success/ROLE_CHARTER_v2.md:63 ('Promise a refund, discount, or any financial commitment on Colaberry's behalf')
- production_database and production_deploy are default-denied (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so the agent cannot reach the authoritative money rows in production at all
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
- Whether sponsor-route authorization is fully closed after the magic-link replacement is unknown without a named auth test per route
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- backend/src/routes/leadRoutes.ts:76 (sponsorship kit request)
- backend/src/routes/leadRoutes.ts:79 (sponsor inquiry)
- backend/src/routes/leadRoutes.ts:109 (sponsor dashboard)
- backend/src/routes/leadRoutes.ts:113-114 (sponsor magic-link login and verify)
- backend/src/routes/enrollmentRoutes.ts:18-20 ('Door B employee seat redemption, public, idempotent on the redemption code')
- backend/src/controllers/sponsorController.ts:64 (handleSponsorInquiry)
- backend/src/controllers/sponsorController.ts:151 (handleRedeemSeat)
- backend/src/controllers/sponsorController.ts:307-327 (sponsor link and verify)
- backend/src/services/sponsorAuthService.ts
- backend/src/services/sponsorAuditService.ts
- backend/src/services/sponsorshipScoringService.ts
- frontend/src/pages/PricingPage.tsx:20-23 (team licenses, annual reassignable seats, from 950)

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every price quoted traces to an approved source; an unreconciled price copy is reported as unknown rather than quoted.

When every box above is ticked, stop and show the demo.
