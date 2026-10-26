# sales.CAP.abandoned_checkout_identification — Abandoned-checkout identification, separated from free signups and ex-members

The people who started paying and stopped can be found and called, without mistaking a free Explorer signup or a former member for a live prospect.

**Built today:** implemented. **Requirement validated:** draft -- Roselyn must confirm scope, exceptions and success measures; she has no admin login today

**Blocked by**
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send

Full build prompt is attached to this story.

**Release:** r2 · r2 (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Abandoned-checkout identification, separated from free signups and ex-members
**Domain:** Sales, Enrollment & Subscriptions · **Capability:** `sales.abandoned_checkout_identification`
**Accountable human:** Roselyn · **Validation state:** draft
**Built today:** implemented · **Source:** existing_application
## The business outcome
The people who started paying and stopped can be found and called, without mistaking a free Explorer signup or a former member for a live prospect.
Intended users: Roselyn (sales owner), Taiwo (admissions ops).
## The human-operable process, as it works now
This must be operable by a person before an agent touches it. If a human cannot do it by hand
against the surfaces below, the agent version has nothing to stand on.
**Workflow**
- Take payment_status pending together with a latest subscription also pending: that pair is an abandoned checkout
- Exclude anyone whose payment_status is paid, because a former member can carry a pending renewal checkout
- Exclude free Explorer signups, which never mint a subscription row
- Present the list with the date the checkout started
**Inputs**
- Enrolment rows with their payment_status
- the latest subscription row per enrolment
**Outputs**
- The abandoned-checkout list
- the not-paid-any list
- a per-row badge with the checkout date
**Exceptions that must be handled**
- A former member with a pending renewal checkout is not a prospect: two of seven on a hand-pulled list were exactly that and were nearly called as leads (enrollmentPaymentFilter.ts:11-15)
- A free Explorer signup has payment_status pending and no subscription row, so it must never appear
- A checkout abandoned and later completed must leave the list once the payment is linked
## The tool interface
**Tools this capability requires** (none is one of the eight default-denied capabilities;
anything that would need one is listed under blockers instead)
- detect_abandoned_checkout
- query_enrollment_funnel_state
- escalate_to_human
**Application surfaces**
- /admin/accelerator/enrollments
- /admin/leads
- GET /api/admin/enrollments
- GET /api/admin/revenue/payments
**Source modules**
- frontend/src/pages/admin/enrollmentPaymentFilter.ts
- backend/src/services/appPaymentReconcileService.ts
**Dependencies**
- enrollments
- subscriptions
- sales.app_originated_payment_reconciliation
## The agent behaviour that uses it
Starting autonomy **autonomy:R0**; ceiling **autonomy:R6**.
Why that ceiling: Identifying the list is read-only. Contacting anyone on it is prospect contact needing live_email, which is default-denied, so the pilot ceiling applies to producing the list and never to working it.

Not a human-reserved decision, but promotion is still evidence-based and one step at a time.
**First release behaviour (autonomy:R2)**
The agent explains why a named person is or is not an abandoned checkout.

Acceptance: Every verdict names the payment_status and the latest subscription status; a paid former member is explicitly excluded with the reason.
## Before you start
- manager_has_no_admin_login: Roselyn (roselen@colaberry.com, org_members b4dddf0b-6750-4398-83cf-b70b64ed6b48, team 'Customer Support') has no admin_users row, so she cannot reach her agent's review or approval surface to validate or decide anything (backend/src/services/agentDomain/agentDomainRegistry.ts:158-170; docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16)
- live_email is one of the eight default-denied capabilities (backend/src/services/delivery/execution/executionPolicy.ts:33-42), so no agent in this domain may hold outbound prospect or customer contact at any autonomy level; a named human or the existing deterministic sender performs the send
## Evidence this is done
Cite the real thing: a named passing test, a measured figure with its query, or a file:line.
**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, or a mocked test passing. Roselyn evaluates the evidence, and
nothing here is validated yet.
## Evidence this capability rests on
- frontend/src/pages/admin/enrollmentPaymentFilter.ts:1-20 (why payment_status alone cannot tell them apart)
- frontend/src/pages/admin/enrollmentPaymentFilter.ts:38-49 (isAbandonedCheckout, matchesPaymentFilter)
- backend/src/services/appPaymentReconcileService.ts:213-244 (candidates: an app-originated checkout not yet linked)
- frontend/src/pages/admin/AdminLeadsPage.tsx

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] Every verdict names the payment_status and the latest subscription status; a paid former member is explicitly excluded with the reason.

When every box above is ticked, stop and show the demo.
