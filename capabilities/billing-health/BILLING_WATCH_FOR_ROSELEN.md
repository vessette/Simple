# Billing health watch: what each finding means, and what was never checked

**For:** Roselen, who signs off on this capability, Ali, and Kes (the platform fixes at the end). **Capability:** `sales.billing_health_watch`, first release (autonomy:R2).

## What it does

The platform runs a daily billing watch (`billingHealthCheck.ts`). It looks for billing problems that quietly lose money or overcharge someone, and it emails only when something needs a person.

Vick explains that watch's results. For each finding, it says:
- which check found it, with the file and line;
- how urgent it is;
- what a person has to do.

Vick charges, cancels and changes nothing, and it sends nothing.

It also reports **every** check, not just the ones that found something. Each is marked **found something**, **passed** or **unknown**. A check only counts as passed if its data was actually read.

## The six checks

| Check | What it looks for | If it finds something |
|---|---|---|
| Automatic payment declined (`:264`) | A scheduled card charge failed and the member hasn't paid | **Act now.** Ask them for a current card. *Don't* send a payment link: the schedule would charge them again. |
| Schedules match our book (`:222`) | PaySimple's schedules disagree with ours | **Act now.** Reconcile before creating any more schedules. |
| Lapsed with no follow-up (`:122`) | A member is past their renewal date and nobody wrote to them | **This week**, or **act now** after two days. Check the reminder job ran. |
| Reminder job alive (`:152`) | No renewal reminder sent for 3 days | **This week.** Check the job is switched on. |
| Cards expiring (`:181`) | A card expires before the next charge | **This week.** Ask for a new card. |
| Duplicate active rows (`:47`) | One member with two active subscription rows | **Keep an eye on it.** Normal after a manual renewal. |

## What I found: three ways the watch goes quiet when it shouldn't

The watch's own rule is "a check that cannot run is not a passing check". These three break it:

1. **The expiring-card check never runs.** The gateway read only collects schedule ids. Nothing ever fetches card expiry dates (`billingGatewayState.ts:15-18`). So this check gets an empty list and returns nothing on every run (`billingHealthCheck.ts:182`, `:348`). A card that dies before a renewal, the exact problem it was built for, is never reported.
2. **If PaySimple can't be read, the schedule check quietly passes.** The read failure is logged, and then the check is skipped (`billingGatewayState.ts:50-56`; `billingHealthCheck.ts:349`). If nothing else is wrong that day, the watch sends no email. A silent day looks the same as a healthy one.
3. **If no reminder has ever been sent, the reminder check passes.** It treats "never" as fine (`billingHealthCheck.ts:160-161`).

Vick reports all three as **unknown**, not passed. So as the platform runs today, Vick will never call billing fully healthy: card expiry is always unknown. That is the honest answer until it's fixed.

Two smaller notes for Kes:
- The schedule filter uses its own copy of our prices, $199 and $1,788 (`billingGatewayState.ts:24`). If the price changes, new schedules drop out of the comparison and the watch raises a false alarm.
- The brief says five checks. There are six: "automatic payment declined" was added later.

## Repeated findings

**Decided by Roselen on 18 November 2026: hold a repeat back after the first time.** Vick reports a finding in full the first time. While it stays the same (same severity, same number of rows, same wording), later reports list it by name on one line, "Held back, unchanged since the last run", instead of repeating it. If it changes, it appears in full again, marked as changed. A held-back finding still means billing isn't healthy.

## What I need

- **Kes:** three small fixes. (1) Fetch card expiry dates, or remove the check so it doesn't look covered. (2) When PaySimple can't be read, report the schedule check as "could not run", as other failed checks already are. (3) Treat "no reminder ever sent" as worth a look, not as healthy.

Code: [billingExplainer.js](billingExplainer.js). Tests: [billingExplainer.test.js](billingExplainer.test.js), 13 tests, including every combination of readable and unreadable sources. Example results (made up, P1 to P4): [fixtures/watchResults.json](fixtures/watchResults.json).
