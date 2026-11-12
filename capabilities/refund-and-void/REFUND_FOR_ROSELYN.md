# Refunds and voids: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), Ali (approver), and finance.
**Capability:** `sales.refund_and_void_issuance`
**Status:** draft. **A refund moves money out and can't be undone, so it's a person's decision, always.** Vick answers questions and can draft a recommendation. It never issues, voids or reverses a payment, not even in a test.

## What Vick does in this first release (R2)

- **Answers refund-ledger questions.** For a payment, Vick says what each refund row records: void or reversal, amount, date (Central), who issued it, and whether it succeeded, failed or is still pending. Every answer names the ledger row it came from. If there's no row, Vick says so, and that this doesn't rule out a reversal made directly in PaySimple.
- **Answers refund-policy questions.** The refund and cancellation terms are drafted and not approved yet. So Vick says that, and states no terms.
- **Sends anything else to a person.** "Can you refund me?", "Am I eligible?" and "Will I get my money back?" go to a person with admin access to the refunds page. Vick never says a refund will happen.
- **Drafts a recommendation when asked.** The draft lists:
  - the ledger rows;
  - what the platform's own rule allows (a void while the void window is open, otherwise a full reversal once the payment has settled, or the reason the platform would refuse);
  - that the policy is unapproved;
  - what a refund doesn't change.

  It has no decision on it. A person accepts or rejects it.

Code: [`refundAnswers.js`](refundAnswers.js), with 10 tests in [`refundAnswers.test.js`](refundAnswers.test.js). Fixtures are fictional.

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code allows, not a record of what has happened.

1. **There's no approved refund policy.** The terms are recorded as "drafted and pending final approval" (`salesHubCoryController.ts:33`). The refunds page works without one: any admin can refund any settled payment.

2. **A refund doesn't change the enrollment.** Issuing a refund writes the refund row and voids unspent account credit, nothing else (`refundService.ts:93-174`). The person stays marked as paid, keeps portal access and keeps their seat. This is the same gap as returned payments in the payment confirmation brief.

3. **A row can say "failed" after the money has moved.** The gateway call, the credit void and the final update of the row sit in one block. If the credit void or the update breaks after the gateway has reversed the payment, the row is marked failed with a gateway error (`refundService.ts:155-172`). The ledger then shows a failure for a refund that happened.

4. **Credit that's already been spent isn't flagged.** The credit void reports how much credit was already used (`accountCreditService.ts:165-178`), but the refund ignores that figure (`refundService.ts:161`). If someone used a $50 credit and is then refunded in full, nobody is told.

5. **A pending row is never resolved, and doesn't stop a second attempt.** The over-refund check counts only succeeded rows (`refundService.ts:44-47`). Nothing stops two refunds on the same payment at once (`Refund.ts:72-75`). In practice the payment's status in PaySimple usually stops the second one, but a row left pending stays pending.

6. **There are three versions of the terms, and none is confirmed.**
   - Cory's facts say the terms are drafted and pending approval (`salesHubCoryController.ts:33`).
   - The launch briefs carry a provisional 7-day refund, case by case after that, and none after Week 2 (`docs/training-program-2026-q3/launch-briefs/04-decisions-locked.md:44-45`).
   - The company knowledge base has an entry that quotes a 14-day / non-refundable clause and labels itself "Approved policy". A platform session log flags this contradiction (`docs/sessions/CC-20261005-r6h2.md:2566`).

   Vick reads only the first and quotes none of them.

7. **What works as the spec says:**
   - The row is written as pending before the gateway call (`refundService.ts:139-152`).
   - An already-reversed payment is refused (`:110-112`).
   - Partial amounts are refused, because the gateway only reverses whole payments (`:123-126`, `paysimpleService.ts:379-381`).
   - A void is used inside the void window, a reversal only once settled, and anything else is refused (`refundService.ts:128-134`, `paysimpleService.ts:358-369`).
   - With no billing credentials, the request is refused before anything is attempted, with a 503 (`refundService.ts:99`, `adminRefundController.ts:5`).
   - The routes are admin-only (`refundRoutes.ts:7-9`).
   - The page asks for confirmation before moving money (`AdminRefundsPage.tsx:49`).

## Before this can be validated

- **You have no admin login,** so you can't reach the review or approval surface for this capability.
- **The agent can't read the payment gateway or the production database** (both are denied by default). For the platform-rule part of a recommendation, a person has to run the lookup on the refunds page and pass the result in. Without it, the draft says the payment is unknown.

## Refund policy trail

How the search for the approved terms has gone, so nobody repeats a step. Add a row for each step. People are listed by role here because this repository is public.

| Date | Step | Result | Next |
|---|---|---|---|
| 2026-11-11 | Read the platform code and documents for refund terms | Three versions found (finding 6); none confirmed | Ask the owner of the finalized-agreement task |
| 2026-11-11 | Checked the finalized-agreement task (due 2026-06-19) | Not checked yet: the agent has no access to the task tracker | Admissions operations or the approver checks it |
| 2026-11-11 | Note sent to admissions operations, approver copied: which version is the policy, and was the task completed? | Sent; awaiting a reply | Record the reply here; follow up if none by 2026-11-16 |

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | Which of the three versions is the refund policy, and who signs it off? | Roselyn, with Ali | Confirm one · write a new one. Until then, Vick states no terms |
| 2 | Should a refund remove access and free the seat? | Roselyn, with Ali | Remove both · flag for a person · leave as is (today) |
| 3 | Should a refund that moved money always be recorded as succeeded? | Ali or Kes | Record the gateway result first, and the credit void separately |
| 4 | When spent credit can't be recovered, who's told? | Roselyn, with finance | Flag it on the refund · leave as is |
| 5 | Can you get an admin login to review this? | Ali | Yes · review another way |

## Your answers

*Fill in with the date.*

**Date:**

**1. Terms:**

**2. Access and seat after a refund:**

**3. Ledger result:**

**4. Spent credit:**

**5. Admin login:**
