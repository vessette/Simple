# Answering prospect questions from approved material only

**For:** Roselen, who owns these knowledge-base entries and signs off on this capability, and Taiwo (admissions). **Capability:** `sales.prospect_question_answering_from_approved_kb`, first release (autonomy:R2).

## What it does

A rep asks Vick a prospect's question. Vick answers **only** from the Sales Hub's pinned facts and the knowledge-base entries the Sales Hub retrieves for that question. The answer goes to the rep, never to the prospect.

It does two jobs:

1. **Answers.** Each sentence comes from a pinned fact or a KB entry, and Vick records which one. When neither covers the question, it says *"I don't have that detail. Please confirm with Ali."*
2. **Checks any answer, including the Sales Hub's own AI answers.** Every price, date and count must appear in a pinned fact or a KB entry. A single made-up one fails the answer.

Three rules it always follows:

- **Cost questions** always include what students pay on top: an Anthropic subscription for Claude Code (about $20 a month) and API usage (most projects under $10 a month).
- **Refund questions** get "the terms are drafted and pending final approval", and no terms are quoted.
- **Policy words** like "full refund", "money-back" or "guarantee" fail the check unless the approved material says them.

## Examples (today)

| The rep asks | Vick answers |
|---|---|
| How much does it cost? | $149/mo billed annually or $199/mo monthly, no separate course fees, **plus** the student-paid Anthropic (about $20/mo) and API (under $10/mo) costs |
| Can I get a refund if I cancel? | The terms are drafted and pending final approval, so I can't quote them yet. Please confirm with Ali. |
| Can my employer pay? | I don't have that detail. Please confirm with Ali. |
| When does the next cohort start? | The dates on file have passed (July 16 and July 23, 2026). Please confirm the next cohort's dates with Ali. |

## Two things you should know

**1. The Sales Hub's dates are out of date.** The pinned facts still give the Open House as **Thursday July 16, 2026** and the kickoff as **Thursday July 23, 2026** (`salesHubCoryController.ts:30`). The Sales Hub's AI is told to ground its answers on these. So asked "when does it start?" today, it could give a rep a July date as if it were upcoming. Vick won't: a date that has passed is flagged and sent to Ali. **Could you or Ali give the next cohort's dates, so the pinned facts can be updated?**

**2. Prices agree today, but they're a separate copy.** The pinned facts say $149 and $199, which matches the platform's one price setting (`membershipPrice.ts:44-48`). The KB seed already reads that setting. But the pinned facts are typed in by hand, so a price change wouldn't reach them. A test now fails if they stop matching. The real fix is for the platform to build the pinned prices from the setting, which is for Kes.

## What I need from you

- **Roselen:** the next cohort's dates (or who sets them), and a check of the examples above. Would you answer any of them differently?
- **Taiwo:** which questions do reps get most that the KB can't answer? Each one is a gap to fill with an approved entry.

Code: [kbAnswers.js](kbAnswers.js). Tests: [kbAnswers.test.js](kbAnswers.test.js), 10 tests, including a 16-question sample run through the check. Pinned facts copied from the platform, with made-up KB entries for testing: [fixtures/pinned.json](fixtures/pinned.json).
