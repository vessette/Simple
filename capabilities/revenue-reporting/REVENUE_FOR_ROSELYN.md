# Revenue questions: what Vick answers, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), Ali (approver); Kes for the platform findings.
**Capability:** `sales.revenue_and_subscription_reporting`
**Status:** draft. Reporting moves no money, but a made-up revenue figure is the most damaging thing this area can produce. So Vick gives only figures the platform already serves, each with where it came from.

## What Vick does in this first release (R2)

You ask Vick for a figure: collected, refunds, MRR, ARR, ARPU, active subscribers, free seats, plan mix, the tenure funnel, the needs-attention list, or a roster for one plan or tenure month. Vick reads it from the revenue endpoint that serves it, using the response a person fetched and passed in. The endpoints need an admin login, which Vick doesn't have.

Every answer gives:
- **The figure, exactly as the endpoint returned it.** Vick does no arithmetic on money.
- **The endpoint, the field and the filter,** so anyone can open the same endpoint and get the same number.
- **What the figure does and doesn't include.**

Three rules hold every time:
- **Missing is never zero.** If a response wasn't given, came back with an error, or has no usable number, the figure is *unavailable*, with the reason. A real zero in a response is reported as zero.
- **Net revenue is unavailable,** because the platform says so (finding 1). Vick quotes the platform's own reason.
- **Projections are never revenue.** The dashboard's projected revenue and pipeline value are an assumed price times a count. Vick refuses them as revenue.

Code: [`revenueAnswers.js`](revenueAnswers.js), with 10 tests in [`revenueAnswers.test.js`](revenueAnswers.test.js). Fixtures are invented.

## What I found in the platform

The definitions of net revenue, "net" and "collected", and the labels each one carries on screen, are set out side by side in [DEFINITIONS.md](DEFINITIONS.md).

Read from the platform code at commit `109820a`. This is what the code does, not a measurement of production.

1. **There are two answers to "what's our net revenue?"** The platform's list of approved metric definitions marks net revenue as **unavailable**: "Source IDENTIFIED but not yet wired … nothing here can compute a figure yet" (`adminOs/metricRegistry.ts:171-190`). The dashboard reports it that way (`revenueDashboardService.ts:151-160`). But the payments feed serves a figure called `net`: collected less refunds (`revenuePaymentsService.ts:182`).

   Vick reports net revenue as unavailable. It offers the feed's figure under its real name, **collected less refunds**, with what it leaves out.

2. **"Collected" isn't the cash collected over time.** It adds up the amount paid recorded on each paid, active enrolment, plus available deposits (`revenuePaymentsService.ts:54-65`, `:172-175`). That field holds **one amount per person**:
   - **A scheduled renewal doesn't add to it.** It only moves the subscription's end date (`subscriptionScheduleService.ts:243-247`), so a member who has paid monthly six times shows one month.
   - **A later activation overwrites it** (`subscriptionService.ts:602`). A free seat sets it to $0, which drops the person out of collected entirely.
   - **A withdrawn enrolment drops out** (`revenuePaymentsService.ts:65`).
   - **A payment marked paid while only Authorized is included** (the paid-rule finding).
   - **If a payment notice carries no amount, the plan's list price is recorded** as the amount paid (`subscriptionService.ts:508`).

   So collected is closer to "what each current member last paid" than to "money received". Vick says so with every collected figure.

3. **The dashboard total and the payments feed don't fully agree, though the feed says they do.** The feed claims to "reconcile EXACTLY" to the dashboard (`revenuePaymentsService.ts:10-11`). They differ on credits:
   - the dashboard counts every available account credit (`cohortService.ts:541-544`);
   - the feed counts only Open House deposits (`revenuePaymentsService.ts:76`).

   A cleanup script creates a postponement credit with another reason (`cohortCleanupAndNovemberSetup.ts:144-150`). If it ran in production, the two "collected" figures differ by that credit. I haven't checked whether it ran.

4. **MRR is a run-rate from list prices, not money in.** It adds up each member's plan price from their subscription row (`subscriptionAnalyticsService.ts:176-177`, `:305`, `:405-407`). The row stores the full recurring price; any $50 credit is recorded separately (`subscriptionService.ts:392-393`). That's a fair definition of MRR. MRR also includes members whose paid period has ended, and the platform shows that part beside it as lapsed and collectible MRR (`:39-66`). Vick gives all three, so MRR is never read as cash.

5. **No endpoint can answer "how much in October?"** None of them takes a date range, so every figure is all time. Vick says "all time" in the filter of every answer. A question about a month is unavailable until an endpoint supports it.

6. **The refund ledger may be incomplete.** The platform's definition of net revenue notes the refunds table held 3 rows, the latest dated 6 August, as of 5 September (`metricRegistry.ts:182-187`). Refunds done straight in PaySimple may never reach it. Vick names the ledger as the source of every refund figure.

7. **The brief's description of who counts as a paying member is out of date.** It says the filter excludes Explorers and free seats. The Explorer condition was removed (`subscriptionAnalyticsService.ts:199-206`), and free seats are marked paid, so they pass the filter (see [the free-seat write-up](../comped-seat/COMPS_FOR_ROSELYN.md), finding 1). The filter is paid and active only (`:216`). Free seats and staff are separated later, by the subscription row the page reads for each person.

8. **Several of the brief's citations have drifted.** At `109820a`:
   - The paying-member filter is at `subscriptionAnalyticsService.ts:207-220`, not `:159-180`.
   - The rosters are at `:550-580`, not `:463-486`.
   - The MRR figures are at `:379-465`, which only partly overlaps the brief's `:305-400`.

   The routes, the controller and the payments-feed citations are right. The brief's note that Roselyn has no admin login is out of date.

9. **What works as the spec says:**
   - Real revenue is never estimated: the old "enrolments × $4,500" figure was removed, and net revenue reports unavailable with its reason (`revenueDashboardService.ts:1-28`).
   - Refunds appear in the feed marked as not counted, so they're visible without being subtracted twice (`revenuePaymentsService.ts:149`).
   - Withdrawn duplicate enrolments are left out, so the same dollar isn't counted twice (`cohortService.ts:536-540`).
   - Every total can be opened to the people behind it (`settingsRoutes.ts:27-31`).
   - A failed source fails the whole request rather than showing zero (`adminRevenueController.ts:15-116`).

## Before this can be validated

- **Vick can't call the endpoints.** A person with admin access fetches the responses and passes them in. The responses name members, so they stay out of the repo; any figures shared for checking should be totals only.
- **You can already open the Revenue page** with the `revenue` role (see [ACCESS_FOR_ROSELYN.md](../comped-seat/ACCESS_FOR_ROSELYN.md)). So you can check any figure Vick gives against the page.

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | Until PaySimple payments are wired in, what figure should "revenue" mean in reports? | Ali | Net revenue stays unavailable, and collected less refunds is shown under its own name (Vick's default) · treat collected less refunds as revenue, with its caveats |
| 2 | Rename the feed's `net` so it isn't read as net revenue? | Kes | Rename it · add a label on the page · leave as is |
| 3 | Should the dashboard and the feed count the same credits? | Kes | Both count only deposits · both count all credits · leave as is |
| 4 | Do you need figures for a month or a quarter? | Roselyn | Yes, and which ones · not for now |

## Your answers

*Fill in with the date.*

**Date:**

**1. What "revenue" means:**

**2. The feed's `net`:**

**3. Credits:**

**4. Period figures:**
