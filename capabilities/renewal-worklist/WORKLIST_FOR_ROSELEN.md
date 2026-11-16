# Your daily renewal worklist

**For:** Roselen, who signs off on this capability and sets its order, and Ali. **Capability:** `sales.renewal_and_revenue_follow_through_worklist`, first release (autonomy:R2).

## What it does

Instead of reading the revenue page and the billing check separately, Vick gives you **one short list** each day of members whose money needs attention. Each member appears once, with:
- why they're on the list, and the platform check that found it;
- the next action, which a person does.

Vick contacts nobody and charges nobody.

## What puts someone on the list (in a proposed order: you decide the real one)

| # | Reason | Where it comes from | Next action |
|---|---|---|---|
| 1 | **Automatic payment declined** | Billing check (`billingHealthCheck.ts:264`) | Ask for a current card. **Don't send a payment link:** the schedule would charge them twice. |
| 2 | **Lapsed, and nobody has written** | Billing check (`:102-122`) | Check the reminder job ran, then contact them about the next period |
| 3 | **Renewal checkout failed** | Revenue page (`subscriptionAnalyticsService.ts:443-452`) | Ask them to retry with a working card |
| 4 | **Lapsed** | Revenue page (`:418-430`) | First check whether they're on autopay, since a schedule may be about to collect. If not, offer the next period. |
| 5 | **Card expires before the next charge** | Billing check (`:181`) | Ask for a new card before the date |
| 6 | **Renewal due within 7 days** | Revenue page (`:418-425`) | Usually nothing; the renewal reminders cover it |

I ordered them by how much money or goodwill is at stake. The brief says the order is yours, so please change it if you'd work it differently.

**A lapsed month is written off, never charged afterwards** (`paysimpleRecurring.ts:81-83`). So no row ever suggests charging a missed period, only offering the next one.

## Who's never on it

**Members on the platform's two standing exclusion lists** (`subscriptionScheduleService.ts:39-43`, `:52-55`) are left off entirely, from every source. A test proves it. They need something different from a renewal chase: bank-draft consent, or a new card from the actual cardholder.

The brief says two members are on these lists. Today there are **five**: three waiting for bank-draft consent and two with blocked cards. Vick only reports *how many* were held out each day, never who, and none of their details are copied here.

## Empty means empty

- If nobody needs attention, the list says **"Nothing needs renewal attention today."** It isn't padded with low-priority names to look busy.
- If one of the sources couldn't be read, the list says it's **incomplete**, not empty. "Nothing to do" is only said when Vick actually checked everything.

## What I need from you

1. **The order:** is the proposed order above how you'd work through the list?
2. **"Needs attention":** is a renewal due within 7 days worth listing at all, given the reminders already cover it? Or should the list only show problems?
3. **The exclusion lists:** they're written into the code, so adding someone needs a code change. Is that fine for now, or should Ali be asked to make them editable?

Code: [worklist.js](worklist.js). Tests: [worklist.test.js](worklist.test.js), 6 tests. Example data (made up, including made-up exclusions): [fixtures/sources.json](fixtures/sources.json).
