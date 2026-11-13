# Two revenue problems, and possible fixes

**For:** Roselyn (sales owner) and Ali (approver), with Kes for anything that changes platform code.
**Status:** proposals. Nothing here is built. Platform references are to commit `109820a`. Background is in [REVENUE_INSTANCES.md](REVENUE_INSTANCES.md), rows 2, 9, 10, 11 and 12.

## Problem 1: projections use made-up prices

The opportunities page and the Cory forecast project revenue at $4,500 per enrolment, a price nobody has ever paid. Two other projections use $2,500 and $25,000.

**What's already decided.** On 10 September, Ali ruled that a projection may use an assumed price, provided:
- it's **labelled as an assumption**;
- it's **read from the `price_per_enrollment` setting,** not a number typed into the code;
- the setting's **old default of $4,500 is changed**, so the wrong number isn't simply moved into the setting.

(`docs/marketing/ESCALATION-002-fabricated-metrics.md:213-219`, `:241-247`.) The revenue dashboard already works this way (`revenueDashboardService.ts:145-146`, `:204-206`). The other places don't yet. But production holds $4,500 in that setting too (`checkPriceAgreement.js:281-283`), so until 1a is decided, even the revenue dashboard projects at $4,500.

**Where it stands in the code.** The platform's price check freezes two files as known debt: the opportunities forecast and the scenario simulator, both at $4,500 (`scripts/checkPriceAgreement.js:47-61`). It fails the build if any third file adds a price of its own.

But it only recognises constants with **PRICE** in their name (`:309`, `:400`). So two have slipped past it:
- the Cory simulation's `REVENUE_PER_ENROLLMENT = 2500` (`coryStrategicSimulationEngine.ts:105`);
- the campaign tab's `avgDealValue = 25000` (`leadIntelligenceService.ts:79`, `:138`).

The check's comment also still says the frozen files await Ali's decision, but that decision was taken on 10 September.

### Possible fixes

| # | Fix | Who | Effort |
|---|---|---|---|
| 1a | **Set the right value for `price_per_enrollment`.** For a subscription, "price per enrolment" needs an assumption. The candidates are the first year ($1,788), the first month ($149 or $199), or the average a member pays over their time with us. | **Ali** decides; an admin changes the setting | A decision, then a minute |
| 1b | **Make the opportunities forecast and the scenario simulator read the setting** and show it as an assumption, as the revenue dashboard does. Then remove both from the frozen list. | Kes | Small; it's the decided fix |
| 1c | **Do the same for the Cory simulation's $2,500.** | Kes | Small |
| 1d | **Widen the price check** so it catches any constant used to compute revenue, whatever it's named, not only names containing PRICE. | Kes | Small |
| 1e | **Decide whether the campaign tab's $25,000 is a different product**, such as a corporate deal. If it is, it should say so on screen. If not, it should read the setting too. | Roselyn, with Ali | A decision |
| 1f | **Show the assumed price beside every projection** ("assumes $X per enrolment, from settings"), so nobody reads a forecast as money. | Kes | Small |

### How often prices should be updated, and by whom

- **The price members actually pay** lives in one place, `membershipPrice.ts`, and everything else reads it (`membershipPrice.ts:1-20`, `:44-58`). The price is Ali's decision, and Kes makes the code change.
- **Updating it is triggered by an event, not a calendar.** It changes when the price changes. The price check then fails the build if any page or service still shows the old figure, so drift is caught automatically rather than by remembering.
- **The projection setting** should be reviewed **whenever the membership price changes**, by whoever changes the price. A projection price that no longer matches anything real is how the $4,500 survived.
- **A light periodic check** would catch whatever slips through. A quarterly question, "do the projection assumptions still match the price?", on whatever list the team already reviews, costs almost nothing.

## Problem 2: the governance page shows $0 when it can't get the figure

If the lookup behind the governance page fails, its Revenue tile shows **$0** (`metricCollector.ts:103`). So does its projected revenue (`:109`). The failure isn't logged either. The error is swallowed, which breaks the platform's own rule against silent failures.

### Possible fixes

| # | Fix | Assessment |
|---|---|---|
| 2a | **Show "Unavailable", with the reason,** and log the failure. The service returns no figure, plus a note of what failed, instead of 0. The page shows "Unavailable: couldn't reach the revenue figures" in place of the number. | **Recommended.** It matches what the story asks for ("unavailable rather than zero") and Ali's 10 September rule that revenue "must come from real payments or report unavailable". The revenue dashboard already does this. |
| 2b | **Show the last figure it did get, with when it was taken** ("$X as of 9:00 AM CST; live figure unavailable"). | Useful as well as 2a, not instead of it. It needs the last good figure stored with its time, and it must always say it's old. Without the date, it's a guess presented as a fact. |
| 2c | **Hide the tile when the figure is missing.** | Not recommended. A missing tile is easy to overlook, so nobody learns the lookup failed. |
| 2d | **Show a default value.** | **Not recommended.** Any default is a made-up number, and $0 is itself a default; that's the problem. A plausible default is worse, because it removes the clue that something went wrong. Ali made the same point about the $4,500 in the same escalation. |

**What 2a needs:**
- **The service:** return no figure plus the reason, and log the failure with its type.
- **The page:** show "Unavailable" and the reason.
- **A test:** check that a failed lookup produces "unavailable", never 0.

It's a small change for Kes. The same pattern applies anywhere else on the platform that turns a failure into a zero.

The step-by-step plan for both problems, with a list of every price point on the platform, is in [PLAN_PRICE_CHECK_AND_GOVERNANCE.md](PLAN_PRICE_CHECK_AND_GOVERNANCE.md).

## Suggested order

1. **2a.** It's small, already agreed in principle, and stops a false $0 reaching anyone.
2. **1a.** Ali picks the projection price. Nothing else in problem 1 is worth doing until the setting holds the right number.
3. **1b, 1c and 1f** together, then **1d**, so that no new hardcoded price can slip in.
4. **1e** when Roselyn and Ali next discuss the campaign forecasts.

Vick isn't waiting on any of these. It already reports missing figures as unavailable and refuses projections as revenue.
