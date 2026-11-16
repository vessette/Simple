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

## A proposed definition of "needs attention" (yes, or change it)

> **A member needs attention today if a person must act to keep or recover their payment, and nothing automatic will do it first.** That means any one of:
> 1. An automatic payment was **declined**.
> 2. A renewal checkout **failed**.
> 3. They're **past their renewal date on manual billing**, and no reminder has gone out in the last day.
> 4. They're **at risk before their renewal** (see the signals below).
>
> **Not on the list:**
> - free seats and staff;
> - members on the exclusion lists;
> - autopay members whose schedule is about to collect;
> - anyone due to renew with nothing missed and a clean history (the reminders cover them).

### What each member's place on the list could be based on

All of these exist in the platform's data today:

| Attribute | Why it matters | Where it comes from |
|---|---|---|
| Payment status | A declined or failed payment is a problem now; "due soon" is only a possible one | Billing check; subscription status |
| Autopay or manual | On autopay a lapse may fix itself; on manual nothing happens unless a person acts. The biggest source of false alarms. | Whether the subscription has a schedule id |
| Days past the renewal date | After 7 days the reminders stop, so a person is the only route left | Period end vs today |
| Whether anyone has contacted them | Don't double-chase | The renewal reminder records |
| Money at stake | An annual lapse is $1,788; a monthly one is $199 | Plan |
| Payment method | Bank-draft members have no card-expiry risk, but need consent before autopay | The stored payment account type |
| Membership level | Free seats and staff never need money attention; excluded members need a special route | Plan; exclusion lists |

### Early warning while card expiry is unavailable

Card expiry is the only *advance* warning in the original plan, and the platform doesn't fetch card dates yet (see the billing write-up). Until Kes confirms the PaySimple card field, these signals do most of the same job.

**From payment history.** Every renewal creates a new subscription row and old rows are kept, so all of these can be worked out:

| Signal | How it's worked out | Why it predicts trouble |
|---|---|---|
| Declined before, and why | An earlier past-due row, with its stored reason (`subscriptionScheduleService.ts:263-267`) | Repeat declines cluster (four members declined two months running in October). "Card lost" or "closed account" means the card on file is dead. |
| Lapsed before | An earlier period ended and the next started late | Someone who let it slip once is likelier to again |
| Paid late before | Days between a period ending and the next payment | A habit of needing reminders |
| First renewal coming up | Only one paid period so far | There's no habit of paying yet |
| Came back after lapsing | A gap, then a new paid row | A good sign, so they aren't treated as a risk forever |

**Proposed "at risk before renewal" rule:** renewing within 14 days **and** any of the following:
- declined before;
- a decline reason saying the card is lost, closed or invalid;
- lapsed before;
- paid late before;
- this is their first renewal;
- an annual plan on manual billing.

**Kept out of the ranking for now:**
- **How long they've been a member.** It's useful context ("in their 3rd month"). But the platform's own note warns that its months-since-joining view compares different groups of people and isn't a retention measure. If your experience says a particular month is when people drop off, that's a rule *you* can set, and Vick would apply it as yours.
- **Whether they're using the program** (portal activity). I haven't confirmed the data is reliable, or that using it is appropriate. That's a question for you and Ali.

### A proposed ordering rule

1. **What kind of problem:** money already missed (declined, failed) before money at risk (at risk before renewal) before a lapse a person can still recover.
2. **Within a kind, money at stake:** annual before monthly.
3. **Then time pressure:** the longest overdue, or the soonest due, first.

### What would change in Vick's list if you agree

- "Renewal due within 7 days" on its own drops off. It only appears with an at-risk signal.
- "Lapsed" shows only for members on manual billing.
- The payment-history flags are added, worked out from subscription rows the revenue page already returns, with a test for each.
- Annual ranks above monthly within each kind.

None of this is built yet. I'd make the change in one go after your answer, and treat these as rules to test against your own sense of who's at risk for a couple of weeks before relying on them.

## What I need from you

1. **The definition and order:** is the "needs attention" definition above right, or what would you change? Is the ordering rule how you'd work through the list?
2. **The early-warning signals:** which of the payment-history signals match your sense of who's at risk? Is there a point in a membership (a particular month, say) when you see people drop off?
3. **The exclusion lists:** they're written into the code, so adding someone needs a code change. Is that fine for now, or should Ali be asked to make them editable?

Code: [worklist.js](worklist.js). Tests: [worklist.test.js](worklist.test.js), 6 tests. Example data (made up, including made-up exclusions): [fixtures/sources.json](fixtures/sources.json).
