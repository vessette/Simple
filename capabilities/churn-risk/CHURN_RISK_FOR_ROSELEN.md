# Renewal risk: the definitions, and one measurement before any number

**For:** Roselen, who signs off on this capability and sets the minimum population, and Ali, who can authorise the measurement. **Capability:** `sales.subscription_churn_and_renewal_risk_analysis`, first release (autonomy:R0): the definitions written down for review. **No risk figure is produced.**

**Not finished:** the story also asks for the question "are cancellation reasons good enough to explain churn?" to be answered **by measurement**. The measurement is written and tested, but it has to be run on the live data by someone with access. Until then this release isn't done.

## What the code already shows about cancellation reasons

There's one field for the reason a subscription ended. **Six different things write to it** (platform `a839a58`). Only one of them is the member's own reason:

| Who writes it | What it says | Is it churn? |
|---|---|---|
| **The member, when cancelling** (`subscriptionService.ts:769`) | One of five preset reasons ("Too expensive", "Not enough time", "Not what I expected", "Found another option", "Just exploring"), their own words, or "No reason given" | **Yes** |
| A renewal replacing the old period (`:533`) | `superseded_by_renewal:…` | **No:** the member renewed |
| A free seat being revoked (`:725`) | `comp_revoked` | No: not a paying member |
| A duplicate checkout being cleaned up (`appPaymentReconcileService.ts:433`) | `duplicate checkout submission…` | No |
| A declined automatic payment (`subscriptionScheduleService.ts:265`) | The bank's decline reason, on a *past-due* row | A risk signal, not a cancellation |
| A new subscription (`subscriptionService.ts:469`) | Empty | n/a |

**The most important consequence:** a simple count of "cancelled" subscriptions would count **every renewal as a cancellation**. Any churn rate built that way would be badly wrong. The measurement below separates them.

## The measurement (to run once, read-only)

`reasonQuality.js` contains the exact query. It:
- groups cancelled and past-due subscriptions by plan and by the categories above;
- returns **counts only**, so no member's own words ever leave the database and the result can be shared safely;
- changes nothing.

The same file then turns the counts into the answer:
- how many genuine member cancellations there are;
- how many give a reason, and how many use a preset;
- how many say "No reason given".

**It never produces a risk score.**

## The measurement plan

**The question:** are recorded cancellation reasons reliable enough to say *why* paying members leave? Each part below answers one piece, and every number comes from the one counts-only query.

| # | Question | Metric | What would make the data usable (proposed: Roselen confirms) |
|---|---|---|---|
| 1 | Is there enough to measure at all? | Number of genuine member cancellations (paying plans only; renewals, free seats and duplicates removed) | At least the minimum population Roselen sets (suggested 20). Below that: counts only, no conclusions |
| 2 | Do members tell us why? | **Coverage:** the share of member cancellations with a reason (preset or own words) | Most do, for example 70% or more |
| 3 | Can the reasons be grouped? | **Structure:** the share of reasons that use one of the five presets | Most reasons are presets; own-words reasons need a person to sort them |
| 4 | Are people skipping it? | The share saying "No reason given" | Low. If high, the fix is to make the choice required |
| 5 | Is it getting better or worse? | Questions 2 to 4 **by month** | Recent months meet the bar, even if older ones don't. The presets may be new: the history I can see only goes back to 5 November |
| 6 | Is anything polluting the count? | Renewal markers, free-seat revocations and duplicates found in "cancelled" | Reported separately and never counted as churn |

**What the result means:**
- **Usable:** retention work can be aimed by reason, starting from the recent months that meet the bar.
- **Not usable:** the honest answer is "churn drivers are unknown". The cheap fix is making the reason a required choice when cancelling. Measuring again after a few months shows whether it worked.
- **Too few cancellations:** report counts only, and measure again once there are more.

## The definitions (proposed: please review)

- **Who's counted:** paying members on the annual or monthly plan. **Never counted:** free seats, staff, Explorer accounts, renewals that replaced a period, and duplicate-checkout clean-ups.
- **What "churn" means:** a paying member cancelled, or lapsed and didn't come back within the 7-day follow-up window (`renewalReminderSelection.ts:76-92`). A renewal is not churn.
- **Risk drivers (proposed),** each with its source:
  - a declined payment, and why;
  - lapsed before;
  - paid late before;
  - this is their first renewal;
  - their stated reason, where they gave one.
  
  These are the same payment-history signals proposed for the renewal worklist.
- **Unknown stays unknown:** if a member gave no reason, or a free-text reason doesn't clearly match a driver, the driver is **unknown**. It's never guessed from their words.
- **Minimum population:** below a number **you** set, results are reported as **counts** ("3 of 7"), never percentages. A percentage of a handful is misleading. I'd suggest 20, but it's your call.
- **Never revenue:** no risk score is presented as a prediction of revenue.

## What I need

- **Ali:** who can run the read-only query (it returns counts only, no personal text)?
- **Roselen:**
  - confirm or change the definitions above;
  - set the minimum population;
  - say whether the five preset reasons are the drivers you'd want to see.

Code: [reasonQuality.js](reasonQuality.js) (the query and the measurement). Tests: [reasonQuality.test.js](reasonQuality.test.js), 6 tests, including "no risk figure is ever produced" and "renewals, duplicates and free seats are never counted as churn".
