# Membership checkout: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), and Ali.
**Capability:** `sales.subscription_checkout_and_plan_activation`
**Status:** draft. **Starting a checkout or activating a plan is a person's decision, always.** Vick answers questions; it never starts, discounts or activates anything.

## What Vick does in this first release (R2)

Vick answers a member's plan, price, credit and billing-date questions from two places only: **PLANS** (the platform's price list) and **the member's own subscription record**.

- **Plan and price:** quoted from PLANS, with the source. If a member was charged an older price, Vick says so: "$149, which differs from today's price of $199".
- **Dates:** when the membership started and when it's paid through, in Central time, taken from the member's record. **If the record doesn't have a date, Vick says it's unknown.** For example, a pending membership has no dates until the payment settles. Vick never works a date out from other dates.
- **Credit:** a preview of the first charge with the member's available credit, using the platform's own rules:
  - whole credits only;
  - at least $1 is always left to pay;
  - an annual-only scholarship never reduces a monthly charge;
  - credit is only spent once the payment settles.
- **An unrecognised plan is "unknown".** Vick never guesses it's monthly.

Code: [`memberAnswers.js`](memberAnswers.js), with 11 tests in [`memberAnswers.test.js`](memberAnswers.test.js). It reuses the price list and quoting from the checkout capability.

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code allows, not a record of what has happened.

1. **The spec describes the old billing date rule.** It says the billing period starts on the class start date. Since **30 October 2026**, a membership starts on the day it's paid for and renews on that day each month or year (`billing/billingPeriod.ts:13-37`). Vick explains the current rule. The spec, and anything else telling members their billing starts with the class, should be updated.

2. **An unrecognised plan is charged as monthly.** When a payment is confirmed, a membership whose plan isn't in the price list is quietly treated as monthly (`subscriptionService.ts:436`). Vick reports it as unknown instead.

3. **A spent credit can stay available.** When a payment settles, marking the member's credit as used is allowed to fail with only a log line (`subscriptionService.ts:518-527`). The credit then still looks available and could reduce a later charge again.

4. **What works as the spec says:**
   - The free admin plan can't reach a checkout (`subscriptionService.ts:338-341`).
   - Checkout refuses when billing isn't set up (`:344`).
   - Confirming the same payment twice changes nothing the second time (`:434`).
   - A stored payment customer that belongs to someone else is ignored rather than charged (`:296-330`).

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | Should anything still tell members billing starts on the class start date? | Roselyn | Update the wording to "the day you pay" |
| 2 | What should happen to a membership whose plan isn't recognised? | Ali or Kes | Stop and flag it for a person · keep treating it as monthly (today) |
| 3 | If marking a credit as used fails, who finds out? | Ali or Kes | Alert a person and retry · leave as a log line (today) |

## Your answers

*Fill in with the date.*

**Date:**

**1. Billing-date wording:**

**2. Unrecognised plan:**

**3. Credit not marked used:**
