# Pipeline digest: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), and Ali.
**Capability:** `sales.pipeline_digest_for_manager`
**Status:** draft. Nothing here sends mail or changes a setting.

## What Vick does in this first release (R2)

On request, Vick answers six pipeline questions from the same sources the digest uses:
- leads by stage;
- the lead summary;
- enrollments and seats;
- collected revenue;
- what needs your attention;
- strategy calls this week.

**Every figure names where it came from.** If a source fails, its figures say **unavailable, with the reason**. They never show as 0. A real zero still shows as 0.

Vick can also put the full digest together for the platform's existing sender:
- **Disabled in settings:** nothing is produced, and Vick says so.
- **Already sent to you today:** nothing goes out again. "Today" is the Central date, so a late-evening run doesn't count as tomorrow.
- **Nothing needs you:** it says "Nothing needs your attention today", but only when every source answered. If the needs-attention list itself failed, the digest says it can't tell.

Code: [`pipelineDigest.js`](pipelineDigest.js), with 12 tests in [`pipelineDigest.test.js`](pipelineDigest.test.js).

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code allows, not a record of what has happened.

1. **One failed source means no digest at all.** The platform fetches all nine sources together (`digestService.ts:96-106`). If any one fails, the whole digest fails, and the error is only logged (`schedulerService.ts:2626`). Nobody is told that it didn't go out.

2. **Missing visitor figures become 0** (`digestService.ts:121-124`). This is the failure the metric registry exists to prevent (`adminOs/metricRegistry.ts:181-188`).

3. **There's no "already sent today" check.** The digest is sent to the admin list with no record of what was already sent (`emailService.ts`, `sendDigestEmail`). The test-digest button sends another one every time it's pressed (`adminSettingsController.ts`, `handleSendTestDigest`).

4. **The send hour follows the server's clock, not Central time.** The digest checks `now.getHours()` against the configured hour (`schedulerService.ts:2605-2616`), and this job sets no time zone. Other jobs in the same file run on `America/Chicago`. If the server runs on UTC, a "7 AM" digest goes out at 1 AM Central.

5. **Collected revenue isn't wired yet.** The metric registry marks it unavailable: the payment source is identified but not connected (`metricRegistry.ts:181-188`). Vick reports it that way.

6. **It's a general admin digest, not a sales one.** The existing digest covers the whole admin team. As the spec says, the general job stays with the platform, and only the sales section is part of this capability.

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | Which figures do you want in your digest, and in what order? | Roselyn | The six above, or a shorter list |
| 2 | How often, and at what Central time? | Roselyn | Daily · weekly; an hour |
| 3 | Should the platform digest send per source and record what it sent? | Ali or Kes | A platform change: one failed source shouldn't stop the digest, and a re-run shouldn't send twice |
| 4 | Should the digest job run on Central time? | Ali or Kes | A one-line platform change, matching the other jobs |

## Your answers

*Fill in with the date.*

**Date:**

**1. Figures:**

**2. Cadence and time:**

**3. Platform sender:**

**4. Time zone:**
