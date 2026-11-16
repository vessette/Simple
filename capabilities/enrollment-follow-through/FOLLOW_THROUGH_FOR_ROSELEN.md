# Enrolment follow-through: who is stuck, where, and who chases them

**For:** Roselen, who signs off on this capability and names the step owners, and Taiwo (admissions). **Capability:** `sales.enrollment_completion_follow_through`, first release (autonomy:R2).

## What it does

For a named person, Vick says which step of enrolment they're stuck at, what the next action is, and who owns that step. It also lists everyone who's stuck, one line per person, with the most advanced step first.

Vick contacts nobody. Chasing stays with a person.

## The steps

Each one is read from the person's enrolment row and their latest subscription, using the platform's own rules:

| Step | How Vick knows | Next action |
|---|---|---|
| **Paid but locked out** | Paid and active, but portal access is off. Sign-in checks portal access, not payment (`enrollmentService.ts:139-144`). | Turn on portal access. This is a completion failure, not a payment one: nine paying depositors were locked out for two weeks this way in July (`:293-303`). |
| **Invoice sent, not paid** | Payment status "pending invoice". An invoice enrolment takes its seat straight away (`:72-100`). | Chase the invoice or release the seat: it's held from someone who could pay. |
| **Payment failed** | Payment status "failed" (`:239-249`) | Contact them to retry with a working card. |
| **Started a checkout and stopped** | Pending, with a pending subscription (`enrollmentPaymentFilter.ts:38-39`) | Call them about finishing. |
| **Enrolled but never started a checkout** | Pending, no checkout | Send the checkout link, or ask if they still intend to enrol. |
| Complete | Paid, active, portal access on | Nothing |
| Free Explorer account only | Free account, no checkout | Not a paid enrolment, so not chased |

Missing information is reported as **unknown**, never guessed. For example, a paid row with no portal-access field.

## Two rules the story asks for

- **One person, even with two rows.** Someone who abandoned a checkout *and* holds a free Explorer account appears **once**, at their most advanced step. The other row is shown alongside. Rows are matched by email, ignoring capitals and spaces.
- **"Unowned" means unowned.** Each step's owner comes from a list you set. Until you name an owner, Vick says **unowned** and asks you to name one. It never hands the step to whoever happens to be nearest, such as Taiwo by default.

## What I need from you

1. **Are these the right steps,** in the right order? The brief says the definition of "complete" is yours to set. Are there steps missing, for example the Open House deposit?
2. **Who owns each step?** For example: locked out → admissions? Invoice → you? Failed payment → ? Until you say, every step shows as unowned.
3. **Should a free Explorer who never started a checkout be chased at all?** Right now they're left off the list.

## Notes

- Some of the brief's line references have moved:
  - the lockout note is now at `enrollmentService.ts:293-303` (the brief says `:232-242`);
  - the readiness-campaign enrolment is at `:65`, `:100` and `:179` (the brief says `:443-471`).
- The roster endpoint needs an admin login, so for now a person passes the rows to Vick. That fits with your login now working.

Code: [followThrough.js](followThrough.js). Tests: [followThrough.test.js](followThrough.test.js), 7 tests. Example rows (made up): [fixtures/roster.json](fixtures/roster.json).
