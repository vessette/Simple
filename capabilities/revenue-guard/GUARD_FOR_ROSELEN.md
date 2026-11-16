# Revenue-definition guard: does a revenue figure follow the rule?

**For:** Roselen, who signs off on this capability, and Ali. **Capability:** `sales.revenue_definition_integrity_guard`, first release (autonomy:R2).

## What it does

You tell Vick where a revenue figure comes from, and Vick says whether it follows the rule:
**revenue is money collected through a checkout the app itself started.** It names the rule the figure follows or breaks, and the file and line that say so.

It only reads and reports. It changes nothing, and it never gives a revenue number of its own. It doesn't even look at the number shown. It judges where the number comes from.

## The four rules it cites

| Rule | What it says | Where the platform says it |
|---|---|---|
| App-originated only | Revenue is money collected through a checkout the app started. Other charges on the shared payment gateway aren't revenue. | `campaignLinkService.ts:18`; `appPaymentReconcileService.ts:30-38` |
| An enrolment is not a payment | Counting enrolments, leads or pipeline stages never stands in for money collected. | `revenueDashboardService.ts:293-295`; `marketingAnalyticsService.ts:18-20` |
| A count times a price is not revenue | It's a projection. It's allowed only if it's labelled as an assumption and the price comes from the price setting, not a fixed number in the code. | `revenueDashboardService.ts:8-12`, `:144-146` |
| Unavailable, never zero | When a source is missing, the figure says "unavailable" and why. It never shows $0. | `adminOs/metricRegistry.ts:22`, `:181-188` |

The plan says "the four rule statements" without listing them. These four are taken from the plan's own exceptions and its business outcome. If you or Ali would word any of them differently, tell me and I'll update them.

## What it finds today

Six revenue figures, traced in the platform code as of 16 November (commit `d4c90d3`):

| Where | Label | Verdict | Why |
|---|---|---|---|
| Revenue dashboard | Actual revenue | Follows the rule | Shows "unavailable" with a reason |
| Revenue dashboard | Projected revenue | Allowed projection | Labelled an assumption; price comes from the setting |
| Campaign attribution | Total revenue per lead | Follows the rule | Empty with a stated reason until payments are connected |
| Marketing channel ROI | Channel revenue | Follows the rule | Empty with a stated reason |
| **Opportunities page** | **Projected Revenue** | **Breaks the rule** | A fixed $4,500 in the code, not labelled as an assumption |
| **Cory simulation** | **Revenue** | **Breaks the rule** | A fixed $2,500 in the code (it is listed as an assumption) |

## Two things the plan has out of date

The plan lists two "live, unfixed" problems. Both have since been fixed on the platform:

1. **The revenue dashboard's "actual revenue = enrolled × $4,500".** It's gone. `actualRevenue` was removed and is reported as unavailable (`revenueDashboardService.ts:1-27`, `:148-160`). So the plan's open question, whether to fix that page or retire it, no longer needs an answer.
2. **The $4,500 invoice default in `paysimpleService.ts`.** It's gone. The invoice amount is now required (`paysimpleService.ts:396-410`).

The $4,500 that's still live is on the **Opportunities page** (`opportunityScoringService.ts:18`). Ali decided on 10 September that it should read the setting and say it's an assumption. That fix hasn't been built yet.

## What it needs from you

- **Roselen:** check that the four rules above say what you mean by revenue. The fix for each "breaks" is a code change someone makes. This guard only reports.
- **Ali:** the plan's text for this capability needs the two fixed items taken out.

Code: [revenueGuard.js](revenueGuard.js). Tests: [revenueGuard.test.js](revenueGuard.test.js), 10 tests. The traced figures: [fixtures/surfaces.json](fixtures/surfaces.json).
