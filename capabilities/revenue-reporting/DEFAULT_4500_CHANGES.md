# Where $4,500 is set in the code, and how to make prices flexible

**For:** Kes (who would make the change), with Ali for the one decision it needs.
**Status:** proposal. The platform code is Kes's, so nothing here is applied. Platform references are to commit `109820a`. It follows [CHECKLIST_AND_ERROR_STRATEGY.md](CHECKLIST_AND_ERROR_STRATEGY.md).

## Every $4,500 in the code

I searched the backend, the frontend and the scripts for `4500` and `$4,500`, leaving out tests, comments and docs. Not every hit is the retired membership price, so each has a verdict.

### To change

| # | Where | What it does | Live? |
|---|---|---|---|
| 1 | `settingsService.ts:9` | Default for `price_per_enrollment` when the setting has no row | Yes |
| 2 | `governanceService.ts:212` | `parseInt(...) \|\| 4500`: a second fallback when the value isn't a number | Yes |
| 3 | `AdminSettingsPage.tsx:122` | `?? 4500`: the settings page shows $4,500 when nothing is set | Yes |
| 4 | `opportunityScoringService.ts:18` | Its own price constant for the opportunities forecast | Yes |
| 5 | `scenarioSimulationEngine.ts:25` | Its own price constant for the scenario simulator | Yes |
| 6 | `paysimpleService.ts:404` | `params.amount \|\| 4500`: an invoice with no amount is billed $4,500 | The route that used it was retired on 12 November, so it's no longer reachable from that route, but the default remains |
| 7 | `coraKnowledgeBase.ts:31`, `:34`, `:185-186`, `:275` | Cora's built-in instructions allow "pay-in-full $4,500 per participant" | **Not live:** Cora builds its instructions from the database (`coraAgentService.ts:198-216`), and nothing calls these. They'd only be quoted if someone switched back. |

### To leave

| Where | Why it stays |
|---|---|
| `membershipPrice.ts:80`; `claimsRegistry.ts:519-520`; `admissionsKnowledgeGate.ts:111`; `checkPriceAgreement.js:337-402` | These **name** $4,500 as a retired price, so it can be blocked. Removing them would weaken the check. |
| Knowledge hub "Data Science, $4,500" | A different product's real price. The check deliberately ignores it (`checkPriceAgreement.js:359-360`). |
| `productionActivationRoute.ts:177`; `marketingMetrics.ts:171` | Message text describing the history |
| `$44,500` in `scripts/artifacts/tickets/*` | The corporate pilot price, a different product |
| `waitForTimeout(4500)`, `max_tokens: 4500`, `represented_hours: 4500` | Not money |

## How to make it flexible

### Don't swap $4,500 for another number

The obvious fix is to change 4500 to today's price, $1,788. I'd advise against it for two reasons:
- **Which price a projection should assume is Ali's decision, and it's still open.** For a subscription, it could be the first year, the first month, or the average a member pays over their time with us. Typing one in would make that choice by default.
- **The platform has already learned this.** Its escalation rejected "just use the right price" because it "makes the number plausible, which removes the only clue anyone had that it was fabricated" (`docs/marketing/ESCALATION-002-fabricated-metrics.md`). A wrong $1,788 is harder to spot than a wrong $4,500.

So the fix is to have **no default price at all**. A projection with no price set shows "unavailable".

### One function for the projection price

The revenue dashboard already has the right logic, in `readAssumedPrice()` (`revenueDashboardService.ts:48`). It reads the setting, accepts only a positive number, and returns nothing otherwise, never a default. Make that the shared function every projection uses, and have it also say where the price came from:

```ts
// backend/src/services/projectionPrice.ts (new, small)
export type ProjectionPrice =
  | { status: 'set'; value: number; source: 'price_per_enrollment setting'; updatedAt: Date | null }
  | { status: 'unset'; value: null; reason: string };

export async function getProjectionPrice(): Promise<ProjectionPrice> {
  const raw = await getSetting('price_per_enrollment');      // no default once DEFAULTS loses it
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) {
    return { status: 'unset', value: null, reason: 'No projection price is set. An admin sets it once Ali has chosen it.' };
  }
  return { status: 'set', value: n, source: 'price_per_enrollment setting', updatedAt: await getSettingUpdatedAt('price_per_enrollment') };
}
```

Every projection calls it, and shows the price it used, or "unavailable" with the reason. The `updatedAt` lets a page say "assumes $X per enrolment, set 14 November". `getSettingUpdatedAt` already exists (`settingsService.ts:90-93`).

### The changes, line by line

| # | Change |
|---|---|
| 1 | Remove `price_per_enrollment` from the defaults in `settingsService.ts`. |
| 2 | Replace `\|\| 4500` in `governanceService.ts` with `getProjectionPrice()`, and pass on "unset" rather than a number. |
| 3 | On `AdminSettingsPage.tsx`, show an empty field with "Not set. Projections show as unavailable until this is set." |
| 4, 5 | Delete both private constants. Each file calls `getProjectionPrice()` and labels its projection with the assumed price. Then remove both from the price check's frozen list. |
| 6 | Make `amount` required on the invoice function, and refuse an invoice without it (a validation error) instead of defaulting. If invoicing comes back, the caller passes a price read from `membershipPrice.ts`. |
| 7 | Delete the unused price text from `coraKnowledgeBase.ts`. If those instructions are ever needed again, they should build their prices from `membershipPrice.ts`, as the database version does with the cohort's own prices (`kbService.ts:294`). |
| (also) | Move `revenueDashboardService`'s `readAssumedPrice()` onto the shared function. It's the third place doing the same thing, which is when this repo's rules say to extract it. |

### Why membership prices stay in a file, not the database

The mentor asked whether prices could be read from a configuration file or the database. They already are, but on purpose in different places:

- **Membership prices are in a file,** `membershipPrice.ts`. A price change there goes through code review and the price check, which fails the build if any page, quote or knowledge-base article disagrees. That's the safety you want for what customers are charged. Moving it into a database setting would let it change with one click and no check.
- **The projection assumption is a database setting,** `price_per_enrollment`. It's a planning assumption that an admin may need to adjust between releases, and every change is recorded with who made it and the old value.

So the flexible part is the assumption, and the protected part is the price.

### Tests that would come with it

- **The price is unset:** `getProjectionPrice()` returns "unset", and every projection shows "unavailable", not $4,500 or $0.
- **The price isn't a positive number** ("abc", 0, -5): treated as "unset", never defaulted.
- **The price is set to $1,788:** every projection uses it and shows "assumes $1,788 per enrolment".
- **No `4500` remains in any service:** the price check's self-test, extended as in the plan (B5-B6).
- **An invoice with no amount** is refused with a validation error.

## The order

1. **Ali chooses the projection price,** and an admin sets it. This can happen before any code changes, since the setting already exists.
2. **Kes makes changes 1-6 and the shared function together,** with the tests, in one change. Done partly, an unset setting would make some projections "unavailable" while others still show $4,500.
3. **Change 7** at any time. It's unused code.

**The one decision needed:** Ali's choice of what a projection assumes per enrolment. Everything else is mechanical.
