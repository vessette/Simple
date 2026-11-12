# "Net revenue", "net" and "collected": what each one means today

**Project note.** It sets out the current definitions and calculations side by side, so it's clear where the confusion comes from. Everything is read from the platform code at commit `109820a`, and nothing has been measured in production. The decisions this leads to are in [REVENUE_FOR_ROSELYN.md](REVENUE_FOR_ROSELYN.md).

## The three terms

### Net revenue: the platform's definition, which can't be computed yet

The platform's list of approved metric definitions (`adminOs/metricRegistry.ts:171-190`):

| | |
|---|---|
| Definition | "Gross revenue less refunds and adjustments in the period." |
| Formula | gross − refunds − adjustments |
| Sources | PaySimple transactions; CCPP for plan and enrolment context; refunds |
| Counted per | **transaction** |
| Can be split by | plan, cohort, source, **period** |
| Status | **unavailable**: "Source IDENTIFIED but not yet wired … There is still no local payments table … nothing here can compute a figure yet." |

The dashboard asks this list and reports net revenue as unavailable, with that reason (`revenueDashboardService.ts:151-160`). **This is the only definition of revenue the platform has approved, and its own answer is: not yet.**

### "Collected": what the platform adds up instead

`revenuePaymentsService.ts:54-78`, `:172-175`:

```
collected   = memberships + available deposits
memberships = sum of amount_paid on enrolments that are paid, active, and amount_paid > 0
deposits    = sum of Open House deposit credits still "available"
```

- **Counted per: enrolment, one amount each.** A scheduled renewal doesn't add to it (`subscriptionScheduleService.ts:243-247`). A later activation overwrites it (`subscriptionService.ts:602`).
- **Period: none.** All time.
- **Source: the enrolment table,** not PaySimple.

The dashboard's revenue figure (`cohortService.ts:541-548`) is the same calculation with one difference: it counts **every** available credit, not only Open House deposits.

### "Net" on the payments page: collected less refunds

`revenuePaymentsService.ts:174`, `:182`:

```
net = collected − refunds marked "succeeded" in the refund ledger
```

- **The same per-enrolment, all-time basis as collected.**
- **Adjustments aren't included,** because nothing records them.
- **The refund ledger may be incomplete.** The approved definition notes it held 3 rows, the latest from 6 August, as of 5 September (`metricRegistry.ts:182-187`).

## Where they differ

| | Net revenue (approved definition) | Collected | "Net" on the payments page |
|---|---|---|---|
| What's counted | Each PaySimple transaction | One recorded amount per enrolment | Same as collected |
| A member who renewed 6 times | 6 payments | 1 amount | 1 amount |
| Time period | Per period | All time | All time |
| Refunds | Subtracted | Not subtracted | Subtracted (succeeded ones in the ledger) |
| Adjustments | Subtracted | Not considered | Not considered |
| Source | PaySimple | Enrolment records | Enrolment records and the refund ledger |
| Status | Unavailable | Computed | Computed |

**So "net" on the payments page isn't net revenue under another name.** It counts different things over a different period from a different source. It shares only the idea of subtracting refunds.

## Where the confusion comes from: the labels

The same figures carry different names on different screens:

| Where | Label shown | What the number actually is |
|---|---|---|
| Admin dashboard tile (`AdminDashboardPage.tsx:358-359`) | **Revenue** | Collected, with all credits, before refunds |
| Governance page (`GovernanceCommandCenter.tsx:1090`) | **Revenue** | The same |
| Digest email (`emailService.ts:1571-1572`) | **Revenue** | The same |
| Revenue page, first card (`AdminRevenueDashboardPage.tsx:119`) | **Collected**: "Real cash · matches the dashboard" | Collected, with deposits only, before refunds |
| Revenue page, fourth card (`:122`) | **Net collected** when there are no refunds; otherwise **Refunds**, with "net $X" underneath | Collected less refunds |
| Revenue page banner (`:126-130`) | "**Reconciled** … memberships + deposits − refunds = $X, **matching the dashboard Revenue tile**" | Collected less refunds |

Three things in that table aren't true as labelled:

1. **The figure called "Revenue" in three places isn't revenue as the platform defines it.** It's collected before refunds, and the approved definition says revenue can't be computed yet.
2. **The banner's "matching the dashboard Revenue tile" is wrong whenever there has been a refund.** The banner subtracts refunds and the tile doesn't. They're also off by any credit that isn't an Open House deposit.
3. **"Real cash" overstates what collected is.** It's the last recorded amount for each current member, not the money received over time.

## How Vick represents them

| Asked for | Vick says |
|---|---|
| "Revenue" or "net revenue" | **Unavailable,** with the platform's own reason, and points to the two recorded figures below |
| "Collected" | The figure as **collected (recorded)**, with: one amount per enrolment, all time, renewals not added |
| The payments page's "net" | The figure as **collected less refunds,** with: not net revenue as the platform defines it |
| The dashboard's "Revenue" tile | Not served yet. That tile comes from a different endpoint, `GET /api/admin/stats` (`AdminDashboardPage.tsx:169`, `adminCohortController.ts:150`), and the definitions above explain how it differs |

Vick never calls collected or collected less refunds "revenue". It never calls either one cash received over time.

## What would make the terms agree

These are already the decisions in [REVENUE_FOR_ROSELYN.md](REVENUE_FOR_ROSELYN.md):
- **What "revenue" means in reports** until PaySimple is wired in (Ali; decision 1).
- **Renaming the payments page's "net"** so it isn't read as net revenue (Kes; decision 2).
- **Counting the same credits** on the dashboard and the Revenue page (Kes; decision 3).

This note adds two smaller ones, both for Kes:
- **Fix the banner's claim** that it matches the dashboard tile, or make the two subtract the same things.
- **Stop labelling collected "Revenue"** on the dashboard tile, the governance page and the digest email, or label it "Collected (recorded)" there too.
