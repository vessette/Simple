# Can a repeated payment notice cause harm? The four guards, and what they miss

**For:** Roselen, who signs off on this capability, plus Ali, Kes (platform owner) and finance. **Capability:** `sales.payment_webhook_replay_dedup_watch`, first release (autonomy:R0): the replay surface written down. **This watch reports only.** It doesn't add or change a guard; that's a platform change for Ali to approve.

> **Public version.** This repository is public, so the exact replay shapes, why each guard misses them, and the code references are not published here. They've been shared with Kes and Ali privately, and will come back once the fixes land.

## The short version

When someone pays, PaySimple sends the platform a notice. Notices can arrive **twice**: a retry, a resend, or two copies at once. There is no delivery-level dedup store: no record of which notices have already been handled. Instead, each payment path protects itself in its own way. Four guards do most of the work, and they leave **five gaps**.

## The four guards

| Guard | Payment path | What it protects |
|---|---|---|
| **G1** | One-time enrolment payment | The seat isn't counted twice |
| **G2** | Subscription checkout | The subscription isn't activated twice |
| **G3** | Recurring (automatic) charge | The billing period isn't extended twice by the same charge |
| **G4** | Reconciliation sweep (links missed payments) | A sweep after a notice doesn't count the seat again |

## The five gaps, by what a member or the business would notice

| | What could happen |
|---|---|
| **U1** | A billing period is extended without a matching payment |
| **U2** | A member gets a second welcome email |
| **U3** | A seat or an email is counted twice |
| **U4** | A member who has paid is shown as past due |
| **U5** | A repeat can't be spotted afterwards |

**Has any of this actually happened?** Unknown, for the reason in U5.

## What would close the gaps (for Ali and Kes to decide; not done here)

**Step 1, now, with no code change:** a read-only search of the server logs for repeated notices. Someone with server access runs it: Kes, with Ali's OK. It shows whether step 2 is urgent (repeats seen) or a safeguard (none seen).

**Step 2, a platform change:** a record of every payment notice, written before the platform acts on it, with the notice id unique so the database itself refuses a second copy. That closes U1, U3 and U5 in one move, and two small changes to the follow-on steps cover U2 and U4. It's a database change, so it needs Ali's approval and Kes to build it.

**Tests that prove it (written before the change):**
- the same notice twice gives one effect and one "skipped as a repeat" record;
- two copies at the same moment still give one effect;
- an older scheduled payment, replayed, doesn't extend the period;
- a failed processing attempt can be retried without being blocked as a repeat.

**Risk if not done:** members can be given time they did not pay for, sent duplicate welcomes or wrongly marked as owing, and nobody can tell afterwards whether it happened.

## What I need

- **Ali and Kes:** do U1 to U5 match your understanding? Can someone run the step 1 log search, and is the step 2 notice record worth approving?
- **Roselen:** nothing to decide here yet. U2 and U4 are the ones members would notice, so they're worth knowing about.

The same table, in a form a test can check, is in [replaySurface.json](replaySurface.json). Tests: [replaySurface.test.js](replaySurface.test.js), 5 tests, checking that all four guards and every gap are named, and that no code references are published.
