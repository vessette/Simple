# Outreach drafts for a person to send

**For:** Roselen, who signs off on this capability and sends, and Ali, who approves. **Capability:** `sales.prospect_outreach_draft_for_human_send`, first release (autonomy:R1). **This is a human decision, always:** Vick drafts, a person reviews and sends.

## What it does

Vick writes a first draft of an outreach email (an introduction, a follow-up, or a pricing note) and hands it to the **named person** who will send it. Then it stops.

- **No send, no queue, no schedule.** The code has no way to send anything, and the draft carries no address or field a mailer could pick up. A test checks both.
- **Every line shows where it came from:** the approved Sales Hub facts, the prospect's own notes, or a fixed line.
- **This first release runs only on made-up prospects** in the repository, as the story requires.

## What a draft can never contain

| Rule | Why | What Vick does |
|---|---|---|
| A price, date or number not in the approved sources | A draft states prices, so it's a financial statement | Checked by the same audit as the prospect-questions capability; any untraceable figure fails the draft |
| The word **"free"** | Texas rule **40 TAC 807.172(d)**: training can't be advertised as free. The platform already enforces it (`bannedCopyRule.ts:108-113`). | Fails the draft, and names the approved alternatives: **"$0 to start"** and **"No card needed"** |
| Refunds or cancellation | Those terms are still pending approval (`salesHubCoryController.ts:33`) | Fails the draft |
| A suppressed or unsubscribed prospect | They've asked not to be contacted | No draft is written |
| Dates that have passed | The pinned July dates are out of date | Says you'll confirm the next cohort's dates instead |

Cost drafts always include what students pay on top: Anthropic (about $20/mo) and API usage (under $10/mo).

**Pricing drafts quote the annual price only:** $149/mo billed annually. Ali decided on 24 October that month-to-month ($199) is offered only when someone pushes back. Leaving it out also drops "(cancel anytime)", which would be a cancellation claim.

## An example (pricing draft, made-up prospect)

> Hi P1,
>
> The schedule is 4 live hours per week (Monday Architecture Day 2h + Thursday Build Day 2h).
>
> Membership is $149/mo billed annually (founding rate, locks for as long as the membership stays active).
>
> On top of that, students pay their own tools directly: an Anthropic subscription for Claude Code (about $20/mo) and LLM API usage on their own key (most projects under $10/mo).
>
> I'll confirm the next cohort's dates with you directly.
>
> Happy to answer any questions.
>
> Roselen

## Found: "free" is still on live surfaces the platform's own rule should cover

1. **The Sales Hub's pinned facts say "free Open House"** (`salesHubCoryController.ts:30`), and the Sales Hub's AI is told to ground its answers on them. Vick removes the word from its drafts, but the Sales Hub's own answers could repeat it.
2. **The membership landing page shows a "Free Open House" label** (`MembershipLanding.tsx:22`).
3. **The claims registry approves "Free" as a pricing claim** for `/pricing`, `/` and `/try` (`claimsRegistry.ts:445-454`).

The platform's banned-word check covers backend email copy. These are front-end and Sales Hub text. Whether "Free" as a plan name breaks the rule is a legal call. I'd raise it with Ali rather than assume.

## What I need from you

1. **The tone and brand rules for sales outreach.** The brief notes these aren't written down yet. Until they are, drafts use a plain, short style. What should an introduction sound like, from you?
2. **Who sends what:** should every draft go to you, or do reps send their own?
3. **Ali:** do the three "free" findings above need fixing under 40 TAC 807.172(d)?

Code: [draftOutreach.js](draftOutreach.js). Tests: [draftOutreach.test.js](draftOutreach.test.js), 9 tests, including the two the story names: a draft with an untraceable price fails, and a draft with "free" fails. Made-up prospects: [fixtures/prospects.json](fixtures/prospects.json).
