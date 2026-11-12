# Comped seats: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), Ali (approver).
**Capability:** `sales.comped_seat_grant_and_revocation`
**Status:** draft. **A comp sets a named person's price to zero. That's a discount, so granting or revoking one is a person's decision, always.** Vick reports who holds a comp. It never grants, revokes or recommends either.

## What Vick does in this first release (R2)

From the subscriptions rows a person reads and passes in, Vick lists:

- **Every active comp and every revoked one,** each with the subscription row it came from. A comp with no row id isn't listed; Vick says how many were left out and why.
- **Who holds it** (from their enrolment row) and **since when** (the row's start date, in Central time). For a revoked comp, when it was revoked.
- **Why it was granted:** always unknown. No reason is recorded anywhere (finding 3).
- **How the revenue page counts that person:** excluded as Free Access, excluded as Staff, or (in the cases in finding 2) counted another way.

Every report opens with the same statement: **comped seats are excluded from revenue.** A comp is $0, and the revenue page counts it under Free Access (or Staff, for a team member), never in MRR, ARR or active subscribers (`subscriptionAnalyticsService.ts:297-305`, `:405-410`). The statement comes with its condition. Where a person's records break that condition, Vick flags them by name.

**Vick never presents a grant as a routine step.** A guard refuses any line that reads as one ("next step: grant...", "should be comped", "we recommend comping"). That includes text arriving in the records, such as a name. A request to grant or revoke goes to you and Ali, with a note that the platform won't record the decision or its reason.

Code: [`compState.js`](compState.js), with 10 tests in [`compState.test.js`](compState.test.js). Fixtures are fictional.

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code does, not a record of what has happened.

1. **A comp is marked paid.** Granting a comp runs the same step as a real payment. It sets the enrolment to paid, active and portal-enabled, with an amount paid of $0 (`subscriptionService.ts:596-602`, `:667`). So **a comp passes the paying-member filter**, which checks only that the enrolment is paid and active (`subscriptionAnalyticsService.ts:216`).

   A comp is kept out of revenue at a later step, which reads one subscription row per person (`:188-197`) and counts only annual and monthly rows (`:405-410`). The story says the filter itself "excludes Explorers". That clause was removed (`:199-206`).

   Anything else that counts "paid" enrolments will count comps too. That includes the payment pre-flight list: there, a comp shows up as a paid enrolment with no payment id, under "unknown".

2. **The revenue page reads the newest row, so two cases go wrong.**
   - **A comp alongside a paid plan.** Granting a comp to someone with an active annual or monthly plan leaves both rows active. The renewal clean-up skips comp rows on purpose (`subscriptionService.ts:479`, `:492`). The revenue page then reads the newer row. If that's the comp, the person's paid plan drops out of MRR. If it's the paid row, the comp isn't counted as Free Access. The grant also overwrites the enrolment's amount paid with $0 (`:602`). This is the case the story says needs a named rule. Vick flags each person it applies to.
   - **A revoked comp.** Revoking marks the comp row cancelled but leaves its 10-year period end. The enrolment stays paid, so the person keeps access, and that's by design (`subscriptionService.ts:678-681`). But with no active row, the revenue page falls back to the row with a period end, which is the revoked comp. **So a revoked comp can still be counted as a Free Access seat** (`subscriptionAnalyticsService.ts:188-197`). The admin roster's Free Access label reads only active comps (`subscriptionService.ts:693-702`). The two pages can disagree about the same person. Vick flags it.

3. **Who granted a comp is logged, but not why. (Corrected: an earlier draft said neither was recorded.)** Every admin write, including both grant and revoke routes, passes through the admin audit log (`adminRoutes.ts:164`, `:264`, `:400`). Each successful request writes a row to `audit_logs`: an admin id, the time, the IP address and the request body (`auditMiddleware.ts:56-92`). But the grant asks for no reason, so the body is empty. The row also says `create` or `delete` on `enrollments`, not "free seat granted" or "revoked". The admin id column holds an `admin_users` id for a full admin but an enrolment id for a staff login (`authMiddleware.ts:18-24`). And a failed log write is only printed to the console, while the grant goes ahead (`:85-87`). The subscriptions row itself records neither the grantor nor a reason (`subscriptionService.ts:645`, `Subscription.ts:46-61`). A proposal to close this is in [COMP_AUDIT_PROPOSAL.md](COMP_AUDIT_PROPOSAL.md).

4. **Whether a comp takes a cohort seat:** not checked. The grant doesn't change the `seats_taken` counter. I didn't trace whether anything else counts comps against capacity.

5. **The story's citations have mostly drifted.** At `109820a`:
   - The grant is at `:645-669`, not `:579-616`.
   - The revoke is at `:671-691`, not `:617-628`.
   - The roster helper is at `:693-702`, not `:629-643`.
   - `subscriptionAnalyticsService.ts:168` is a label (`staff: 'Staff'`), not the paying-member filter. That filter is at `:216`.
   - The community-member route is `/api/admin/community/members/:memberId/free-access`, not `/community-members/`.

   The grant and revoke numbers are close to their positions at `ccbd870`, so this is the same drift the citation check found across the sales capabilities.

6. **What works as the spec says:**
   - The comp plan is $0 with a 3,650-day period, so it never lapses on its own (`subscriptionService.ts:70-84`).
   - It can't reach a hosted checkout: only annual and monthly are accepted (`:339-341`).
   - A second grant reuses an existing active comp, including one on the same person's other enrolment, rather than stacking a second (`:652-665`).
   - A revoke cancels every active comp across the person's enrolments, not just the first (`:683-689`).
   - Revoking doesn't lock anyone out, so it can't strand a paying student.
   - Team members are counted as Staff, not Free Access (`subscriptionAnalyticsService.ts:297-302`).

## Before this can be validated

- **Vick can't read the production database** (it's denied by default). A person has to export the subscriptions rows with `plan = 'comp'`, plus the matching enrolment rows, and pass them in. Those rows name real people, so they stay out of every repo, including Vick's.
- **Your access.** You were given access to Vick's review page on 10 November. Whether it covers subscription records is unconfirmed.

## What needs a decision

The grant and revoke flow, with these decisions marked where they fall and the data points to record for each seat, is in [COMP_DECISION_FLOW.md](COMP_DECISION_FLOW.md).

| # | Question | Who | Options |
|---|---|---|---|
| 1 | Someone already paying is given a comp. What happens to the paid plan? | Roselyn, with Ali | Refuse the grant while a paid plan is active · cancel the paid plan's renewals first · allow both, but report the person once as paying · leave as is (today) |
| 2 | Should a grant require a reason and write a named audit entry? (Proposal: [COMP_AUDIT_PROPOSAL.md](COMP_AUDIT_PROPOSAL.md)) | Ali or Kes | Adopt the proposal · require a reason only · leave as is (who and when are logged today; why is not) |
| 3 | Should a revoked comp stop counting as a Free Access seat on the revenue page? | Ali or Kes | Yes, read only active comps · leave as is |
| 4 | Should comps be kept out of the "paid" counts, including the payment pre-flight list? | Ali, with Quincy | Mark comps separately · leave as is, and Vick lists them apart |

## Your answers

*Fill in with the date.*

**Date:**

**1. Comp on a paying member:**

**2. Recording the grant:**

**3. Revoked comps on the revenue page:**

**4. Comps in the paid counts:**
