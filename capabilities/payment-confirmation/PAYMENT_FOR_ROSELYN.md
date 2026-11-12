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

**One definition of paid** (added 2026-11-12). Vick uses the rule Ali decided, not any of the platform's three: only `Settled` or `Posted` counts. It lives in one place, [`paidRule.js`](paidRule.js). The enrollment record doesn't store the payment's own status, so:
- **Without a read from the payment provider**, Vick says whether the payment counts as paid is **unknown**, and names the payment id to look up.
- **With a read of that same payment**, it answers yes or no and cites the read. It flags a person when the record says paid but the read says `Authorized` (not paid yet under the rule) or a reversal (access to be removed and the seat freed, by a person).
- **A read for a different payment, or a status the rule doesn't cover**, stays unknown.

**The pre-flight list.** Given the read-only lookups of each paid enrollment's payment, Vick sorts every paid enrollment by name into one of four groups:
- **reversed:** would lose access;
- **only authorised:** would lose access under the new rule;
- **keeps access:** settled or posted;
- **unknown:** no payment id, no lookup, a failed lookup, or an uncovered status.

No enrollment is dropped. It writes nothing.

Code: [`paymentState.js`](paymentState.js) and [`paidRule.js`](paidRule.js), with 14 tests in [`paymentState.test.js`](paymentState.test.js).

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code allows, not a record of what has happened.

1. **A returned payment doesn't free the seat or remove access.** When a payment is returned (reversed), the payment-notice handler logs it, but only a failed payment updates the enrollment (`webhookController.ts:168-176`). A separate 30-minute job could catch it, but **it isn't running in production** (Ali, 2026-11-12; see Step 0 below). So today a returned, voided, refunded or charged-back payment is never marked failed: the person keeps access and their seat, and the payment stays in revenue. Even when that job runs, it doesn't change portal access, the seat or the member tier.

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
| A returned payment changes nothing. | A 30-minute job (`PaySimplePaymentSync`) re-reads each recorded payment. It marks returned, voided, refunded and charged-back ones as failed, which takes them out of revenue. It doesn't touch portal access, the seat or the tier. It only runs when `PAYSIMPLE_SYNC_ENABLED=true`. **Update, 2026-11-12: it's off in production** (Step 0 below), so this correction is reversed: nothing marks returned payments failed, and the revenue concern stands in full. | `paymentSyncService.ts:31-36`, `:232-256`; `schedulerService.ts:2229-2241`; `env.ts:39` |
| The amount floor is $50. | The floor is **$100**. $50 is the Open House seat-hold deposit that the floor exists to screen out. | `paymentReconciliationService.ts:40-64` |
| Settled-only matches the rule the platform already uses. | The platform has **three** rules. The payment-notice handler accepts any status. The 30-minute job counts `Authorized` as paid. The reconciliation job accepts only `Settled` or `Posted`. A settled-only webhook follows the third and conflicts with the second. | `webhookController.ts:67`, `:118-121`; `paymentSyncService.ts:31-33`; `paymentReconciliationService.ts:37` |

**A risk in the fix I proposed.** I said to leave an `Authorized` payment pending. If that also means the payment id isn't recorded on the enrollment, nothing would ever promote it. The 30-minute job only reads enrollments that already have a payment id (`paymentSyncService.ts:110-121`). A customer who really paid could stay locked out. So the fix has to record the payment id even while the enrollment waits. It also needs one agreed rule for when `Authorized` counts as paid, used in all three places.

**Ali's decision makes this the core of the fix.** `Authorized` doesn't count as paid (answer 2 below), and the 30-minute job isn't running. So the platform change itself has to build the promotion path. It records the payment while the enrollment waits, then re-checks the payment until it settles or fails. Without that, someone whose card is only authorised is locked out for good, not for a day.

## Step 0 results (from Ali, 2026-11-12)

Read-only checks Ali ran in production.

- **Is the 30-minute job on? No.** `PAYSIMPLE_SYNC_ENABLED` isn't set in the backend container, so `PaySimplePaymentSync` never schedules. As a control, its sibling job `AppPaymentReconcile` logs that it's scheduled, and this one logs nothing. Ali is leaving it off until all three rules agree, because it counts `Authorized` as paid.
- **What status do real payment notices carry?** Both `Authorized` and `Posted` have arrived since the last restart. The sample is small, so it shows the `Authorized` case is live, not how common it is.
- **How many paid enrollments have a payment that isn't Settled or Posted?** This can't be answered from the database. No table stores the payment provider's status: the notice handler reads it, logs it, and drops it before marking the enrollment paid. Only a few dozen paid enrollments have a payment id recorded, so checking each one with the payment provider is a small job. Ali suggests doing that before the fix, to learn whether this has actually happened.

**What this means for Vick.** Because no record stores the payment's own status, Vick can't tell whether a paid enrollment's money settled. It says "paid" means *marked paid*, and that whether the payment settled is unknown from the record. (The checkout explainer said "Payment settled" until 2026-11-12. That's now corrected and pinned by a test.)

## Ali's follow-up on the pre-flight check (2026-11-12)

Ali told Kes and Quincy not to use the 30-minute job's dry run to list who would lose access. Checked in the code at `109820a`:

- **It returns counts, not names.** The summary is `knownPayments`, `fetched`, `fetchErrors`, `markedPaid`, `markedFailed` and `unchanged` (`paymentSyncService.ts:45-53`). The one closing log line prints the same counts (`:270-273`).
- **It still counts `Authorized` as paid** (`paymentSyncService.ts:31-33`). So anyone paid on an `Authorized` payment shows as unchanged, and that's the group the new rule creates. The dry run would come back calmer than the truth.

**What to use instead:**
- **The source of the list:** the read-only lookups of each paid enrollment's payment. They give both groups by name, and they need no code change. Vick's pre-flight list (above) does the sorting.
- **The dry run:** worth running afterwards, only as a cross-check on the reversal count.
- **Who runs the lookups:** Quincy, together with Ali. They need the live payment credentials, which exist only in the production container, so nobody runs them alone.
- **Seat figures:** check them with a left join from classes to enrollments that counts `payment_status = 'paid'` and compares it with `seats_taken`.

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | What should happen when a payment is returned? | Roselyn, with Ali | Mark it for a person to review · remove access and free the seat · leave as is (today) |
| 2 | What single rule says a payment counts as paid, used by the notice handler, the 30-minute job and reconciliation alike? Is the 30-minute job on in production? | Ali or Kes | Settled or Posted only (an Authorized card waits, with its payment id recorded so it can be promoted) · Authorized counts too (as the 30-minute job does today) · leave the three rules as they are |
| 3 | Should failed first membership payments be recorded? | Ali or Kes | Record them on the membership · leave as is |
| 4 | Should the platform record which payment notices it has handled? | Ali or Kes | A store of handled notices, so a repeat changes nothing |

## Your answers

*Fill in with the date.*

**Date:** 2026-11-12 (answers 1 and 2 from Ali, by email to the platform owners)

**1. Returned payments:** Remove access when a payment is reversed on someone already paid, and free the seat with it. Ali: if Roselyn wants a review step before removal, she should say so and he'll change it. **Roselyn to confirm.**

**2. Payment status:** `Settled` and `Posted` only. `Authorized` doesn't open access or take a seat. All three paths should follow the same rule; the 30-minute job stays off until they do.

**3. Failed membership payments:** Open. Part of the platform change, which Ali hasn't approved yet.

**4. Handled notices:** Open. Same as 3.
