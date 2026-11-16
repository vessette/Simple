# Your decision queue: what Vick needs you to decide, and how a decision is recorded

**For:** Roselen, who decides, and Ali, who approves the surface it lives on. **Capability:** `sales.manager_decision_queue_for_sales_actions`, first release (autonomy:R0): the workflow, the decision types, the evidence each needs and the rollback conditions, **written down for review. Nothing is built.**

**This is a human decision, always.** Vick prepares and presents; it never decides, and nothing it prepares is ever approved by waiting, by a story being finished, or by a conversation going well.

## Can you reach it?

The brief says you have no admin login, so no surface to decide on. Our records say Ali fixed that access on **10 November**. **Please confirm** you can open the admin approval page. It's at `/admin/approval-requests` (`adminRoutes.tsx:304`); the brief's `/admin/approvals` doesn't exist. Until you confirm, this queue works by email reply: each decision below is answerable in a line.

Two gaps between that page and this design, for Ali:
- **It only offers approve or reject** (`approvalRequestRoutes.ts:17-18`), with no "defer". Under this design a deferred decision stays visibly undecided, which the page can show only by leaving the item untouched.
- **It has a bulk-approve action** (`:19`), which records many decisions at once with no reason for each. That's useful for routine held messages, but it shouldn't be used for these decisions, each of which needs its own reason.

## Is the approval page the right place? Criteria for Ali

Measured against the platform at `ffc1f09`:

| Criterion | Why it matters | The approval page today |
|---|---|---|
| **Nothing is approved by time passing** | The brief's core rule: a decision only counts if a person made it | **Fails.** A job every 15 minutes approves any request whose time has run out, recording the decider as `system:auto_approve_timeout` (`approvalRequestTimeoutJob.ts:12-20`; scheduled at `schedulerService.ts:1893-1901`) |
| **Defer is an option** | Roselen can say "not yet, I need X" without that being read as yes or no | **Fails.** Approve or reject only (`approvalRequestRoutes.ts:17-18`) |
| **A reason with every decision** | The audit trail must say why, not just what | **Partly.** A reason code exists (`ApprovalRequest.ts:32`), but bulk approve records many at once without individual reasons (`approvalRequestRoutes.ts:19`) |
| **Who decided, and when** | So a capability can move from "proposed" to "decided by Roselen on [date]" | **Passes** (`decided_by`, `decided_at`, `ApprovalRequest.ts:37-38`) |
| **Roselen can reach it** | Otherwise there's no surface at all | **To confirm.** It needs an admin login (`requireAdmin`); access was recorded as granted on 10 November |
| **She sees only her decisions** | The page lists every agent's held actions (`approvalRequestRoutes.ts:13`), so sales decisions would sit among unrelated ones | **Unclear.** Whether it can filter to sales isn't confirmed |
| **The evidence is shown with the proposal** | She should decide from the write-up, not from memory | **Unclear.** The page shows held agent actions; whether it can link a write-up isn't confirmed |

**Why defer matters:** without it, every proposal is forced into yes or no. And on this page, an item left alone is *auto-approved* when its window closes. "Not yet" is the most common honest answer to a new rule ("I need to check with Ali first"), so a page without defer and with a timeout turns hesitation into approval. With defer, Roselen keeps the decision open on purpose, can say what she's waiting for, and nothing moves until she comes back to it.

**My read:** the page isn't suitable for these decisions **as it stands**. Using it would need, at least:
- these requests excluded from the timeout sweep;
- a "defer" state;
- bulk approve kept away from them.

Until then, **email reply recorded in the repo** meets every criterion. Each answer is dated, carries her reason, and nothing moves without her. This is Ali's call; the evidence is above.

### What auto-approval does to accountability, and a better balance

**The problem isn't speed; it's who answers for the decision.**
- **Nobody is accountable.** The record says the decider was `system:auto_approve_timeout`. If an auto-approved action goes wrong, there's no person who chose it, only a person who didn't get to it in time.
- **It turns silence into consent.** Roselen's authority becomes "approve, or be overruled by the clock". Being busy has the same effect as saying yes.
- **It rewards not looking.** If things go through anyway, the queue stops feeling like a responsibility, and the reviews that matter get skipped too.
- **The audit trail misleads.** "Approved" reads like a judgement was made. For a price, a refund rule or who gets billed, that's a record of a decision nobody took.

**Why it exists:** the timeout was built so held agent actions (an outreach message waiting for review) don't sit forever. That's a fair efficiency concern. The fix is to keep the speed without making time the decider.

**A better approach:**
1. **Split by risk.** Routine, low-risk, reversible actions can keep a time limit. Anything this brief marks *human decision* (prices, refunds, billing, outreach wording) never does.
2. **When time runs out, fail safe, not open.** An expired item should become *not done* and *escalated*, never *approved*. A missed outreach message waits; a wrong charge can't be taken back.
3. **Escalate instead of deciding.** A reminder to Roselen when half the window has gone. At the deadline, it goes to Ali as backup, and the item stays pending, visibly overdue.
4. **Name a deputy for absences.** If Roselen is away, a named person (Ali) decides. Delegation keeps a person accountable; a timer doesn't.
5. **Keep the queue small.** Fewer, better-prepared decisions, each answerable in a line, with the most important first. Efficiency comes from good preparation, not from removing the person.

So: speed is kept by reminders, escalation, a deputy and short decisions. Accountability is kept by never letting time make the decision.

## How a decision works

1. **Vick presents** one proposal: what's proposed, the evidence (a write-up with file and line references), and the options.
2. **You choose:** *accept*, *reject* or *defer*, each **with a reason**.
3. **It's recorded** against the capability and the proposal: who decided, when (Central time), and why. Until then, that capability's rule stays **proposed** in its write-up and code.
4. **Undecided stays undecided.** A proposal with no answer is shown as waiting, indefinitely. Nothing times out into "approved".

## Decision types

| Type | What you're deciding | Evidence you should see before deciding | How it's undone if it turns out wrong |
|---|---|---|---|
| **Rule** | How Vick classifies something (e.g. what counts as "needs attention") | The proposed rule, worked examples, and the platform code it rests on | Restore the previous rule from git; Vick's tests show exactly what changes |
| **Owner** | Who acts on a step or a finding | The step, how often it happens, and the next action | Name a new owner; until then the step shows as unowned |
| **Threshold** | A number (a pass mark, a time window) | Today's value, where it comes from, and what changes at each option | Set the number back; nothing is sent or charged by Vick either way |
| **Wording** | What a member or prospect is told | The exact text and its source; the price of record | Revert the text; any material already sent is recorded |
| **Policy** | What happens to money or access in a situation | The current behaviour, the options, and who else must agree (often Ali) | A policy change goes through Ali and Kes; reverting is a platform change |
| **Access** | Who may see or decide what | The surface, the permission, and who grants it | The grant is withdrawn by whoever gave it (Ali) |

## The matrix: one decision per capability

Every one of the 32 sales capabilities needs at least one decision from you. **None is confirmed yet.** Each row links to the write-up with the evidence.

| Capability | Type | The decision | Evidence | Status |
|---|---|---|---|---|
| Abandoned checkouts | rule | Confirm the table of who counts as an abandoned checkout | [write-up](../abandoned-checkout/ABANDONED_CHECKOUT_FOR_ROSELEN.md) | awaiting |
| Payment reconciliation | rule | Only Settled or Posted payments count as paid | [write-up](../app-payment-reconcile/RECONCILE_FOR_ROSELYN.md) | awaiting |
| Billing health watch | policy | Keep showing a finding that repeats daily, or hold it back? | [write-up](../billing-health/BILLING_WATCH_FOR_ROSELEN.md) | awaiting |
| Free seats | policy | Someone paying is given a free seat: what happens to the paid plan? | [write-up](../comped-seat/COMPS_FOR_ROSELYN.md) | awaiting |
| Analyst reporting handover | rule | Write down the reports you rely on today | the brief | awaiting |
| Checkout links | wording | Links quote only $149 billed annually / $199 monthly, never $4,500 | [write-up](../enrollment-checkout/CHECKOUT_FOR_ROSELYN.md) | awaiting |
| Enrolment follow-through | owner | Confirm the steps and name each one's owner | [write-up](../enrollment-follow-through/FOLLOW_THROUGH_FOR_ROSELEN.md) | awaiting |
| Prospect discovery and fit | threshold | The fit-score pass mark and warm-lead signals | [code](../icp-fit-scoring/fitScoring.js) | awaiting |
| This decision queue | access | Can you open the approval page, and are you the decider for each row? | this page | awaiting |
| Offer routing | owner | Who owns the advisory, custom build and enterprise offers? | [write-up](../offer-pipeline-routing/ROUTING_FOR_ROSELYN.md) | awaiting |
| Outbound batches | threshold | Pass mark, batch size and frequency, and the approver | [write-up](../outbound-batch-approval/BATCH_FOR_ROSELYN.md) | awaiting |
| Sequence health | rule | Is a sequence with no activity healthy, idle or unknown? | [write-up](../outbound-sequence-health/SEQUENCE_HEALTH_FOR_ROSELYN.md) | awaiting |
| Payment confirmation | policy | What happens when a payment is returned? | [write-up](../payment-confirmation/PAYMENT_FOR_ROSELYN.md) | awaiting |
| Payment handoff | owner | Who hears about a customer id that belongs to someone else? | [write-up](../payment-handoff/HANDOFF_FOR_ROSELEN.md) | awaiting |
| Duplicate payment notices | owner | Who's told when the same payment notice arrives twice? | the brief | awaiting |
| Pipeline digest | wording | Which figures, in what order, how often, at what time | [write-up](../pipeline-digest/DIGEST_FOR_ROSELYN.md) | awaiting |
| Pipeline stages | rule | Does a lead you move back by hand stay there? | [write-up](../pipeline-stewardship/PIPELINE_FOR_ROSELEN.md) | awaiting |
| Price audit | rule | Which places count as live versus archived | [write-up](../price-audit/PRICE_INVENTORY_FOR_ROSELEN.md) | awaiting |
| Outreach drafts | wording | Tone and brand rules, and who sends which drafts | [write-up](../outreach-drafts/OUTREACH_DRAFTS_FOR_ROSELEN.md) | awaiting |
| Prospect questions | rule | The next cohort's dates, and the example answers | [write-up](../prospect-kb-answers/KB_ANSWERS_FOR_ROSELEN.md) | awaiting |
| Quotes and offer packets | policy | Which offers a quote may include, and who signs off each price | the brief | awaiting |
| Refunds and voids | policy | Which version of the refund terms is final, and who signs it off | [write-up](../refund-and-void/REFUND_FOR_ROSELYN.md) | awaiting |
| Renewal worklist | rule | The definition of "needs attention", and the order | [write-up](../renewal-worklist/WORKLIST_FOR_ROSELEN.md) | awaiting |
| Renewal reminders | policy | Should reminders stuck as "claimed" be reported? | [write-up](../renewal-reminders/REMINDERS_FOR_ROSELEN.md) | awaiting |
| Revenue reporting | wording | The names "collected (recorded)" and "collected less refunds" | [write-up](../revenue-reporting/REVENUE_FOR_ROSELYN.md) | awaiting |
| Revenue definition guard | rule | The revenue rules, including refunds and time periods | [write-up](../revenue-guard/GUARD_FOR_ROSELEN.md) | awaiting |
| Seat capacity forecast | rule | What seat count may be quoted, and from where | the brief | awaiting |
| Missed strategy calls | threshold | How late counts as missed; automatic recovery emails or not | [write-up](../strategy-call-no-show/NO_SHOW_FOR_ROSELYN.md) | awaiting |
| Cancellations | owner | Who's told when a cancellation skips PaySimple | [write-up](../subscription-cancellation/CANCELLATION_FOR_ROSELYN.md) | awaiting |
| Subscription checkout | wording | Members are told billing starts the day they pay | [write-up](../subscription-checkout/SUBSCRIPTION_FOR_ROSELYN.md) | awaiting |
| Churn and renewal risk | rule | Which signals mark a member as at risk | [write-up](../renewal-worklist/WORKLIST_FOR_ROSELEN.md) | awaiting |
| Team licenses | wording | Are $1,200 and $950 per seat still right; do sponsors name everyone up front? | [write-up](../team-licenses/TEAM_LICENSES_FOR_ROSELEN.md) | awaiting |

The same matrix is in [decisionMatrix.json](decisionMatrix.json), and a test checks it against the plan: every capability has a row, and no row says confirmed.

## How to work through it

You don't need to answer all 32 at once. Two suggestions:
- **Start with the owners** (5 rows). Until a step has an owner, Vick can only say "unowned".
- **Then the rules that change what Vick tells people:** prospect questions, the renewal worklist and the revenue definition.

When you answer one, I'll record it in that capability's write-up and update the rule and its tests in one change, so the matrix row moves from *awaiting* to *decided* with your name, the date and your reason.

## What I need from Ali

1. Is the approval page (`/admin/approval-requests`) the right place for these decisions, or is email reply, recorded in the repo, enough for now? The brief marks this as a governance choice.
2. If it's the page: should these requests be excluded from the 15-minute auto-approve sweep, should it gain a "defer" option, and should bulk approve be kept away from them? (This overlaps with your action point 8 from Kes's review: approval requests expiring into "approved".)
