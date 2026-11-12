# Payments that missed their webhook: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), Ali (approver); Kes for the platform findings.
**Capability:** `sales.app_originated_payment_reconciliation`
**Status:** draft. **Reconciling marks a person paid and switches on their membership, so it's a person's decision, always.** Vick explains why one payment is or isn't in scope. It never links a payment, never runs the reconciler, and never says a payment "should" be linked.

## The job, in one paragraph

When a student pays through our checkout, PaySimple normally sends a webhook and the platform marks them paid. When that message never arrives, a job that runs every 20 minutes looks for the payment and links it. It has two ways to match:
- **Path A:** the payment landed on a PaySimple customer we stored at checkout.
- **Path B:** PaySimple's hosted payment page created a new customer, so the job matches on amount, time and the payer's email instead.

Both paths use the same **origin guard**: we only claim a payment if our app opened a checkout for that amount shortly before it. That's what keeps bootcamp tuition and manual charges on the shared PaySimple account out of our revenue (`appPaymentReconcileService.ts:30-37`).

## What Vick does in this first release (R2)

A person gives Vick:
- one PaySimple payment;
- the reconciler's candidates (enrolments with a checkout still open);
- which enrolments claim which customer ids;
- the payment ids already linked;
- for path B, the payer's email on that PaySimple customer.

Vick can't reach PaySimple or the production database, so a person reads all of these. Vick answers with three things:
- **The verdict:** in scope, out of scope, or unknown.
- **The guard that decided it:** the payment status, the $100 floor, already linked, the reconcile start date, the origin guard, or the payer's identity.
- **Three cited checks, every time:** the amount match, the time window and the customer-id scope. Each is pass, fail or unknown, with the reason and the line of platform code that applies.

Where something is missing, the verdict is unknown and Vick says what a person has to look up. It doesn't guess. "In scope" means the guards admit the payment, not that it will be linked: if two payments qualify for one checkout, the job takes the earlier (`:362`).

Two notes are added when they apply:
- **The paid rule:** the job counts Authorized and some other statuses as collected. Under the rule agreed on 12 November, only Settled or Posted counts as paid, and Vick says so.
- **The webhook:** any path B link means the webhook missed a payment, which the story says is worth an alert.

**A guard refuses any hedged wording** ("should probably be linked", "likely belongs to", "I'd link it"). That includes text arriving in the records, such as a name.

Code: [`scopeExplainer.js`](scopeExplainer.js), with 12 tests in [`scopeExplainer.test.js`](scopeExplainer.test.js). Fixtures are fictional.

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code does, not a record of what has happened.

1. **The job counts Authorized as collected.** It uses the platform's shared list, which also includes `captured`, `paid`, `success` and `completed` (`paymentSyncService.ts:31-33`; used at `appPaymentReconcileService.ts:96`, `:330`). This is the third of the five places Quincy's spec lists for the "Settled or Posted only" rule. Vick flags each such payment.

2. **"A shared customer id is excluded entirely" is true for path A only.** Path A drops shared ids before matching (`:311`). Path B searches every collected payment, whatever customer it landed on (`:329-340`). So a payment on a shared id can still be linked by path B. It also needs the right amount, time and payer email, so the risk is small, but the exclusion isn't total. Vick flags it.

3. **Some candidates can never be matched.** The candidate list includes unpaid enrolments that only have a stored customer id, with no checkout still open (the older one-time payment flow) (`:240-244`). Both paths need an open checkout to pass the origin guard (`:132-139`, `:235`), and those enrolments have none. So they're counted as candidates, and as "no payment found", on every run. Both counts are higher than the number of people the job could actually help.

4. **The dry run shows which payments would be linked, but not everything the run would do.** It reports each link (email, amount, payment id, path), but it counts activations and cancelled duplicate checkouts only when it writes (`:401`). That's enough to check Vick's verdicts against: the story's shadow mode compares which payments would link. It isn't a full rehearsal.

5. **The time window needs a time of day.** The window is 10 minutes before to 6 hours after the checkout opened (`:65-72`). The platform's own tests use PaySimple dates both with and without a time. A date with no time would read as midnight UTC, and nearly every payment would fall outside the window. I couldn't tell from the code which format PaySimple sends in production. Vick reports the window as unknown for a date with no time.

6. **A failed final write probably isn't retried. This comes from reading the code, not from testing.** The code says that if anything throws, the candidate is "picked up and retried" (`:443-445`). But if activation succeeds and only the last step fails, the checkout is no longer open and the enrolment is already marked paid. The candidate query then skips it (`:240-244`). The person would be paid and active, with the payment id on their subscription but not on their enrolment. The payment pre-flight list would then show them under "no payment id recorded".

7. **Which person gets a contested payment depends on row order.** The candidate query has no sort order (`:238-245`). If two enrolments with the same email both have a matching checkout, which one path B links isn't fixed.

8. **The brief's citations hold up well this time.** Its line numbers match `109820a`. The one that's only roughly right is `paymentReconciliationService.ts:193-212`, which spans the sweep's email matching and its write step. The brief's note that Roselyn has no admin login is out of date: she holds the `revenue` role and has had the `agents` section since 10 November.

9. **What works as the spec says:**
   - The origin guard runs on both paths. Path A was fixed to use it on 2026-08-19 (`:39-47`, `:364-366`).
   - Shared ids fail closed for path A and are reported on every run (`:298-309`).
   - A payment id already linked to an enrolment or a subscription is never reused, within a run or across runs (`:313-320`, `:393`).
   - Activation goes through the same step the webhook uses (`:414-428`).
   - The enrolment's payment id is written last (`:441-470`).
   - A dry run writes nothing (`:401`).
   - A $50 deposit is never linked (`:98`, `:331`).
   - PaySimple calls time out after 30 seconds (`paysimpleService.ts:35`).

## Before this can be validated

- **Vick can't read PaySimple or the production database.** Every verdict depends on rows a person reads and passes in. For path B, that includes the payer's email from PaySimple.
- **The reconcile start date** defaults to 1 June 2026 (`env.ts:47`). I haven't checked whether production overrides it.
- **Comparing against the reconciler's dry run** (the story's route to shadow mode) needs someone with admin access to run it (`POST /api/admin/revenue/reconcile?dryRun=true`) and share the result. Its output names people, so it stays out of the repo.

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | Should this job link only Settled or Posted payments, as agreed? | Ali | Already in Quincy's spec as one of the five places; confirm it's in scope of that change |
| 2 | Should path B skip payments on a shared customer id, as path A does? | Ali or Kes | Skip them · leave as is, with Vick flagging them |
| 3 | Should enrolments with no open checkout stop being counted as candidates? | Kes | Drop them from the count · report them separately · leave as is |
| 4 | Should the dry run also report the activations and cancellations it would make? | Kes | Yes · no (links only is enough for comparing) |
| 5 | Which date format does PaySimple send in production? | Quincy, with Ali | One payment read settles it |
| 6 | If the last write fails, should the job retry the link, as its comment says it does? | Kes | Fix the retry · fix the comment · check production first |

## Your answers

*Fill in with the date.*

**Date:**

**1. Paid rule in this job:**

**2. Shared customer ids in path B:**

**3. Candidates with no open checkout:**

**4. Dry run detail:**

**5. Date format:**

**6. Last-write retry:**
