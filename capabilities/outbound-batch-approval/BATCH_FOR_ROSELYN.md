# Outbound batches for approval: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions), and Ali as the other named approver.
**Capability:** `sales.outbound_batch_preparation_for_approval`
**Status:** draft. Nothing here enrolls, sends or approves anything.

## What Vick does in this first release (R1)

Using only sample data in the repository (no database, no live data), Vick assembles one **approval packet**. The packet:
- lists the prospects at or above the fit threshold, best first, up to the cap;
- shows each prospect's score;
- names the proposed email sequence;
- names the approver.

Before anyone is included, Vick removes anyone who has **unsubscribed**, is **suppressed**, or is **already in another open packet**. If the same person appears twice, only their higher-scoring entry is kept.

- **The batch is never padded.** If only 7 qualify and the cap is 20, the packet says 7, and 13 short.
- **The packet waits.** It has no expiry date. Time never approves it, and only the named approver can approve or reject it.
- **Nothing is enrolled or sent** until that happens, and that step isn't part of this capability.

Code: [`batchPacket.js`](batchPacket.js), with 11 tests in [`batchPacket.test.js`](batchPacket.test.js).

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code allows, not a record of what has happened.

1. **Pending approvals are approved automatically when they expire.** A job runs every 15 minutes (`schedulerService.ts:1851-1854`). It approves every pending approval request whose expiry time has passed, recording the decision as `system:auto_approve_timeout` (`workLedger/approvalRequestTimeoutJob.ts:12-21`). A request with no expiry date isn't touched. If these packets were ever filed as approval requests with an expiry date, they'd be approved with nobody looking, which is exactly what this capability must prevent.

2. **The old agent approves with no approver.** It approves the selected prospects with the approver left empty (`agents/apolloLeadIntelligenceAgent.ts:242`).

3. **When nothing qualifies, the old agent skips approval altogether.** It searches for new prospects, imports them and enrolls them in one step (`:185-207`).

4. **There's no unsubscribe or suppression check** in how the old agent selects prospects (`:173-182`).

5. **The intended volume is unclear.** The legacy record says 300 a week. The live schedule runs Monday to Friday at 20 a day (`aiOpsScheduler.ts:226`, `apolloLeadIntelligenceAgent.ts:102`). Ali confirmed on 10 November that this agent is switched off.

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | What fit score should qualify a prospect? | Roselyn | 50, as the old agent used, or her own |
| 2 | How many prospects per batch, and how often? | Roselyn | 20 a day · 300 a week · another number |
| 3 | Who approves: Roselyn, Ali, or either? | Roselyn and Ali | One named person per packet |
| 4 | Should approval requests ever expire into approval? | Ali or Kes | For outbound packets: never. Leave the expiry date empty, or change the sweep to expire into "rejected" |

Roselyn also needs an approval screen she can actually use, which is the decision-queue capability. Until then, a packet can only be reviewed at the weekly check-in.

## Your answers

*Fill in with the date.*

**Date:**

**1. Threshold:**

**2. Volume:**

**3. Approver:**

**4. Expiry:**
