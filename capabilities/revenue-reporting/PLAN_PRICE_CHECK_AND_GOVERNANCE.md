# Plan: a price check that covers every price, and a governance page that says when it can't load

**For:** Kes (platform owner, who would build it), with Roselyn and Ali for the decisions marked.
**Status:** plan only. Nothing is built, and it changes platform code that Vick doesn't own. Platform references are to commit `109820a`. It follows on from [FIXES_PROPOSED.md](FIXES_PROPOSED.md).

## Part A: every price point on the platform today

Found by searching the backend for money constants and reading each one.

| Price point | Amount | What it is | Defined in | Read from the price file, or typed in? | Covered by today's price check? |
|---|---|---|---|---|---|
| Annual plan | $149 a month, billed $1,788 a year | The main membership | `membershipPrice.ts:44-58` | **The price file itself** | Yes |
| Monthly plan | $199 a month | Month to month | `membershipPrice.ts:48` | The price file itself | Yes |
| Free seat | $0 | Admin-granted, never at checkout | `subscriptionService.ts:84` | Typed (a $0 plan) | No |
| Open House deposit | $50 | Charged, then credited against the first payment | `openHouseCreditService.ts:25` | Typed | No |
| Open House scholarship | $894 credit (50% off annual), annual only | A discount, stored as a credit | `openHouseCreditService.ts:41-43` | **Typed, not worked out from the annual price,** so it would go wrong silently if the price changed | No |
| Postponement credit | $199 | A one-off credit from a cleanup script | `cohortCleanupAndNovemberSetup.ts:44` | Typed | No |
| Plan matching | $1,788 and $199 | Used to guess a member's plan from what they paid | `planInference.ts:12-15` | **Typed copies of the plan prices** | No |
| Thresholds (not prices) | $1 minimum charge; $100 membership floor (in two places); $30 matching tolerance | Rules, not prices | `accountCreditService.ts:22`; `appPaymentReconcileService.ts:63`; `paymentReconciliationService.ts:64`; `planInference.ts:9` | Typed | No, and they don't need to be prices |
| Projection setting | **$4,500 in production**; default $4,500; a fallback of `\|\| 4500` | The assumed price behind the revenue dashboard's projections | `settingsService.ts:9`; `governanceService.ts:212`; production value per `checkPriceAgreement.js:281-284` | A setting | Reported, not failed |
| Private projection prices | $4,500 (×2), $2,500, $25,000 | Forecasts and simulations | `opportunityScoringService.ts:18`; `scenarioSimulationEngine.ts:25`; `coryStrategicSimulationEngine.ts:105`; `leadIntelligenceService.ts:79`, `:138` | Typed | The two $4,500 copies are frozen as known debt; **the $2,500 and $25,000 get past it** |
| Retired | $4,500 per participant | The old invoice amount; the route now answers "gone" (410) | (retired 12 November) | | |

Bootcamp tuition and manual charges on the shared PaySimple account aren't prices of this platform. The payment matching deliberately keeps them out, so they're not in scope.

**Two things this table shows beyond the last note:**
- **Even the "proper" projection uses $4,500.** The revenue dashboard reads its price from the setting, as Ali decided. But production holds $4,500 in that setting, the default is $4,500, and the fallback is $4,500. So fix 1a in the last note, Ali choosing the value, is what everything else waits on.
- **The scholarship is a discount stored as a credit.** The dashboard's "Revenue" tile counts every available credit (`cohortService.ts:543-544`). So an unused scholarship would add $894 to "Revenue". I haven't checked whether any exist in production.

## Part B: plan for the price check

**The aim:** every price used to charge, credit, match or project comes from one list. The check fails the build if any code carries a price of its own, whatever the constant is called.

| Step | What | Who | Done when |
|---|---|---|---|
| B1 | **Decide the projection price.** For a subscription, that's the first year ($1,788), the first month, or the average a member pays over their time with us. | **Ali** | A value is recorded, with its reason |
| B2 | **Put every price point in the price file:** the two plans (already there), the $50 deposit, and the scholarship worked out as half the annual charge, not typed. The thresholds stay where they are, but are named as thresholds. | Kes | `membershipPrice.ts` lists them all |
| B3 | **Point the typed copies at it:** plan matching, the deposit, the scholarship, and the three projection files (via the setting chosen in B1). | Kes | No price is typed outside the price file |
| B4 | **Remove the $4,500 defaults:** the setting's default and the `\|\| 4500` fallback. If the setting is unset, the projection shows "unavailable", as the revenue dashboard already does. | Kes | No `4500` left in a service |
| B5 | **Widen the check in two ways:** by **value**, so any money literal equal to a listed price (178800, 19900, 89400, and so on) outside the price file fails; and by **name**, so any constant named for money (PRICE, REVENUE, DEAL, AMOUNT, CENTS, FEE) fails unless it's on an allow-list with a reason. Small, common numbers like $50 and $100 are matched by name only, so ordinary code isn't flagged. | Kes | The check covers every row of Part A |
| B6 | **Make the check prove it works,** as it already does for its existing rules: plant a `REVENUE_PER_ENROLLMENT = 2500`, an `avgDealValue = 25000` and a typed `1788`, and confirm the check fails on each. | Kes | Its self-test includes the three |
| B7 | **Clear the frozen list.** Once B3 lands, the two files on it fail the check's "no longer needed" rule, by design. Remove them, and update the comment saying they await Ali. | Kes | The frozen list is empty |
| B8 | **Decide what the $25,000 is.** If it's a different product, such as corporate deals, it belongs in the price file under its own name and is shown as such. | Roselyn, with Ali | Named or removed |

**Who updates prices from then on:**
- **Ali decides any price change.** Kes changes the price file.
- **The check fails the build** if anything still disagrees, so nothing relies on someone remembering.
- **The projection setting is reviewed at the same time,** by whoever changes the price.

**Vick's own copy.** Vick's checkout explainer tests against a copy of the plan list taken at `109820a`. When the price file changes, that copy should be refreshed in the same week, and its test points at the commit it came from. I'll do that when it happens.

## Part C: plan for the governance page's error handling

**Today:** the service behind the governance page catches 11 lookups. If any of them fails, it quietly substitutes zeros or empty lists, and nothing is logged (`metricCollector.ts:103-111`, `:194`, `:203`). The worst is the governance overview: if it fails, the page reports `system_status: 'healthy'` (`:110`). The page has an error message, but only for when the whole request fails (`GovernanceCommandCenter.tsx:984-985`), which these fallbacks prevent.

**The aim:** a figure the page couldn't get says so. It never shows a zero, and never shows "healthy" when the check behind it failed.

### Behind the scenes

| Step | What |
|---|---|
| C1 | Each lookup returns its figure **or "unavailable" with the reason** (timed out, refused, error), never a stand-in value. |
| C2 | **Log every failure** in the platform's standard format: what failed, the kind of error, how long it took, and an ID to trace it. That ends the silent catch, which breaks the platform's own rules. |
| C3 | Give each lookup a **time limit and one retry** after a short pause. Only one, because unlimited retries are forbidden. |
| C4 | Optionally, **keep the last good figure with its time,** so the page can show it as dated. It has to be stored, not held in memory, because the service mustn't depend on its own memory between requests. |
| C5 | If the governance overview can't be read, the status is **"unknown"**, never "healthy". |

### On the page

**A figure that couldn't load shows this instead of a number:**

> **Revenue: unavailable**
> We couldn't load revenue just now (the lookup timed out).
> **[Try again]** · [Open the Revenue page]

If a last good figure is stored (C4), it appears underneath, clearly marked as old:

> Last loaded: $X at 4:10 PM CST. This may be out of date.

- **[Try again]** reloads the figures. The page already has a reload function.
- **[Open the Revenue page]** gives Roselyn the figure from its own page, which has its own error handling.
- **Every figure fails on its own.** One failed lookup doesn't blank the whole page.
- **The message is announced to screen readers,** and doesn't rely on colour alone.
- **A real zero still shows as $0.** Only a missing figure shows "unavailable".

### Tests

- **Behind the scenes:**
  - a failed revenue lookup gives "unavailable", not 0;
  - a failed overview gives "unknown", not "healthy";
  - a lookup is retried once, not more;
  - a real zero comes back as 0.
- **On the page:**
  - the unavailable state shows the reason and a working "Try again";
  - one failed figure doesn't hide the others.

### Order

C5 and C1-C2 first: they're small, and they stop false figures and a false "healthy". Then C3, then the page changes, then C4 if the team wants dated figures.

## Suggested overall order

1. **C5, C1 and C2.** They stop the page showing false zeros and a false "healthy".
2. **B1.** Ali picks the projection price; everything in Part B waits on it.
3. **B2-B4,** then **B5-B7.**
4. **The page changes in Part C,** then C4.
5. **B8** when Roselyn and Ali next discuss campaign forecasts.

The checklist for changing the projection price, and a single way to handle failed lookups on the governance page, are in [CHECKLIST_AND_ERROR_STRATEGY.md](CHECKLIST_AND_ERROR_STRATEGY.md).

Vick doesn't wait on any of this. It already reports missing figures as unavailable and refuses projections as revenue.
