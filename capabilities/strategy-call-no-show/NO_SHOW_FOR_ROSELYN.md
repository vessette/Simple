# Missed strategy calls: what Vick does, and what needs your decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions)
**Capability:** `sales.strategy_call_no_show_detection_and_recovery`
**Status:** draft. Nothing here is approved, switched on or sending anything.

## What Vick does in this first release (R2)

Given the strategy calls and the current time, Vick explains which calls count as no-shows and why. Every answer names:
- the scheduled time, in Central;
- the waiting time it used before calling it a no-show (the grace threshold);
- the call's current status.

Any count comes with the list of calls it counts. Vick marks nothing, cancels nothing and contacts nobody.

Code: [`noShow.js`](noShow.js), with 14 tests in [`noShow.test.js`](noShow.test.js).

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code allows, not a record of what has happened.

1. **Three different timings.**
   - The capability's goal says a missed call is caught **within 15 minutes**.
   - The spec and the agent registry say a call is a no-show **30 minutes** after its start (`agentRegistrySeed.ts:203`).
   - The code that runs actually waits **2 hours** (`schedulerService.ts:1624`). It checks every 15 minutes (`:2425`), so a no-show is flagged 2 to 2¼ hours after the call was due.

   Vick can explain either rule and shows which calls they disagree on. It has no default, because neither rule is approved.

2. **The follow-up is automatic.** When a call is marked a no-show, the lead is put into a recovery email sequence straight away (`:1653`). The emails come from the platform's existing sender, not from Vick. If that sequence was never set up, the step is skipped with only a log line (`strategyPrepService.ts:262-265`).

3. **A failure part-way leaves the lead stranded.** The call is marked no-show first (`schedulerService.ts:1639`), and the follow-up steps run afterwards. If a later step fails, the error is only logged (`:1667`). The call is no longer "scheduled", so it's never checked again, and the lead may never reach the recovery queue.

4. **It closes more than this call.** It marks every active campaign enrollment for that lead complete (`:1644-1647`), not only the one tied to this call.

5. **A mistake can't be undone in the admin screens.** I found no admin route that changes a strategy call's status. The `/admin/appointments` page edits a different table. If a call happened but was never marked complete, nobody can reverse the no-show there, and nothing restores the nudges it cancelled.

6. **Two things that are fine.**
   - **Daylight saving:** call times are stored as exact moments, not local clock times (`StrategyCall.ts:70`), so a time change doesn't move the threshold. Vick's tests cover both changeovers.
   - **No double enrollment:** a lead who already has pending recovery emails isn't enrolled twice (`sequenceService.ts:304-318`).

## What needs your decision

| # | Question | Options |
|---|---|---|
| 1 | How long after the start should a call count as missed? | 30 minutes (the spec) · 2 hours (what runs today) · another time |
| 2 | Should the recovery emails keep starting automatically? | Keep automatic · put the lead on a list for a person to contact first |
| 3 | Who can reverse a mistaken no-show, and how? | Needs a platform change either way: an admin action that also restores what was cancelled |

Findings 3 to 5 are platform fixes, so they'd go to Kes and Quincy as a change request once you've answered.

## Your answers

*Fill in at the check-in, with the date.*

**Date:**

**1. Grace threshold:**

**2. Automatic recovery emails:**

**3. Reversing a mistake:**
