# Seat codes and redemption: a revised specification (draft for review)

**For:** Kes (platform owner), to check and size. Ali decides the open business rules (marked **Decision: Ali**). Roselen answers one question about how sponsors buy.
**Status:** Draft, 16 November 2026. Nothing here is built.
**Why now:** no sponsor in production has seat codes yet, so the gaps below have exposed nothing so far, and the cheapest time to close them is before the first code goes out.

> **Public version.** This repository is public, so the analysis of how the redemption route behaves today (each way it can end, what that tells an outsider, and the code references) is not published here. It's been shared with Kes and Ali privately, and will come back once the fixes land.

## 1. The short version

The redemption route's core guards work: each code is unique, the seat is locked while it's redeemed, and two redemptions of one code at once produce one enrolment. It has gaps in four areas, all to close before the first code is issued:
- **Attempt limits** on the public form.
- **What a failed or repeated attempt tells the caller.**
- **Whether a used code stays used**, whatever later happens to its enrolment.
- **Whether the sponsor has paid**, and whether redemptions stay within the seats bought.

## 2. What it should do

### 2a. Responses

| Situation | Status | Caller sees | Logged (server only) |
|---|---|---|---|
| Malformed input | 400 | Field errors (no code information in them) | reason `invalid_input` |
| Unknown, expired, reassigned, **sponsor not in an allowed billing state**, **seat limit reached**, or redeemed by a **different email** | **One identical response:** 404, "We couldn't activate that code. Please check it, or contact the person who sent it to you." | Same body, same headers, for all of these | The real reason, the code's **last 4 characters**, the caller's address |
| Already redeemed **with the same email** | 200 | "This code is already active for you." **No ids.** If they need access, a sign-in link goes to that email address. | reason `already_redeemed_same_person` |
| Redeemed but its enrolment is missing | Same identical response as above | | reason `orphaned_seat`, **plus an alert**; the seat is **not** re-issued automatically |
| Sponsor not found, or no cohort open (our own setup errors) | 503 | "We can't activate codes right now. Please try again later." | The real reason, **plus an alert** |
| Success | 201 | "You're in…" Ids only if the next page genuinely needs them | reason `redeemed` |

### 2b. Limits

| Limit | Value (proposed) | What the user sees |
|---|---|---|
| Per network address | Reuse the existing sponsor-route limiter: 5 per 15 minutes | 429, "Too many attempts. Please try again in a few minutes." |
| Per code | After 5 failed attempts on one code, pause it and notify the sponsor's contact (**Decision: Kes**, threshold) | The same identical failure response |
| Overall | Alert when failures across all codes spike (for example 10× the daily norm) | Nothing |

### 2c. What each person sees under a payment rule

The rule is **Decision: Ali**. Whatever he picks, each person should see:

| Sponsor billing state | Redemption (suggested) | Employee sees | Sponsor dashboard shows | Sales owner |
|---|---|---|---|---|
| paid | Allowed | Success | Seats used / available | Nothing |
| invoiced (within payment terms) | Allowed, flagged as unpaid | Success | Seats used, plus "invoice outstanding" | Told when the terms lapse |
| pending (no invoice yet) | Refused | The neutral "couldn't activate that code" message. **Never** "your employer hasn't paid": an employee shouldn't learn their employer's finances. | "Codes become active once the invoice is paid" | Notified of each refused attempt |
| cancelled | Refused; unused codes expired | The same neutral message | "Sponsorship cancelled" | Notified |

Open for Ali alongside it:
- How long are the payment terms?
- What happens to people who already redeemed if an invoice goes past due: keep access, pause it, or a person decides?
- When a sponsor cancels, what happens to people already enrolled?

The employee did nothing wrong in any of these cases. So a refusal always comes with a path forward (the person who sent the code is told), and the employee never sees an error that blames them.

### 2d. Checks inside the existing locked transaction

Inside the transaction that already locks the seat row, in this order:
1. The seat exists and is `available`, or it's `redeemed` with the **same email** (idempotent path).
2. The sponsor's `billing_status` is in the allowed set (**Decision: Ali**). My suggestion: `paid` and `invoiced` allowed; `pending` and `cancelled` refused.
3. The sponsor's redeemed seats are fewer than `seats_purchased`.
4. Only then, create the enrolment and mark the seat redeemed.

## 3. Issuing codes

**One way in:** an admin-only "issue N codes" action. Codes are never added by hand again. It:
- locks the sponsor row while it works, so two admins issuing at once can't pass the limit together;
- counts **active** codes (available + redeemed; reassigned and expired don't use up a seat) and refuses if the new ones would exceed `seats_purchased`;
- checks `billing_status` against the same allowed set;
- sets `expires_at` (for example, cohort start plus a few weeks; **Decision: Ali**);
- records **who issued them, when, and in which batch**: three new columns on `sponsor_seats` (`issued_by`, `issued_at`, `batch_id`), plus an entry in the existing sponsor audit log.

**Reassigning** marks the old code `reassigned` and issues one replacement in the same transaction, so the active count doesn't change.

**Cancelling** a sponsor marks its unused codes `expired`. What happens to people already enrolled: **Decision: Ali**.

**Alternative for Kes to weigh:** create exactly `seats_purchased` codes when a purchase is recorded, and never at any other time. It's simpler and can't drift, but a sponsor can't hold codes back until employees are named. **Roselen:** do sponsors usually name everyone up front, or add people over time? That decides between the two.

### Generating the codes

- **Random source:** Node's `crypto.randomInt` or `crypto.randomBytes`, never `Math.random()`, matching how the platform already makes sponsor sign-in links.
- **Alphabet:** Crockford base32. 32 characters, with the look-alikes 0/O and 1/I/L left out, so codes can be typed from an email.
- **Length:** 12 characters (60 bits), shown as `XXXX-XXXX-XXXX`. Optionally add a check character so typos are caught before they count as a failed attempt.
- **Uniqueness:** already enforced by a unique index. On a collision, generate again, at most 3 times, then fail loudly.
- **Never log a full code:** last 4 characters only.
- **Storing codes hashed:** safer, but sponsors need to see their codes to hand them out. **Decision: Kes and Ali.**

### A redeemed code stays used, whatever happens to the enrolment

1. **The seat row is the record.** On redemption, set `status = 'redeemed'`, `redeemed_at`, and a new `redeemed_email` column, in the same transaction as the enrolment. After that, the code's state never depends on the enrolment still existing.
2. **States only move forward:** `available` → `redeemed`; `available` → `expired`; `redeemed` → `reassigned` (by an admin only, which issues a *new* code). Nothing ever goes back to `available`, and `redeemed_at` is never cleared. Enforce this in the database, not just in code, with a check constraint and a trigger.
3. **No fall-through.** A redeemed seat whose enrolment is missing gets the identical failure response and an alert. A person decides what to do: restore the enrolment, or issue a new code to the right person.
4. **Protect the link.** An enrolment tied to a seat can't be deleted; withdrawing someone changes their enrolment's status instead. Any cleanup job that deletes enrolments releases or skips seat-linked ones deliberately.
5. **Sponsors are cancelled, not deleted**, so their redemption history is kept.
6. **Every change is logged** in the existing sponsor audit log: who, when, from which state, to which state.

## 4. Monitoring

Add to the daily billing check as findings:
- seat-funded enrolments whose sponsor isn't in an allowed billing state;
- any sponsor whose active codes ≠ `seats_purchased`;
- orphaned seats (redeemed, with no enrolment);
- codes paused for too many failed attempts.

**One-off, before go-live:** a read-only check for any enrolments already created from an unpaid or cancelled sponsor's seats. List them for Ali; change nothing automatically.

## 5. Acceptance tests (written before the change)

1. An unknown code, an expired code and a reassigned code return **byte-identical** responses (status, body, headers).
2. A redeemed code submitted with a **different** email returns that same response and **no** ids.
3. A redeemed code with the **same** email returns 200 and no ids, and creates nothing.
4. **(Write first.)** A redeemed code is never redeemed again by a different person, whatever later happens to its enrolment; a missing enrolment returns the identical failure and raises an alert.
5. A sponsor in each refused billing state cannot redeem; one in each allowed state can.
6. Redemption is refused once redeemed seats equal `seats_purchased`.
7. The 6th attempt from one address within 15 minutes returns 429.
8. The 6th failed attempt on one code pauses it.
9. Issuing codes past `seats_purchased` is refused; two simultaneous issues cannot exceed it together.
10. Generated codes are 12 base32 characters, unique, and never appear in full in logs.
11. A redeemed seat can never go back to `available`, and its `redeemed_at` can't be cleared. The database rejects both, even from a direct update.
12. Deleting an enrolment tied to a seat is refused.
13. **Unchanged:** two simultaneous redemptions of one code still produce one enrolment.

## 6. What doesn't change

The seat-row lock, one enrolment per code, and the input validation all stay as they are.

## 7. Open decisions

| Decision | Owner |
|---|---|
| Which sponsor billing states allow issuing and redemption | Ali |
| Payment terms: can "invoiced" sponsors redeem, and what happens when an invoice goes past due | Ali |
| What happens to enrolled people when a sponsor cancels | Ali |
| How long codes stay valid | Ali |
| Whether to require the employee's email to match the company domain | Ali |
| Issue on demand, or create all codes at purchase | Kes, after Roselen's answer |
| Per-code pause threshold | Kes |
| Store codes hashed or readable | Kes and Ali |
| The questions on today's behaviour, in the private copy | Kes |
