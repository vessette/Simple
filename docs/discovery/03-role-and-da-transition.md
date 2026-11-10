# Roselyn's role, and which responsibilities transition to the agent

**Domain:** Sales, Enrollment & Subscriptions · **Story:** `sales.RESEARCH-3-ROLE-AND-DA-TRANSITION`
**Accountable human:** Roselyn (`roselen@colaberry.com`)
**Prepared by:** Victoria Spencer-Auber · **Status:** draft for Roselyn's review. Nothing here is approved, and no agent has been changed.

## Summary

- **The Data Analyst duty list does not exist.** I searched the platform repository for it and found nothing for this domain or any other. The one place "DA" is linked to Roselyn most likely means the *Data Analytics bootcamp*, not a Data Analyst role (see [What "DA" means here](#what-da-means-here)). Cory agrees with that reading, but the requirement's author has not confirmed it.
- **Data Analytics admissions is already partly handled by AI.** The voice agent Cora tells callers the bootcamp is closed and offers the Accelerator. The email agent acknowledges bootcamp enquiries and hands them to "the admissions team". See [What DA admissions involves](#what-da-admissions-involves).
- **Roselyn's role as she actually performs it is documented below**, from her own description of her five steps. Twelve responsibilities are classified: 3 stay human, 1 transitions to the agent, and 7 split between Roselyn and the agent. The twelfth, recurring reporting, is not Roselyn's in the sources and is recorded only so it is not mistaken for hers.
- **Reporting, the work a Data Analyst would normally do, belongs to Taiwo in the sources**, not Roselyn. Whether that is still true is unknown.
- **What has to be written next:** a short duty list for recurring sales and enrollment reports. An outline and who should write it are at the end.

## Sources

Every claim below cites one of these, or says **unknown**.

| Code | Source |
|---|---|
| **[R]** | Roselyn, in a call with Victoria and in written follow-up answers, relayed in this project in November 2026. The call date was not recorded. Roselyn has not yet reviewed this document. |
| **[P]** | The Colaberry platform repository, `ColaberryIntern/ColaberryEnterprise_AI_LeadershipAccelerator`, at commit `456de02` (9:42 AM CST on 2026-11-10). File paths below are in that repository. |
| **[C]** | The live platform API, `GET /api/admin/agent-domains-mine/sales/coverage`, read in November 2026. |

## Accountable human

- **Roselyn** is accountable for Sales, Enrollment & Subscriptions. [P] `docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16`; `CLAUDE_CODE_AI_EMPLOYEE_CONSOLIDATION_LOOP_PROMPT.md:319`
- Her name is spelled **Roselen** in the platform's records. [P] `docs/growth-os-reset/SALES_REP_CONTRACT.md:150`
- **She cannot open her agent's review page today**: `manager_has_no_admin_login`. Nothing in this document can be approved inside the platform until that changes. [P] `HUMAN_OWNERSHIP_MAP.md:16`; [C] every row's `blocked_by`
- **The agent is Vick.** It is not enabled, its agent level is `observe`, and it has 0 tools granted. [C] `/api/admin/agent-domains-mine`

## What I searched, and what I found

| # | Search | Where | Result |
|---|---|---|---|
| 1 | `data analyst` (any case) | Whole repository, excluding `PROGRESS.md` | 42 files. None lists a human Data Analyst's duties. The hits are course content, an AI component, government-bid text and capability files that themselves record the absence. |
| 2 | "DA" within 40 characters of "duty" or "responsibility" | Whole repository | Only the story templates and capability files, each saying the duty list does not exist. One example: `backend/src/services/agentDomain/capabilities/sales.json:3170` |
| 3 | `data analyst`, `DA responsib`, `DA duties` | `docs/architecture/ai-workforce-management/` (26 files) | 0 hits |
| 4 | The "Data Analyst Agent" | `docs/agent-catalog/assistant/data-analyst-agent.md:1-8` | An automated helper that tidies SQL results. Not a role, and unrelated to this story. |
| 5 | The source of the requirement itself (`.loop-architect/runs/20261007-school-agent-factory/execution-contract.md:45-49`, `plan.md:307-309`, `:633-642`) | The repository | **Not in the public repository.** The capability records cite it, but its exact wording could not be read. |
| 6 | `roselyn` or `roselen` | Whole repository, excluding `PROGRESS.md` | 52 files. The role-bearing ones are used below: her launch brief, Taiwo's launch brief, the knowledge-base seed, the voice-agent prompts and the ownership map. |
| 7 | Report definitions (what, who receives it, how often, timezone, channel) | `docs/architecture/ai-workforce-management/REPORTING_MAP.md:15` | "Confirmed absent." No object combines these five. |
| 8 | "DA" in admissions and sales text | `docs/`, `frontend/public/knowledge/`, `backend/src/seeds/` | Every use means the **Data Analytics bootcamp**. Examples: `docs/synthflow-inbound-prompt.md:4,34`; `docs/synthflow-cold-lead-prompt.md:186-217` |

**Conclusion:** no source in the repository lists Data Analyst duties for sales. This agrees with the warning in the story brief.

## What "DA" means here

The only place linking "DA" to Roselyn is a mockup persona label: `areas:[{l:'DA Admissions'…},{l:'Customer Support'…}]`. [P] `docs/admin-knowledge-ops-mockup.html:884`

Everywhere else in the admissions and sales material, "DA" means the **Data Analytics bootcamp**, which is closed to new students:
- "IPBC (current DA bootcamp students)" [P] `docs/synthflow-inbound-prompt.md:4`
- "Do not enroll anyone in the Data Analytics bootcamp" [P] `docs/synthflow-cold-lead-prompt.md:209`

Roselyn also said the agents still quote **Data Analytics prices** instead of the AI systems program's. [R]

So "DA Admissions" most likely means *admissions for the Data Analytics bootcamp*, not *a Data Analyst*. Cory, the platform's assistant, agreed that it "appears to mean" Data Analytics. **That reading is still unconfirmed by the requirement's author.** The requirement is not in the public repository (search 5). If it meant the Data Analytics bootcamp, the transition being asked about is **away from a closed program**, not from an analyst role.

## What DA admissions involves

The Data Analytics bootcamp is **closed to new students**. [P] `docs/synthflow-inbound-prompt.md:34`; `docs/synthflow-cold-lead-prompt.md:188-189`

The DA admissions work recorded in the repository is below. Rows D1 to D5 are separate from the twelve rows in the main table.

| # | Function | Who does it now | Decision | Reason | Source |
|---|---|---|---|---|---|
| D1 | Telling a caller the bootcamp is closed and offering the Accelerator instead | **Already AI:** the Cora voice agent | **Transitioned** (on calls) | Scripted in Cora's call prompts. Not checked: whether those prompts are live. | [P] `docs/synthflow-inbound-prompt.md:34, 195`; `docs/synthflow-cold-lead-prompt.md:188-189` |
| D2 | Answering bootcamp admissions, enrollment and program **emails** | Cora acknowledges and flags each one; "the admissions team" answers within one business day | **Splits** | The email agent is told it has no current bootcamp information and must "not answer the substance". A person answers. **Which person is unknown.** | [P] `backend/src/services/inbox/coraKnowledgeBase.ts:258-261, 285-288` |
| D3 | Billing, IPBC and account questions from **current** bootcamp students | Taiwo | **Stays human**, and not Roselyn's | Money and account changes. Cora routes these to Taiwo. | [P] `docs/synthflow-inbound-prompt.md:184-190`; `docs/synthflow-cold-lead-prompt.md:210, 217` |
| D4 | Keeping bootcamp prices and dates out of Accelerator answers | **Already AI:** a guard in the email agent, checked by shadow test cases 8 to 10 | **Transitioned** (for email) | Roselyn reports that agents still show Data Analytics prices [R], so the guard is not covering every agent. Which agent shows them is **unknown**. | [P] `coraKnowledgeBase.ts:258`; `directives/cora-knowledge-base-gaps.md:14` |
| D5 | Anything else DA admissions did | **Unknown** | **Unknown** | The fuller list is in the "legacy Cora operating sheet", a Google Sheet outside the repository. | [P] `directives/cora-knowledge-base-gaps.md:16` |

**Who owns DA admissions is unclear:**
- The same directive names **Shveta**, not Roselyn, as the routing owner for "DA admissions". [P] `directives/cora-knowledge-base-gaps.md:16`
- The mockup labels Roselyn "DA Admissions". [P] `docs/admin-knowledge-ops-mockup.html:884`

Whether the work passed to Roselyn, and when, is **unknown**. Ask Ali.

**What could be automated or enhanced, from the above:**
- **D2** is the clearest candidate. The agent could draft a reply to each flagged bootcamp email from a short, approved set of bootcamp facts, and a person would send it. That needs those facts written down first: the email agent says it has none.
- **D4** needs extending to whichever agent Roselyn has seen quoting the old prices. The guard exists for email only.
- **D1 and D3** need nothing new: one is already AI, the other stays with Taiwo.

## Roselyn's role as she performs it

From Roselyn's own description [R]:

1. A lead comes in and is classified **warm or cold**, then urged to schedule a meeting with Roselyn.
2. Roselyn **calls warm leads first** to find out whether they are truly warm or cold.
3. On the call she **explains the course and pricing** and finds out whether the lead wants to enroll.
4. Once a lead wants to enroll, she **walks them through enrolling and setup on Zoom**.
5. Some people use the **self-service material** and set up on their own.

Further points from the same conversation [R]:
- **Enrolled means paid.**
- A step-by-step enrollment guide already exists, but **many people still need Zoom help**. Some won't or can't share their screen. This is the part that takes the most time.
- **Old leads are being lost.** Cold and not-interested leads need a recorded reason.
- **AI must not over-pursue a cold lead.** Roselyn called that illegal. Which law applies is **unknown**; it is not in the repository.
- **Text, email and call responses from AI agents** are not aligned with the current program, because the knowledge base is out of date.
- **Cory is reaching out to leads and categorizing them.** Map Cory's functions before building Vick.
- **Most active leads come from word of mouth.** Maybe 2 of every 10 leads enroll.
- **Tools:** GoHighLevel as the CRM, Zoom for enrollment help. Neither appears in the coverage data. [C]

**This differs from the written brief in three places:**
- Her launch brief describes the same job: "You own the sales conversation, enrollment closing, and the customer-facing parts of admissions". [P] `docs/training-program-2026-q3/launch-briefs/18-roselen-sales.md:3`
- That brief names **Stripe** for checkout (`:37`), but the platform's payment code is `backend/src/services/paysimpleService.ts`. [P] Which is current is **unknown**.
- That brief names **CCPP** as the CRM (`:49`), but Roselyn named GoHighLevel. [R] Which is current is **unknown**.

**Who "Cory" is in her notes is unknown.** The platform has a voice agent called **Cora**, with separate prompts for warm and cold leads. [P] `docs/synthflow-warm-lead-prompt.md:3-4`; `docs/synthflow-cold-lead-prompt.md:4` "Cory" may mean Cora, or the Cory assistant. Mapping that is the first step Roselyn asked for.

## Responsibilities: stays human, transitions, or splits

| # | Responsibility | Today | Decision | Reason | Source |
|---|---|---|---|---|---|
| 1 | Classifying a new lead as warm, cold or not interested | An AI agent ("Cory"), then confirmed by Roselyn's call | **Splits** | The agent can sort leads from their activity, but only the call (row 3) confirms "truly warm". | [R] steps 1-2; [P] capability `sales.pipeline_stage_and_lead_temperature_stewardship` |
| 2 | Asking the lead to book a meeting | Unknown who sends it | **Splits** | The agent can draft the message. No agent may send email: `live_email` is denied by default. | [R] step 1; [P] `backend/src/services/delivery/execution/executionPolicy.ts:33-42` |
| 3 | The qualifying call | Roselyn | **Stays human** | A judgement made in conversation, and the step that confirms row 1. | [R] step 2 |
| 4 | Explaining the course and pricing | Roselyn, on the call | **Splits** | The agent can keep one current sheet of program facts and prices; Roselyn delivers them. Today four copies of the price disagree. | [R] step 3; [C] row `sales.prospect_question_answering_from_approved_kb`, `blocked_by` |
| 5 | Answering prospects' written questions from the knowledge base | Roselyn is the named owner of 9 knowledge-base answers | **Transitions** (answers drawn only from the approved knowledge base) | The answers are already written down and marked "automation_potential: High" on 8 of the 9 (the ninth is "Medium"). It can't go live until the pricing in row 4 is fixed. | [P] `backend/src/seeds/seedKbData.ts:165-279` (9 entries with `primary_person_id` Roselen) |
| 6 | Discounts, payment plans, refunds | Ali approves | **Stays human** | Money commitments. "Don't promise discounts beyond the Founding Cohort price without checking." | [P] `18-roselen-sales.md:69-70`; [C] `blocked_by`: "No agent may charge, refund, discount…" |
| 7 | The lead's decision to enroll | Roselyn, on the call | **Stays human** | A person's decision, reached in conversation. | [R] step 3 |
| 8 | Recording why a lead did not convert | Roselyn marks it in the CRM | **Splits** | The agent proposes a reason from the conversation record; Roselyn confirms it. The list of reasons does not exist yet. | [P] `18-roselen-sales.md:49`; [R] "old leads are being lost" |
| 9 | Zoom help with enrolling and setup | Roselyn | **Splits** | The session stays human, because people need live help the guide doesn't give. The agent can record which guide step people get stuck on and brief Roselyn before each session. | [R] step 4 and follow-up |
| 10 | Self-service setup, and confirming payment | The lead; payment confirmation is automated | **Splits** | The agent can flag anyone who agreed to enroll but hasn't paid. Roselyn decides the follow-up. Roselyn doesn't process payments. | [R] step 5, "enrolled means paid"; [P] `18-roselen-sales.md:42` |
| 11 | Sales material (one-pagers, objection handling) | An AI assistant drafts; Roselyn directs and approves; Sohail and Ali approve copy | **Splits** (already working this way) | Approval stays human. | [P] `18-roselen-sales.md:51-57, 69` |
| 12 | Recurring enrollment, subscription and revenue reports | **Taiwo, not Roselyn** | **Not Roselyn's.** Ownership is unknown. | This is the nearest thing to Data Analyst work, and the source gives it to Taiwo. | [P] `docs/training-program-2026-q3/launch-briefs/16-taiwo-admissions.md:3, 46-53` |

Rows 10 and 12 also cover work that isn't Roselyn's (payment processing, and reporting). They're kept here so nobody mistakes that work for hers.

## Where each split falls

| # | Agent's side | Roselyn's side |
|---|---|---|
| 1 | Proposes warm, cold or not interested, with the signal it used | Confirms or overturns it on the call |
| 2 | Drafts the "book a meeting" message | Sends it, or the existing sender does |
| 4 | Keeps one sheet of current course details, dates and prices, once one price is agreed | Agrees which price is correct, and delivers it on the call |
| 8 | Proposes a reason from a fixed list | Confirms the reason, and owns the list |
| 9 | Records the sticking step after each session; briefs Roselyn before the next one; suggests guide changes | Runs the session; approves any change to the guide |
| 10 | Flags "agreed to enroll, not paid" | Decides whether and how to follow up |
| 11 | Drafts material | Directs and approves, with Sohail and Ali |

## Evidence that would show the agent is ready

These are the tests for each responsibility the agent would hold, in whole or in part. **No pass mark is set here.** Roselyn sets each one, because a figure chosen by me would be invented. Each test would run with the agent's output compared to Roselyn's and nothing sent ("shadow mode").

| # | The agent holds | Evidence of readiness |
|---|---|---|
| 1 | Proposing lead temperature | Over a set of real leads, the agent's warm/cold/not-interested proposals match what Roselyn concluded on the call, at a rate Roselyn accepts. Disagreements are reviewed one by one. |
| 2 | Drafting the meeting request | Roselyn sends drafts unchanged, or with only small edits, for a run of leads she chooses. No draft quotes the Data Analytics program. |
| 4 | Keeping the program sheet | One price source is agreed and recorded. The sheet matches it, and every date on the sheet matches the current cohort. |
| 5 | Answering from the knowledge base | Every answer traces to an approved knowledge-base entry. Refund questions are routed to a person, because the refund terms are still a draft ([C] `blocked_by`, `salesHubCoryController.ts:33`). Zero answers quote an old price. |
| 8 | Proposing a non-conversion reason | The reason list exists, and the agent's proposed reasons match Roselyn's at a rate she accepts. |
| 9 | Tracking sticking points | For a run of sessions, the agent's recorded step matches what Roselyn says happened, and its pre-session brief names the right step. |
| 10 | Flagging unpaid enrollments | Every lead Roselyn knows agreed but hasn't paid appears on the list, and nobody who has paid does. |

None of these tests can run until **Vick has tools granted** (0 today) and **Roselyn can log in** to review. [C]

## What stays human, and why

| Responsibility | Why it's reserved |
|---|---|
| The qualifying call (row 3) | It's how "truly warm" gets decided, and the agent's lead sorting (row 1) is checked against it. |
| The lead's decision to enroll (row 7) | A person's decision, made with a person. |
| Discounts, payment plans and refunds (row 6) | Money commitments. Ali approves, and no agent may charge, refund or discount. [P] `18-roselen-sales.md:70`; [C] |
| Sending any message to a lead (rows 2 and 9) | `live_email` is denied by default, and Roselyn says AI must not over-pursue cold leads. [P] `executionPolicy.ts:37`; [R] |
| Running the Zoom session (row 9) | People need live help that the existing guide doesn't give. [R] |
| Approving sales material and the program sheet (rows 4 and 11) | Positioning and price are approved by people: Roselyn, Sohail and Ali. [P] `18-roselen-sales.md:69` |
| Setting every pass mark above | Readiness is Roselyn's call, so a number set by anyone else would be invented. |

## What doesn't exist, and what would have to be written

### 1. Sales and enrollment report duty list

**Who writes it:** Roselyn and Taiwo together, because the source assigns reporting to Taiwo. Ali confirms ownership, because he set the scope of this work. [P] `16-taiwo-admissions.md:3`; `18-roselen-sales.md:89`

**Suggested outline**, one entry per recurring report:
1. Report name, and what question it answers.
2. Who does it today, and roughly how long it takes.
3. Data source: a named table, screen or export, or "unsourced".
4. Recipient, how often, timezone and channel. These are the five dimensions `REPORTING_MAP.md:15` says no object combines today.
5. Stays human, transitions or splits, with the reason.
6. Who approves it before it goes out.

**Where to start:** Taiwo's brief already lists four recurring reports. [P] `16-taiwo-admissions.md:48-53`
- Daily enrollment dashboard
- Weekly cohort progress
- Monthly subscription and MRR trends
- End-of-cohort retrospective

Whether these are still produced, and by whom, is **unknown**.

### 2. Confirmation of what "DA" meant

**Who:** Ali, as author of the requirement.

**What's needed:** one line saying whether "DA responsibilities transitioning to AI" means a Data Analyst role or the Data Analytics bootcamp.

### 3. Reasons a lead didn't convert

**Who:** Roselyn.

**What's needed:** a fixed list, with an example of each. Row 8 can't be tested without it.

## Unknowns

- Whether "DA" in the requirement means Data Analyst or Data Analytics. Cory agrees it appears to mean Data Analytics; the author has not confirmed.
- Who owns DA admissions now: the directive names Shveta, the mockup names Roselyn.
- Who in "the admissions team" answers the bootcamp emails Cora flags (D2).
- What is in the legacy Cora operating sheet (D5).
- Who "Cory" is in Roselyn's notes: Cora (the voice agent), the Cory assistant, or both.
- Whether checkout is on Stripe or PaySimple today, and whether the CRM is CCPP or GoHighLevel.
- Whether Taiwo still produces the four reports.
- Which law limits contact with cold leads.
- Whether scheduling, SMS or GoHighLevel are connected to the platform at all. I found no evidence in the coverage data. [C]
- Every pass mark in "Evidence that would show the agent is ready".
