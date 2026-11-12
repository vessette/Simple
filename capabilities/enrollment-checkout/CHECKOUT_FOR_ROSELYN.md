# Enrollment checkout: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), and Ali.
**Capability:** `sales.enrollment_checkout_link_issuance`
**Status:** draft. **Issuing a payment link is a person's decision, always.** Vick explains; it never creates a customer, a link or an enrollment.

## What Vick does in this first release (R2)

- **Quotes current prices** only from PLANS, the platform's single price list, and says where each price came from:
  - Annual: **$149 a month, billed annually as $1,788 a year**
  - Monthly: **$199 a month**
- **Refuses any price it can't trace.** Asked "is it $4,500?", it says **that isn't the price**. $4,500 is the retired per-participant offer, and nobody has ever paid it. It then gives the real prices.
- **Never quotes the free admin seat** as a checkout price.
- **Explains the checkout steps** and what each payment state means: pending, pending invoice, paid, failed.
- **Checks the price list before using it.** If the list doesn't add up (for example, $149 a month not coming to $1,788 a year), Vick refuses it instead of quoting from it.

Code: [`checkoutExplainer.js`](checkoutExplainer.js), with 10 tests in [`checkoutExplainer.test.js`](checkoutExplainer.test.js). Prices come from [`fixtures/plans.json`](fixtures/plans.json), a copy of PLANS taken at platform commit `109820a`.

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code allows, not a record of what has happened.

1. **The live checkout route issues links for $4,500.** `POST /api/create-invoice` is switched on (`server.ts:252`, `enrollmentRoutes.ts:14`). Its handler creates the invoice **without passing a price** (`enrollmentController.ts:62-68`), so the default of $4,500 applies (`paysimpleService.ts:404`). The platform's own price module lists $4,500 as **not the price** (`membershipPrice.ts:79-82`).
   - In test mode the amount is forced to $0.01 (`paysimpleService.ts:250`), so testing wouldn't show the problem.
   - I found no page on the website that calls this route, so **whether anyone has used it is unknown.** Ali or Kes can check for enrollments with a $4,500 link.
   - **Closed, 2026-11-12 (Ali):** the route is retired. It now answers 410 and logs the caller. Nobody was ever charged $4,500: none of the enrollments that went through the payment-link path were at that amount, and the last use was on 21 July 2026.

2. **The customer we store is often not the one charged.** The hosted payment page creates its own customer record when the person pays (`appPaymentReconcileService.ts:22-28`). That's why payments sometimes can't be matched to their enrollment, and why the reconciliation capability exists.

3. **A link can exist with no enrollment.** The payment link is created first and the pending enrollment second (`enrollmentController.ts:62-76`). If recording the enrollment fails, the person still has a working payment link, but nothing to match their payment to. The reverse case is handled correctly: if the payment provider fails, no enrollment is created.

4. **Nothing holds the seat.** The class is checked for space (`enrollmentService.ts`, `validateCohortAvailability`), but nothing reserves a seat until the enrollment is marked paid. Two people can both get a link for the last seat.

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | Should `/api/create-invoice` stay switched on? | Ali or Kes | Pass the real plan price · switch the route off · leave as is (not recommended) |
| 2 | Has anyone been sent a $4,500 link? | Ali or Kes | A read-only check of enrollments created through this route |
| 3 | If a payment link exists but the enrollment wasn't recorded, what happens? | Ali or Kes | Cancel the link · retry recording the enrollment |
| 4 | Should a seat be held while a link is open? | Roselyn | Hold for a set time · first to pay wins (today) |

## Your answers

*Fill in with the date.*

**Date:** 2026-11-12 (answers 1 and 2 from Ali)

**1. Route:** Switched off. It now answers 410 and logs anything that still calls it.

**2. $4,500 links:** None. No enrollment from the payment-link path was at $4,500, and the ones that paid were at $199.

**3. Link without enrollment:**

**4. Holding a seat:**
