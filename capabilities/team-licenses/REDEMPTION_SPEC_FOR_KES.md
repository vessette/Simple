# Seat codes and redemption: a revised specification (draft for review)

**For:** Kes (platform owner), to check and size. Ali decides the open business rules (marked **Decision: Ali**). Roselen answers one question about how sponsors buy.
**Status:** Draft, 16 November 2026. Nothing here is built. Read from platform `main` at `62c4bde`.
**Why now:** no sponsor in production has seat codes yet (the one sponsor has 25 seats bought and none issued, `dayNinetyReportService.ts:76-80`). So these gaps have exposed nothing so far, and the cheapest time to close them is before the first code goes out.

---

## 1. What the route does today

`POST /api/sponsor/redeem` is public and needs no login (`enrollmentRoutes.ts:20`). It has **no rate limit**; the sponsor routes next to it allow 5 requests per 15 minutes (`leadRoutes.ts:21-27`, `:76`). Every way it can end, from `sponsorController.ts:155-298`:

| # | Situation | Status | What the caller gets | What it reveals to an outsider |
|---|---|---|---|---|
| A | Missing or malformed field (code, name, email) | 400 | Field-level validation errors (`:162-166`, schema `:128-134`) | Nothing about codes |
| B | Code not found | 404 | "Invalid redemption code." (`:182-184`) | Nothing (a miss) |
| C | Code expired or reassigned | 409 | "This redemption code is no longer active." (`:186-188`) | **That the code is real** |
| D | Code already redeemed, enrolment exists | 200 | "This code was already redeemed. Welcome back." plus **`enrollmentId` and `cohortId`** (`:190-201`, `:283-289`). The email is **not** compared. | **The code is real, and another person's internal ids** |
| E | Code redeemed but its enrolment has been deleted | 201 | Deleting an enrolment **clears the seat's link** (`onDelete: 'SET NULL'`, `models/index.ts:1266`). The seat stays `redeemed`, so the idempotent check (`:192`) no longer matches and redemption creates a **new** paid enrolment for whoever submitted (`:204`) | **A redeemed code can be redeemed again, by anyone** |
| F | Seat's sponsor not found | 409 | "Sponsor account not found for this seat." (`:208-210`) | That the code is real, and our data is broken |
| G | No sponsor cohort open | 409 | "No sponsor cohort is currently open for redemption." (`:212-215`) | That the code is real, and how we're set up |
| H | Valid, unused code | 201 | "You're in…" plus `enrollmentId` and `cohortId` (`:283-289`) | Success |
| I | Any other error (database or unique-constraint failure) | Set by the central error handler (`server.ts:372`) | Not checked: depends on `errorHandler` | **To confirm** (Kes) |

What's **not checked** at all: whether the sponsor has paid (`billing_status`, `Sponsor.ts:27`), and whether redeemed seats are still within `seats_purchased`. And **nothing in the app creates seat codes**: they're added by hand.

**Kes: is this table complete?** Middleware or a path I've missed would leave a hole in everything below.

## 2. Who could misuse it, and how

| | Who | What they try | Which rows help them today |
|---|---|---|---|
| T1 | A guesser | Submits many made-up codes to find a real one | C, D, F, G tell them when they've hit a real code; no rate limit |
| T2 | Someone holding a leaked or old code | Uses a code meant for someone else | D hands them another person's ids; E lets them re-redeem |
| T3 | Someone targeting one sponsor | Hammers one code or one sponsor's codes | No per-code limit or alert |
| T4 | A timer | Compares response times to tell real codes from fake | Low risk: B and C both do the same single lookup first. Keep it that way. |

## 3. What it should do

### 3a. Responses

| Situation | Status | Caller sees | Logged (server only) |
|---|---|---|---|
| Malformed input | 400 | Field errors, as today (no code information in them) | reason `invalid_input` |
| Unknown, expired, reassigned, **sponsor not in an allowed billing state**, **seat limit reached**, or redeemed by a **different email** | **One identical response:** 404, "We couldn't activate that code. Please check it, or contact the person who sent it to you." | Same body, same headers, for all of these | The real reason, the code's **last 4 characters**, the caller's address |
| Already redeemed **with the same email** | 200 | "This code is already active for you." **No ids.** If they need access, a sign-in link goes to that email address. | reason `already_redeemed_same_person` |
| Redeemed but its enrolment is missing | Same identical response as above | | reason `orphaned_seat`, **plus an alert**: our data is broken, and the seat is **not** re-issued automatically |
| Sponsor not found, or no cohort open (our own setup errors) | 503 | "We can't activate codes right now. Please try again later." | The real reason, **plus an alert** |
| Success | 201 | "You're in…" Ids only if the next page genuinely needs them | reason `redeemed` |

### 3b. Limits

| Limit | Value (proposed) | What the user sees |
|---|---|---|
| Per network address | Reuse the existing limiter: 5 per 15 minutes (`leadRoutes.ts:21-27`) | 429, "Too many attempts. Please try again in a few minutes." |
| Per code | After 5 failed attempts on one code, pause it and notify the sponsor's contact (**Decision: Kes**, threshold) | The same identical failure response |
| Overall | Alert when failures across all codes spike (for example 10× the daily norm) | Nothing |

### 3c. Checks inside the existing locked transaction

The seat row is already locked for the transaction (`:173-180`). Inside that same transaction, in this order:
1. The seat exists and is `available`, or it's `redeemed` with the **same email** (idempotent path).
2. The sponsor's `billing_status` is in the allowed set (**Decision: Ali**). My suggestion: `paid` and `invoiced` allowed; `pending` and `cancelled` refused.
3. The sponsor's redeemed seats are fewer than `seats_purchased`.
4. Only then, create the enrolment and mark the seat redeemed, as today.

## 4. Issuing codes

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

- **Random source:** Node's `crypto.randomInt` or `crypto.randomBytes`, never `Math.random()`. This matches the platform's existing `crypto.randomUUID()` for sponsor sign-in links (`sponsorAuthService.ts:49`).
- **Alphabet:** Crockford base32. 32 characters, with the look-alikes 0/O and 1/I/L left out, so codes can be typed from an email.
- **Length:** 12 characters (60 bits), shown as `XXXX-XXXX-XXXX`. Optionally add a check character so typos are caught before they count as a failed attempt.
- **Uniqueness:** already enforced by the unique index (`SponsorSeat.ts:81`). On a collision, generate again, at most 3 times, then fail loudly.
- **Never log a full code:** last 4 characters only.
- **Storing codes hashed:** safer, but sponsors need to see their codes to hand them out. **Decision: Kes and Ali.**

### A redeemed code stays used, whatever happens to the enrolment

Today the code's state is partly worked out from the enrolment. If the enrolment is gone, a redeemed seat falls through and is redeemed again by whoever submits it (`sponsorController.ts:204`). The fix is for the seat row to record its own state, permanently:

1. **The seat row is the record.** On redemption, set `status = 'redeemed'`, `redeemed_at`, and a new `redeemed_email` column, in the same transaction as the enrolment. After that, the code's state never depends on the enrolment still existing.
2. **States only move forward:** `available` → `redeemed`; `available` → `expired`; `redeemed` → `reassigned` (by an admin only, which issues a *new* code). Nothing ever goes back to `available`, and `redeemed_at` is never cleared. Enforce this in the database, not just in code:
   - a check constraint: if `status` is redeemed or reassigned, then `redeemed_at` is not null;
   - a trigger that rejects any change from redeemed, reassigned or expired back to available, or any change to `redeemed_at` once it's set.
3. **No fall-through.** A redeemed seat whose enrolment is missing gets the identical failure response and an alert. A person decides what to do: restore the enrolment, or issue a new code to the right person.
4. **Protect the link.** Today the association says `onDelete: 'SET NULL'` (`models/index.ts:1266`): deleting an enrolment silently unlinks its seat, which is exactly what makes row E possible. Change it to `RESTRICT`, so an enrolment tied to a seat can't be deleted. Withdrawing someone changes their enrolment's status instead. Enrolments do get hard-deleted: the admin test-data cleanup does it (`productionCleanupRoute.ts:361`), so it would need to release or skip seat-linked enrolments deliberately. **Kes:** does the live database constraint match the association (`SET NULL`)? See the query in section 8.
5. **Deleting a sponsor deletes its seats.** `Sponsor.hasMany(SponsorSeat, { onDelete: 'CASCADE' })` (`models/index.ts:1262`) wipes the redemption history with the sponsor. Sponsors should be cancelled, not deleted, or the cascade changed to `RESTRICT`.
6. **Every change is logged** in the existing sponsor audit log: who, when, from which state, to which state.

## 5. Monitoring

Add to the daily billing check (`billingHealthCheck.ts`) as findings:
- seat-funded enrolments whose sponsor isn't in an allowed billing state;
- any sponsor whose active codes ≠ `seats_purchased`;
- orphaned seats (redeemed, with no enrolment);
- codes paused for too many failed attempts.

**One-off, before go-live:** a read-only check for any enrolments already created from an unpaid or cancelled sponsor's seats. List them for Ali; change nothing automatically.

## 6. Acceptance tests (written before the change)

Each one fails against today's code and passes after the change, except the last.

1. An unknown code, an expired code and a reassigned code return **byte-identical** responses (status, body, headers).
2. A redeemed code submitted with a **different** email returns that same response and **no** ids.
3. A redeemed code with the **same** email returns 200 and no ids, and creates nothing.
4. A seat whose enrolment is missing is **not** re-redeemed; it returns the identical failure and raises an alert.
5. A sponsor in each refused billing state cannot redeem; one in each allowed state can.
6. Redemption is refused once redeemed seats equal `seats_purchased`.
7. The 6th attempt from one address within 15 minutes returns 429.
8. The 6th failed attempt on one code pauses it.
9. Issuing codes past `seats_purchased` is refused; two simultaneous issues cannot exceed it together.
10. Generated codes are 12 base32 characters, unique, and never appear in full in logs.
11. A redeemed seat can never go back to `available`, and its `redeemed_at` can't be cleared. The database rejects both, even from a direct update.
12. Deleting an enrolment tied to a seat is refused.
13. **Unchanged:** two simultaneous redemptions of one code still produce one enrolment.

## 7. What doesn't change

The seat-row lock, one enrolment per code, and the input validation all stay as they are.

## 8. Open decisions

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
| Is the outcome table in section 1 complete? What does `errorHandler` return? | Kes |
| Does the live seat-to-enrolment link match the association's `SET NULL`? One read-only query answers it: `SELECT conname, confdeltype FROM pg_constraint WHERE conrelid = 'sponsor_seats'::regclass AND contype = 'f';` (`n` = set null, `r` = restrict, `a` = no action, `c` = cascade) | Kes |
| Should the test-data cleanup ever delete an enrolment that holds a sponsor seat? | Kes |
