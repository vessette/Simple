# Cancellations: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), Ali (approver).
**Capability:** `sales.subscription_cancellation_and_schedule_suspension`
**Status:** draft. **Cancelling stops a charge and changes a membership, so it's a person's decision, always.** Vick explains a member's state. It never cancels, suspends a payment schedule or edits a subscription.

## What Vick does in this first release (R2)

For a named member, Vick says:

- **Their subscription:** plan and status, when their paid period ends, and, if they've cancelled, how long access lasts.
- **Whether a payment schedule exists:** the schedule id on their subscription, if any. If someone has looked the schedule up in PaySimple and passed the result in, Vick adds what PaySimple says (Active or Suspended) and when it was read, in Central time.
- **The recorded cancellation reason,** and who wrote it. The reason field isn't only for members (see finding 4), so Vick says when a value came from an admin action or the system.
- **What a member is owed on cancelling:** unknown, because the terms aren't approved. Vick says so and states no terms.

Every statement names where it came from: the subscription row (and which field) or the gateway read. Where there's no record, Vick says the answer is unknown and why.

**When there's no schedule id,** Vick says a cancel would skip the PaySimple step: it's a no-op. It also says the row can't show whether anything else bills the member. Vick never tells anyone they won't be charged; a guard blocks any line that says so.

**Anything else goes to a person.** "Please cancel me" and "what will I get back?" go to someone with admin access.

Code: [`cancellationState.js`](cancellationState.js), with 12 tests in [`cancellationState.test.js`](cancellationState.test.js). Fixtures are fictional.

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code does, not a record of what has happened.

1. **The order is right: the schedule comes down before the row says cancelled.** If PaySimple won't suspend the schedule, the cancel stops, the row stays active and the member sees an error (`subscriptionService.ts:715-728`, `participantController.ts:162`). A member can't end up marked cancelled while still being charged through that schedule.

2. **A cancel with no schedule id reports success and says nothing about it.** The PaySimple step is skipped and the member is told the cancel worked (`subscriptionService.ts:724`, `:736`). That's right for someone on manual renewal. But nobody is told the gateway was never touched, so a member billed some other way (an older schedule, an invoice) would get no warning. The spec says this should be reported, not treated as success.

3. **A past-due member can't cancel from the portal.** Only an active membership can be cancelled (`subscriptionService.ts:712`). A past-due row keeps its schedule id, and the cancel button returns an error. Whether PaySimple keeps retrying that schedule is not something I could check.

4. **The reason field isn't only cancellation reasons.** Four other things write to it:
   - a failed scheduled payment, on a row that is past due, not cancelled (`subscriptionScheduleService.ts:265`)
   - an admin revoking free access (`subscriptionService.ts:689`)
   - a renewal replacing an older row (`subscriptionService.ts:497`)
   - the payment reconcile sweep retiring duplicate checkouts (`appPaymentReconcileService.ts:432-434`)

   A report of "why members cancel" built on this field would mix these in with what members actually said.

5. **If the suspend works but the follow-up update fails, it reads as a failure.** The suspend and the step that clears the schedule id share one error path (`subscriptionScheduleService.ts:169-189`). The schedule would be suspended in PaySimple while the row still shows it live, and the member sees an error. A retry calls suspend again on a schedule that's already suspended. I couldn't confirm whether PaySimple accepts that. The related empty-response bug was fixed on 2026-09-01 (`paysimpleService.ts:107-121`).

6. **A code comment says the opposite of what the code does.** The note on the suspend function says a failed suspend still records the cancellation (`subscriptionScheduleService.ts:159-162`). The code doesn't do that (finding 1). The code is the safer behaviour. The comment should be fixed so nobody "fixes" the code to match it.

7. **The story's citations point at the wrong lines at `109820a`.** `subscriptionService.ts:644-682` is the free-access grant and revoke, not the cancel (that's `:710-737`). The cancel route is `participantRoutes.ts:461`, not `:437`. The two columns are at `Subscription.ts:39-40` and `:78-79`, not `:85`. The suspend call (`paysimpleRecurring.ts:138`) is right. The citations come from the platform's capability file (`agentDomain/capabilities/sales.json:1157-1160`).

   The Git history shows this isn't only drift. At `ccbd870`, the earliest platform commit that carries these citations, the cancel function started at `:642`, so that one was close and has moved since. The route (`:437`) and the column (`:85`) were wrong even then. Whatever writes these citations doesn't check them.

   **The same problem appears across the sales capabilities.** I checked all 359 citations in the capability file with [`scripts/checkCitations.mjs`](../../scripts/checkCitations.mjs). The full list is in [`docs/discovery/06-citation-check-sales.md`](../../docs/discovery/06-citation-check-sales.md). Of the 100 citations that name what they point at:
   - **78** are correct.
   - **18** have drifted: right on 2026-10-09, wrong now.
   - **3** were never right. By hand, one of these is a false alarm (`marketingMetrics.ts:169-174` is inside the ROAS entry), which leaves the `Subscription.ts:85` citation, copied into two capabilities.
   - **1** cites a file created after the research date and is wrong now.

   Two of the drifted ones say `PRICE_PER_ENROLLMENT` is "still live", and it has since been removed. The other **256** citations give only a line, with no name, so the script can't tell what they meant. This story's `participantRoutes.ts:437` is one of them, and it's wrong. Those are a blind spot, so the counts above are a floor, not a total.

8. **What works as the spec says:**
   - A reason is required; an empty one is refused with a 400 (`participantController.ts:159-160`).
   - The route needs the member to be logged in (`participantRoutes.ts:461`).
   - The schedule id is cleared only after PaySimple accepts the suspend (`subscriptionScheduleService.ts:170-174`).
   - Access lasts until the end of the paid period (`subscriptionService.ts:708-709`, `:257`).
   - The billing watch doesn't count suspended schedules as live (`billingGatewayState.ts:41-49`).

## Before this can be validated

- **The agent can't read PaySimple or the production database** (both are denied by default). For the gateway part of an answer, a person has to look up the schedule and pass the result in. Without it, Vick says the gateway state is unknown.
- **Your access.** You were given access to Vick's review page on 10 November (the story's note that you had no login predates that). Whether it covers members' subscription records is unconfirmed.
- **The terms.** This depends on the same unapproved refund and cancellation terms as the refund capability. Whatever is decided there applies here.

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | When a cancel skips PaySimple (no schedule id), who should be told? | Roselyn | Tell the member and flag it for a person · flag it for a person only · leave as is (today) |
| 2 | Should a past-due member be able to cancel, with the schedule suspended? | Roselyn, with Ali | Allow it · send it to a person · leave as is (today) |
| 3 | Should member reasons and system notes be kept in separate fields? | Ali or Kes | Separate them · tag the system values · leave as is |
| 4 | What is a member owed on cancelling? | Roselyn, with Ali | Same answer as refund decision 1. Until then, Vick states no terms |
| 5 | Fix the misleading code comment and the story's citations, and check how citations are generated? | Ali or Kes | Fix both and add a check · fix both only · no |

## Your answers

*Fill in with the date.*

**Date:**

**1. Skipped gateway step:**

**2. Past-due cancels:**

**3. Reason field:**

**4. Terms:**

**5. Comment and citations:**
