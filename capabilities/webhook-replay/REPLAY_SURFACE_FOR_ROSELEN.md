# Can a repeated payment notice cause harm? The four guards, and what they miss

**For:** Roselen, who signs off on this capability, plus Ali, Kes (platform owner) and finance. **Capability:** `sales.payment_webhook_replay_dedup_watch`, first release (autonomy:R0): the replay surface written down. **This watch reports only.** It doesn't add or change a guard; that's a platform change for Ali to approve.

## The short version

When someone pays, PaySimple sends the platform a notice. Notices can arrive **twice**: a retry, a resend, or two copies at once. **There is no delivery-level dedup store:** no record of which notices have already been handled. The notice's id is written to the log and nowhere else (`webhookController.ts:56-58`). Instead, each payment path protects itself in its own way. Four guards do most of the work, and they leave **five gaps**.

## The four guards

| Guard | Payment path | How it spots a repeat | Where | What it protects | What it misses |
|---|---|---|---|---|---|
| **G1** | One-time enrolment payment | The enrolment is already "paid", so it returns it unchanged | `enrollmentService.ts:117` | The seat isn't counted twice | U2, U3 |
| **G2** | Subscription checkout | The subscription is already "active", so it returns it unchanged | `subscriptionService.ts:434` | It isn't activated twice | U3 |
| **G3** | Recurring (automatic) charge | The payment id equals the **last** one applied. Deliberately not the status, or every renewal would be ignored. | `subscriptionScheduleService.ts:204, :224` | A repeat of the latest charge doesn't extend the period twice | U1, U3 |
| **G4** | Reconciliation sweep (links missed payments) | Re-reads the enrolment; already "paid" means it does nothing | `paymentReconciliationService.ts:209-210` | A sweep after a notice doesn't count the seat again | U3 |

Two more paths, also checked:
- **A failed or returned automatic charge** marks the member past due only if they're currently active (`subscriptionScheduleService.ts:263-266`). That misses U4.
- **A returned one-time payment** isn't acted on at all: only "failed" is (`webhookController.ts:175`). That's not a replay gap, but it's the same open question already raised in the payment-confirmation write-up.

## The gaps: replay shapes that remain uncovered

| | Shape | What could happen | Why the guards miss it |
|---|---|---|---|
| **U1** | A replay of an older scheduled payment (not the latest one) | Its payment id differs from the last one stored, so **the billing period is extended again**: a free month | G3 compares with the latest payment id only |
| **U2** | A repeat of a one-time enrolment payment notice | The seat is safe, but **the welcome email is sent again** (when automatic email is on) and the class-readiness sign-up runs again | G1 hands back the paid enrolment, and the handler runs the follow-on steps whenever it gets one back (`webhookController.ts:147`, `:162`) |
| **U3** | Two copies of the same notice arriving at the same moment | Both can pass the check before either saves, so **a seat counted twice**, and emails twice | Every guard is check-then-save, with nothing locking the record and no unique key |
| **U4** | A stale failure notice replayed after the member has recovered | A member who has since paid is **marked past due again** | The past-due update only checks the member is active, not which payment failed |
| **U5** | Any replay at all | **Can't be detected afterwards** | Nothing records which notices were handled |

**Has any of this actually happened?** Unknown, for the reason in U5: there's no record to check. The billing check's "duplicate active rows" finding and the seat counts are the nearest evidence, and neither proves or rules out a replay.

## What would close the gaps (for Ali and Kes to decide; not done here)

- **One fix covers U1, U3 and U5:** a table of handled notices, with a unique key on the notice id, checked before anything else happens. It's a schema change, so it needs Ali's approval.
- **U2:** run the welcome steps only when the payment was *newly* applied, not when the enrolment was already paid.
- **U4:** check that the failed payment is the current one before marking someone past due.

## How to start knowing, in two steps

**Step 1, now, with no code change: look at what's already logged.** Every accepted notice already writes one log line with its notice id (`webhookController.ts:56-58`). A read-only search of the server's logs for the same notice id appearing more than once answers "has a replay happened?" for as far back as the logs go. It also answers "how far back is that?", and both are useful. Someone with server access runs it: Kes, with Ali's OK. PaySimple's own account may also show which notices it re-sent, which is worth a look by whoever holds the PaySimple login.

**Step 2, a platform change: record every notice as it arrives.** A small table of handled notices:
- the notice id, which must be unique;
- when it arrived, its type and the payment id;
- what the platform did with it.

The handler would record the notice **first** and skip it if the id is already there. That closes U1, U3 and U5 in one move, and from then on every replay is visible and stopped. It's a database change, so it needs Ali's approval and Kes to build it. This watch only describes it.

**Why step 1 first:** it's free, it can be done this week, and it shows whether step 2 is urgent (replays seen) or a safeguard (none seen).

## What I need

- **Ali and Kes:** do U1 to U5 match your understanding? Can someone run the step 1 log search, and is the step 2 notice table worth approving?
- **Roselen:** nothing to decide here yet. U2 and U4 are the ones members would notice (a second welcome email, or being wrongly marked past due), so they're worth knowing about.

The same table, in a form a test can check, is in [replaySurface.json](replaySurface.json). Tests: [replaySurface.test.js](replaySurface.test.js), 4 tests, checking that all four guards are named with their code and that every uncovered shape is stated.
