# Payment confirmation and seats: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), and Ali.
**Capability:** `sales.payment_confirmation_and_seat_grant`
**Status:** draft. **Confirming a payment grants a paid seat, so it's a person's decision, always.** Vick explains; it never marks anyone paid, gives access or changes a seat.

## What Vick does in this first release (R2)

For a named person, Vick explains their payment and seat state, and which payment notice path produced it. Every statement names the record it came from:
- their **enrollment record**;
- a **membership (subscription) record**;
- the **recent payment-notice log**.

**If there's no record, Vick says the answer is unknown.**

It covers:
- whether they're paid, pending or failed;
- whether their portal access is on;
- which class their seat is in;
- the payment id and amount;
- whether a seat was counted;
- for members on automatic billing, that the first payment and each renewal come through different paths.

It also flags records that don't fit together, for a person to look at:
- **Marked paid, but portal access is off.**
- **Marked paid with no payment id.** That means it wasn't marked paid by a payment notice.
- **A membership is active but the enrollment isn't marked paid.**

Code: [`paymentState.js`](paymentState.js), with 9 tests in [`paymentState.test.js`](paymentState.test.js).

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code allows, not a record of what has happened.

1. **A returned payment doesn't free the seat or remove access.** When a payment is returned (reversed), the payment-notice handler logs it, but only a failed payment updates the enrollment (`webhookController.ts:168-176`). A separate job does catch it later, if it's switched on (see the correction below): every 30 minutes it re-reads each recorded payment and marks returned, voided, refunded and charged-back ones as failed, which takes them out of revenue. That job doesn't change portal access, the seat or the member tier. So the person keeps their access and their seat either way.

2. **The payment's own status isn't checked.** The notice includes the payment's status. The handler reads it (`webhookController.ts:67`) but marks the person paid whatever it says (`:118-121`).

3. **A failed first membership payment isn't recorded.** A failure for a membership payment is passed to the enrollment updater (`:175`). That updater only searches enrollments (`enrollmentService.ts:239-247`), so it finds nothing, and the failure isn't recorded anywhere.

4. **Two copies of the same notice arriving together could count two seats.** The "already paid?" check (`enrollmentService.ts:119`), saving the record (`:170`) and adding the seat (`:173-176`) are separate steps, with nothing locking them together. Nothing records which notices have already been handled either: the notice id is only written to the log (`webhookController.ts:56-59`).

5. **The payment-notice log is kept in memory for an hour.** It's lost whenever the server restarts (`paysimpleWebhookHealth.ts:10-24`). That's fine for spotting a sustained outage, but it can't answer "did we receive this person's notice last week?"

6. **The follow-up steps can fail without anyone being told.** Updating the lead, starting the welcome automation and adding the person to the class-readiness emails each only log an error if they fail (`webhookController.ts:127-163`).

7. **What works as the spec says:**
   - An already-paid enrollment isn't counted again (`enrollmentService.ts:119`).
   - A failure never overrides a paid state (`:244`).
   - A notice with no reference is acknowledged so the payment provider stops retrying (`webhookController.ts:101-105`).
   - A bad signature is rejected (`:42-49`).

## Corrections after platform review (2026-11-12)

Kes reviewed the change request I sent on 11 November. Each point below was then checked against the platform code at `109820a`.

| What I said | What's right | Where |
|---|---|---|
| A returned payment changes nothing. | A 30-minute job (`PaySimplePaymentSync`) re-reads each recorded payment. It marks returned, voided, refunded and charged-back ones as failed, which takes them out of revenue. It doesn't touch portal access, the seat or the tier. It only runs when `PAYSIMPLE_SYNC_ENABLED=true`, and whether that's on in production is **unknown**. | `paymentSyncService.ts:31-36`, `:232-256`; `schedulerService.ts:2229-2241`; `env.ts:39` |
| The amount floor is $50. | The floor is **$100**. $50 is the Open House seat-hold deposit that the floor exists to screen out. | `paymentReconciliationService.ts:40-64` |
| Settled-only matches the rule the platform already uses. | The platform has **three** rules. The payment-notice handler accepts any status. The 30-minute job counts `Authorized` as paid. The reconciliation job accepts only `Settled` or `Posted`. A settled-only webhook follows the third and conflicts with the second. | `webhookController.ts:67`, `:118-121`; `paymentSyncService.ts:31-33`; `paymentReconciliationService.ts:37` |

**A risk in the fix I proposed.** I said to leave an `Authorized` payment pending. If that also means the payment id isn't recorded on the enrollment, nothing would ever promote it. The 30-minute job only reads enrollments that already have a payment id (`paymentSyncService.ts:110-121`). A customer who really paid could stay locked out. So the fix has to record the payment id even while the enrollment waits. It also needs one agreed rule for when `Authorized` counts as paid, used in all three places.

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | What should happen when a payment is returned? | Roselyn, with Ali | Mark it for a person to review · remove access and free the seat · leave as is (today) |
| 2 | What single rule says a payment counts as paid, used by the notice handler, the 30-minute job and reconciliation alike? Is the 30-minute job on in production? | Ali or Kes | Settled or Posted only (an Authorized card waits, with its payment id recorded so it can be promoted) · Authorized counts too (as the 30-minute job does today) · leave the three rules as they are |
| 3 | Should failed first membership payments be recorded? | Ali or Kes | Record them on the membership · leave as is |
| 4 | Should the platform record which payment notices it has handled? | Ali or Kes | A store of handled notices, so a repeat changes nothing |

## Your answers

*Fill in with the date.*

**Date:**

**1. Returned payments:**

**2. Payment status:**

**3. Failed membership payments:**

**4. Handled notices:**
