# Meeting brief: what should a revenue projection assume per enrolment?

**For:** Ali, in a 15-minute meeting with Victoria. Kes is welcome but not needed.
**Why now:** every revenue projection on the platform uses $4,500 per enrolment, a price nobody has paid. On 10 September you ruled that projections should read one labelled setting and that the $4,500 default must change (ESCALATION-002, decisions 1 and 5). The code fix is ready to plan (see [DEFAULT_4500_CHANGES.md](DEFAULT_4500_CHANGES.md)). It needs one thing from you: **the value that setting should hold, and what it should mean.**

## What the platform already shows

- **The price list:** annual is $149 a month, billed $1,788 a year; monthly is $199 (`membershipPrice.ts:44-58`).
- **What people have actually been charged:** all 44 annual subscriptions ever created are recorded at $1,788, and nobody has ever paid $4,500. That was measured against production on 2 November and recorded in `membershipPrice.ts:10-21`. The $1,700 planning figure from 30 October appears nowhere in the system.
- **Production's projection setting holds $4,500** (`checkPriceAgreement.js:281-283`). The code also has a $4,500 default and fallback behind it.
- **Four different assumed prices are in use today:** $4,500 (the setting and two forecasts), $2,500 (a Cory simulation) and $25,000 (the campaign tab's average deal value).

## The options

Each one answers a different question. **The right one depends on what the projections are used for.**

| | Price per enrolment | What a projection would then mean | Data needed | For | Against |
|---|---|---|---|---|---|
| **A** | $1,788 | First-year bookings, as if everyone took the annual plan | None | Simple, and it's a real price | Too high whenever people choose monthly |
| **B** | (share choosing annual × $1,788) + (share choosing monthly × $199) | **Cash in the month people join** | The current plan mix, which the revenue page already shows | Honest and computable today | Understates the year: monthly members keep paying |
| **C** | (share annual × $1,788) + (share monthly × $199 × average months a monthly member pays in year one) | **A year's revenue per enrolment** | The plan mix, plus how long monthly members stay | Closest to what the business earns | We can't measure the second number reliably yet: the tenure view is a snapshot, not retention |
| **D** | The average a member pays over their whole time with us | Lifetime value | Renewal history by joining month | Best for long-range planning | Not enough history yet |
| **E** | Two settings, one per plan | Projections split by plan, each at its real price | Projected enrolments by plan | No blended guess at all | Each forecast has to split its numbers by plan, so more code changes |

**My suggestion:** B now, because it's honest and needs only data the platform already has. Move to C once there's a few months of renewal history. But it depends on your answer to question 1.

## Questions for the meeting

Each answer maps directly to a code or settings change.

1. **What should a projected revenue figure answer: cash in the month people join, revenue over their first year, or lifetime value?** This picks between B, C and D.
2. **One price for everyone, or one per plan?** One setting, or two (E).
3. **Should projections subtract the $50 deposit credit and any scholarships?** Whether discounts come off the assumed price.
4. **Who may change the setting from now on, and when is it reviewed?** It names the owner in the update checklist. Suggested: you decide, an admin changes it, and it's reviewed whenever the membership price changes.
5. **Until the code fix lands, should we clear the setting or leave $4,500?** Clearing it makes the revenue dashboard's projections show "unavailable", which is honest. Leaving it keeps a retired price on screen.
6. **May Kes remove the $4,500 defaults in the code,** so an unset price shows "unavailable"? This puts your decision 5 of 10 September into effect.
7. **Is the campaign tab's $25,000 a different product,** such as corporate deals? If yes, it gets its own name. If not, it reads the same setting.
8. **Does a projected enrolment mean a paid one?** Checkouts that fail or stay pending don't bring in money. Pending ones are unclear, because missed payment notices leave some paid members showing as pending.

## What I'll bring

From the revenue page, fetched on the day by someone with admin access:
- **The current plan mix:** how many members are on annual and how many on monthly.
- **The lapsed-member figures.**
- **The tenure funnel,** so it's clear what can and can't be measured yet.

These are totals only. They're shown in the meeting and kept out of the repo, because the repo is public.

## After the meeting

- **Record the decision and its reason** in ESCALATION-002 and in the answers section of [REVENUE_FOR_ROSELYN.md](REVENUE_FOR_ROSELYN.md).
- **Run Checklist 1** in [CHECKLIST_AND_ERROR_STRATEGY.md](CHECKLIST_AND_ERROR_STRATEGY.md): set the value, have Kes remove the defaults, check the projections move as expected, and tell Roselyn.
- **Update Vick's notes** that say production holds $4,500.

## A message to set up the meeting

> **Subject:** 15 minutes on the revenue projection price
>
> Hi Ali,
>
> Every revenue projection on the platform still uses $4,500 per enrolment, and nobody has ever paid that. Your 10 September decision says projections should read one labelled setting and the $4,500 default should go. The code change is planned, but it needs one call from you: what that setting should hold and what it should mean.
>
> I've put together five options and eight short questions, each tied to the change it unlocks. Could we take 15 minutes this week? Any time that suits you works for me.
>
> Thanks,
> Victoria
