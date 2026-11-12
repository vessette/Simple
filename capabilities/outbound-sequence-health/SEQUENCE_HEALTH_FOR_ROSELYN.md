# Outbound sequence health: what Vick does, and what needs a decision

**For:** Roselyn (accountable manager, Sales, Enrollment & Subscriptions). Also relevant to Ali, and to Kes or Sohail on ownership.
**Capability:** `sales.outbound_sequence_health_watch`
**Status:** draft. Nothing here is approved, switched on, retried or resolved.

## What Vick does in this first release (R2)

Given the recorded figures for an outbound email sequence, Vick explains its health score **component by component**. There are five components, totalling 100 points:

| Component | Points |
|---|---|
| Channel connectivity | 30 |
| Delivery | 25 |
| AI generation | 15 |
| Engagement | 15 |
| Errors | 15 |

Each component shows the inputs it used and the platform rule it came from.

- **If a component can't be checked**, for example an SMS provider that can't be reached or a lookup that failed, the whole score is **unknown**. It's never assumed healthy.
- **Stalled sequences:** Vick flags any sequence with active leads but nothing queued to send.
- **Proposed fixes:** Vick names a proposed fix for each problem and carries out none of them. A provider outage is reported as an outage, with no retry proposed, since a retry would fail again.
- **Repeats:** a problem already reported in an earlier run isn't repeated, so new problems stand out.

Code: [`sequenceHealth.js`](sequenceHealth.js), with 12 tests in [`sequenceHealth.test.js`](sequenceHealth.test.js).

## What I found in the platform

Read from the platform code at commit `109820a`. This is what the code allows, not a record of what has happened.

1. **A sequence that has stopped sending scores 100 and shows as "healthy".** Every component with no data gets full points: no sends (`campaignHealthScanner.ts:171`), no AI attempts (`:179`) and too few outcomes (`:189`). So a sequence that has gone quiet looks perfect. This is exactly the "silently stops while looking healthy" problem this capability exists to catch. Vick keeps the platform's number so the two can be compared, but lists every component that got credit with no data behind it.

2. **"Connected" only means credentials are filled in.**
   - Email and voice count as working if their keys are set (`:136`, `:142`). Nobody checks that the provider actually answers.
   - SMS is always counted as working (`:148`).
   - AI is always added as a channel (`:152`), so the "no channels" rule (`:164`) never applies.

3. **A sequence that errors during the scan disappears from the report.** The error is logged (`:42`) and that sequence is left out of the totals. It isn't shown as unknown.

4. **Two of the scores compare unlike things.**
   - The AI failure rate divides one group of emails by a different group (`:90-99`).
   - The error score compares *all* unresolved errors, of any age (`:126`), with just the last 24 hours of sends.

5. **The older agents act on their own.** Neither repair agent waits for approval, and nobody has authorised either action:
   - The repair agent retries failed sends automatically, up to 3 attempts (`agents/campaignRepairAgent.ts:28`, `:73`). Every 20 minutes it also marks *every* unresolved campaign error older than 7 days as resolved, across all campaigns (`:175`).
   - The self-healing agent also puts failed emails back in the queue (`agents/campaignSelfHealingAgent.ts:112`).

   Both are on the schedule (`aiOpsScheduler.ts:175`, `:179`). Whether they actually run is controlled by the governance table, which the code doesn't show, so it's **unknown**. This is the same check Ali did for the Apollo agent.

## What needs a decision

| # | Question | Who | Options |
|---|---|---|---|
| 1 | Should a sequence with no activity count as healthy? | Roselyn | Healthy (as today) · "idle, check it" · unknown |
| 2 | Are the repair and self-healing agents running, and should their automatic retries and auto-resolve be paused? | Ali or Kes | Check the governance table, as for Apollo |
| 3 | Who owns this capability? These agents run campaign delivery, which may belong to marketing or platform rather than sales. | Ali, with Sohail and Kes | Sales · Marketing · Platform |
| 4 | What score counts as healthy, degraded or critical? | Roselyn | The platform's 80 / 60 cut-offs, or her own |

## Your answers

*Fill in with the date.*

**Date:**

**1. No activity:**

**2. Repair agents:**

**3. Owner:**

**4. Cut-offs:**
