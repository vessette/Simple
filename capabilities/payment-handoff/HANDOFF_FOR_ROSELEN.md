# Is the person who agreed to pay the person being charged?

**For:** Roselen, who signs off on this capability, plus Ali and finance. **Capability:** `sales.payment_handoff_integrity`, first release (autonomy:R2).

## The problem it watches for

When someone pays, they go through PaySimple's own payment page. That page creates its **own** customer record in PaySimple, separate from the one our app created when the checkout started (`subscriptionScheduleService.ts:88-95`). So for most members we hold two customer ids:
- the one **stored at checkout**, which usually has no card on it;
- the one the **charge actually landed on**, which has their card.

If anything bills against the wrong one, two things can go wrong. A schedule can fail because it points at a customer with no card. Or, worse, a **stranger** can be charged, if a stored id belongs to someone else. That last case really happened in August: one old customer id had been written onto four different people's records.

## What it does

For any subscription, Vick says:
1. **Which customer id was stored** at checkout, and where it's recorded.
2. **Which customer id the charge landed on,** read from the first payment.
3. **Whether the billing account resolves.** The first payment carries the real account id (`:96-104`).
4. **Whether each id belongs to the payer.** It checks the PaySimple customer record's email against the person's email, the same check the platform uses (`subscriptionService.ts:290-297`).

It also flags:
- an id that belongs to **someone else**;
- an id **shared by more than one enrolment**, which must be excluded, not reconciled (`appPaymentReconcileService.ts:49-53`);
- a schedule whose account **doesn't resolve**.

Every statement names where it came from: a stored record, or a PaySimple read (read-only). Vick changes nothing. Fixing a mismatch decides who gets billed, so it stays a person's decision.

## "Unverified" is never "matching"

If PaySimple couldn't be read, or a customer record has no email on it, the id is reported as **unverified**. A failed lookup isn't proof that an id belongs to the payer. That's the platform's own rule (`subscriptionService.ts:294`), and Vick follows it.

## Excluded members

Members on the standing exclusion lists (waiting on bank-draft consent, or card blocked) are reported as **excluded**, not broken. If their schedule's account doesn't resolve, Vick says the exclusion may explain it.

## What it can't tell you yet

**Whether every past subscription has been checked across this boundary.** There's no record of a full backfill audit. Vick can check any subscription it's given, and running it over all of them would answer this. But that needs the subscription list and read-only PaySimple lookups for each, which only someone with access can run. The platform already reports shared customer ids on every reconciliation run (`appPaymentReconcileService.ts:49-53`), which covers part of it.

## What I need from you

- **Ali:** is a one-off, read-only check of every active subscription across this boundary worth doing? If yes, who has the access to run it?
- **Roselen:** when Vick finds an id that belongs to someone else, who should it go to?

Code: [handoffExplainer.js](handoffExplainer.js). Tests: [handoffExplainer.test.js](handoffExplainer.test.js), 7 tests. Example cases (made up, with invented ids): [fixtures/cases.json](fixtures/cases.json).
