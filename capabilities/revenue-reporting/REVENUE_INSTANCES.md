# Every "revenue" on the platform: where it appears, where it comes from, and what affects it

**Project note**, for the team. A companion to [DEFINITIONS.md](DEFINITIONS.md), which compares net revenue, "net" and "collected" in depth. Everything here is read from the platform code at commit `109820a`; no production figure was measured. I found these by searching the admin pages for any figure labelled or named revenue. Demo data and public landing-page copy are left out.

## What "revenue" usually means

Revenue is the money customers paid for what we sold, over a stated period, less what was given back.
- **On a cash basis,** it's the payments received in the period less refunds.
- **For subscriptions on an earned basis,** an annual payment of $1,788 counts as $149 a month over the year, rather than all at once.

Either way, three things are always stated: **what is counted** (payments), **the period**, and **what is taken off** (refunds, chargebacks).

Two related figures aren't revenue:
- **MRR** is a run-rate: what current members' plans would bring in each month.
- **A projection** is a forecast: an assumed price times an expected number of sales.

The platform's own approved definition is the cash one: "Gross revenue less refunds and adjustments in the period", counted per PaySimple payment (`adminOs/metricRegistry.ts:171-190`). It's marked **unavailable**, because the PaySimple payments aren't wired in yet.

## The comparison

**Kind:** *recorded* is built from stored records; *projection* is a forecast from an assumed price; *unavailable* means the platform declines to compute it.

| # | Where it appears | Label | What the number is | Source | Kind | What affects it |
|---|---|---|---|---|---|---|
| 1 | Admin dashboard tile | **Revenue** | Amount paid on paid, active enrolments, plus **every** available account credit | `GET /api/admin/stats` → `cohortService.ts:541-548`; shown at `AdminDashboardPage.tsx:358-359` | Recorded | One amount per enrolment: renewals don't add to it, and a later activation overwrites it. Authorized payments count. A free seat sets the amount to $0. Withdrawn enrolments are left out. Any credit counts, not only deposits. **Refunds aren't subtracted.** All time. |
| 2 | Governance page | **Revenue** | The same as 1 | `strategic-intelligence/metrics` → `metricCollector.ts:103`, `:129`; shown at `GovernanceCommandCenter.tsx:1090` | Recorded | Everything in 1, and **if the lookup fails, it shows $0** instead of unavailable (`metricCollector.ts:103`). |
| 3 | Digest email | **Revenue** | The same as 1 | `digestService.ts:97`; `emailService.ts:1571-1572` | Recorded | Everything in 1. It's emailed, so a misleading figure leaves the platform. |
| 4 | Revenue page, first card | **Collected**: "Real cash · matches the dashboard" | Amount paid on paid, active enrolments, plus **Open House deposits only** | `GET /api/admin/revenue/payments` → `revenuePaymentsService.ts:172-175`; `AdminRevenueDashboardPage.tsx:119` | Recorded | As in 1, but deposits only. **It differs from 1 by any other credit,** such as the postponement credit a cleanup script creates. |
| 5 | Revenue page, fourth card and banner | **Net collected** or **Refunds**; banner "Reconciled … matching the dashboard Revenue tile" | 4 less succeeded refunds | `revenuePaymentsService.ts:182`; page `:122`, `:126-130` | Recorded | The refund ledger may be incomplete (`metricRegistry.ts:182-187`). **The banner's match to 1 is false whenever a refund has succeeded,** because 1 subtracts none. |
| 6 | Revenue page, payments table | "… counted toward revenue" | The number of rows counted in 4 | `PaymentsLedgerTable.tsx:129`; flags at `revenuePaymentsService.ts:109`, `:131`, `:149` | Recorded | Refunds and applied deposits are shown but not counted. |
| 7 | Revenue dashboard response | Net revenue | Not computed | `GET /api/admin/revenue/dashboard` → `revenueDashboardService.ts:151-160` | **Unavailable** | Stays unavailable until PaySimple payments are wired in and reconciled. |
| 8 | Revenue dashboard response | Projected revenue; pipeline value | Expected enrolments, or qualified leads, × the `price_per_enrollment` setting | `revenueDashboardService.ts:145-146`, `:203` | Projection | The assumed price comes from a setting. If the setting is unset, the figure is null rather than a guess. Labelled as an assumption. |
| 9 | Opportunities page | **Projected Revenue** | Projected enrolments × **$4,500** | `opportunityScoringService.ts:18`, `:394-410`; `AdminOpportunitiesPage.tsx:360` | Projection | **A hardcoded $4,500,** the retired price nobody has been charged. It isn't labelled as an assumption. The platform's own capability notes already flag it (`sales.json:2340`). |
| 10 | Governance page (Cory) | Projected revenue in the forecast | The same as 9 | `metricCollector.ts:109` | Projection | Everything in 9, and **a failed lookup shows $0** here too. |
| 11 | Campaign recommendations tab | **Estimated Revenue**; "Est. Revenue" per lead | The sum, over pending recommendations, of probability × average deal value | `leadIntelligenceService.ts:79`, `:138`, `:336-342`; `LeadRecommendationsTab.tsx:169-170`, `:275` | Projection | The average deal value comes from the campaign's settings, defaulting to **$25,000**. Only pending recommendations count. |
| 12 | Cory simulation | **Revenue** | Predicted enrolments × **$2,500** | `coryStrategicSimulationEngine.ts:105`, `:119`, `:126`; `CoryExplainMenu.tsx:188` | Projection | A hardcoded $2,500, listed among the simulation's assumptions. |
| 13 | Intelligence initiatives and roadmap | **Revenue Impact (Projected)**; "Revenue" column | An estimate stored on each initiative | `Initiative.ts:105`; some seeded (`seedDepartments.ts:171-175`); `InitiativeStoryModal.tsx:279`, `InitiativesTab.tsx:103` | Projection | Entered by hand, not computed. |

## What the table shows

1. **"Revenue" on its own (rows 1-3) is a recorded figure that the platform's definition wouldn't call revenue.** It's collected before refunds, counted once per member, over all time.
2. **There are four different assumed prices for one enrolment** across the projections: the price setting (8), $4,500 (9 and 10), $25,000 (11) and $2,500 (12). Only 8 reads its price from a setting, and only 8 and 12 say it's an assumption.
3. **Two recorded figures disagree with each other** (1 and 4, on credits), and a banner says they agree (5).
4. **Two places show $0 when a lookup fails** (2 and 10). Only the revenue dashboard response reports a missing figure as unavailable (7).
5. **None of the recorded figures can be limited to a period.** Every one is all time.

## What I'd suggest the team agree on

- **Use "revenue" only for the platform's defined figure,** row 7, and give everything else its own name:
  - rows 1-4: *collected (recorded)*;
  - row 5: *collected less refunds*;
  - rows 8-13: *projected revenue (assumed $X per enrolment)*.
- **Make every projection read its price from the one setting,** and say so beside the figure. Row 9 is the urgent one, because $4,500 is a price nobody has paid.
- **Show "unavailable" rather than $0** when a lookup fails (rows 2 and 10).

These overlap with the decisions in [REVENUE_FOR_ROSELYN.md](REVENUE_FOR_ROSELYN.md): what "revenue" means in reports is Ali's call, and the label and code fixes are Kes's. Vick already follows the naming above: it reports row 7 as unavailable, rows 4 and 5 under their own names, and refuses projections as revenue.
