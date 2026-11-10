# Interview plan: 30 minutes with Roselyn, and a proposed weekly check-in

**Story:** `sales.RESEARCH-4-MANAGER-INTERVIEW` · **Release:** Discovery and validation
**Accountable human:** Roselyn · **Prepared by:** Victoria Spencer-Auber · **Date:** 2026-11-10
**Status:** agenda only. **No meeting is scheduled, and nothing has been sent.** Arranging a time with Roselyn is a person's job, done outside this project.

This plan builds on what Roselyn has already said, so it does not ask those questions again:
- her five steps;
- "enrolled means paid";
- an enrollment guide already exists, but many people still need Zoom help.

Those answers are recorded in `docs/discovery/03-role-and-da-transition.md`. Platform citations are to `ColaberryIntern/ColaberryEnterprise_AI_LeadershipAccelerator` at commit `949fe19`; paths starting `services/` or `models/` are under `backend/src/`.

---

## Agenda (30 minutes)

| # | Section | Minutes | Questions |
|---|---|---|---|
| 1 | Purpose, and what's already recorded | 2 | none |
| 2 | Which capabilities first | 6 | Q1, Q2 |
| 3 | What stays human forever | 6 | Q3, Q4 |
| 4 | What "good" looks like, in numbers | 8 | Q5, Q6, Q7 |
| 5 | What gets switched off immediately | 4 | Q8 |
| 6 | Blocker to raise: Roselyn can't reach the agent | 2 | none |
| 7 | The proposed weekly check-in | 2 | none |
| | **Total** | **30** | 8 questions |

---

## 1. Purpose (2 minutes)

Say:
- All 32 of Vick's capabilities are drafts, and Roselyn has validated none of them (`/agent-domains-mine/sales`: 0 of 32 confirmed).
- This meeting turns some of them into decisions.
- Nothing is switched on as a result. Vick stays disabled with 0 tools granted (`/agent-domains-mine`).

## 2. Which capabilities first (6 minutes)

**Q1.** Of the three tasks that send nothing to leads, which do you want first?
- (a) sorting each new lead as warm, cold or not interested, with a reason;
- (b) a short brief before each warm-lead call;
- (c) flagging anyone who agreed to enroll but hasn't paid.

Source: these are rows 1, 3 and 10 of `03-role-and-da-transition.md`.

**Q2.** Step 1 (sorting new leads) is done by an AI agent today. You called it "Cory". The platform also has a voice agent, Cora, that calls warm and cold leads (`docs/synthflow-warm-lead-prompt.md:3-4`). Which agent should own step 1 from now on: Cory, Cora, Vick, or a split?

Source: Roselyn asked for "no redundant tasks among AI agents" and for Cory to be mapped before Vick is built. There is no agent-to-agent handoff in the platform (`services/agentDomain/agentDomainReleaseLadder.ts:128-142`), so only a person's decision prevents overlap.

## 3. What stays human forever (6 minutes)

**Q3.** The research marks 12 of the 32 capabilities as a human decision at every level, 8 of which move money: refunds, cancellations, comped seats, checkout and seat grants. Is that list right? Is anything missing from it? For example: deciding a lead is "not interested", or offering a payment plan.

Source: `capabilities/sales.json`, `human_decision` (12) and `financial_consequence: moves_money` (8), counted in `01-system-classes.md`, query Q1.

**Q4.** You said an AI must not keep chasing a cold lead, and that doing so is illegal. Which rule or law is that? Who decides when a lead is cold enough to stop contacting?

Source: Roselyn's call notes. The rule itself is **unknown**; it is not in the repository.

## 4. What "good" looks like, in numbers (8 minutes)

**Q5.** Before you trust Vick's warm/cold sorting, how often should it agree with what you find on the call, and over how many leads? (For example: 9 of 10, over 30 leads.)

Source: readiness test row 1 in `03-role-and-da-transition.md`, where the pass mark is left for Roselyn. No evaluation criteria exist in the platform to borrow (`docs/architecture/ai-workforce-management/CURRENT_STATE.md:94`).

**Q6.** When a lead doesn't enroll, which reasons do you want recorded? Name four to six. (For example: timing, price, not a fit, no response, chose another program.)

Source: "old leads are being lost" (call notes). Row 8 of `03-role-and-da-transition.md` can't be tested without this list.

**Q7.** The platform holds four copies of the price, and some still show the Data Analytics program. Which price and which dates are correct for the AI systems program today, and who keeps them current?

Source: `/coverage`, blocker on `sales.prospect_question_answering_from_approved_kb`: "Four separate copies of the price exist".

## 5. What gets switched off immediately (4 minutes)

**Q8.** What would make you want Vick stopped at once? For each one, how would you tell someone?

Examples to prompt with:
- quoting the old Data Analytics price;
- any message reaching a lead without a person approving it;
- contacting a lead marked not interested.

Source: an agent is stopped by setting it to not enabled (`models/AiAgent.ts:331`). Roselyn can't do that herself today (section 6).

## 6. Blocker to raise: Roselyn can't reach the agent (2 minutes)

**Raise this; don't try to fix it in the meeting.**

The platform records:

> manager_has_no_admin_login: Roselyn has an org_members row but no admin_users row, so they cannot open their employee's Agent Detail or Talk surface. Her team is Customer Support, which the ownership map left blank.

Source: `services/agentDomain/agentDomainRegistry.ts:82-84`, `:188-189`.

What it means for her:
- Until this changes, none of her answers can be recorded as approvals in the platform.
- She can't see Vick's work.
- She can't switch Vick off.

Ask only whether she wants the login. Granting it is Ali's decision.

## 7. Proposed weekly check-in (2 minutes)

**This is a proposal. It is not booked.**

| | Proposal |
|---|---|
| **Day** | Tuesday |
| **Duration** | 20 minutes |
| **Time** | Roselyn chooses, within her hours of 9 AM to 5 PM CST, Monday to Friday (`backend/src/seeds/seedKbData.ts:67-68`) |
| **Who arranges it** | A person, outside this project |

**The three things it reviews:**
1. **Decisions waiting on her.** The draft capabilities she has been asked about that week (32 drafts today), each needing a yes, a no or a change.
2. **Vick's work against hers.** Once a shadow test is running, how Vick's proposals compared with her outcomes, measured against the pass marks from Q5. Until then, how far the blockers in section 6 and the tool grants have moved.
3. **Anything that misbehaved.** Any trigger from Q8, what happened, and whether a ceiling or a rule needs to change.

---

## What each answer changes

| Q | If she answers… | The build changes like this | Where it's recorded |
|---|---|---|---|
| Q1 | names a task | That capability's R0 story is written first, and the others wait | `03-role-and-da-transition.md`; the capability's `validation_state` once she can approve it |
| Q2 | names an owner for step 1 | Whichever agent doesn't own it drops that work. Vick keeps sorting only if she says so. | The ownership table in `02-agent-anatomy.md`, element 7 |
| Q3 | confirms, adds or removes items | Each human-only item goes into Vick's role charter `authority_forbidden` list (`models/AgentRoleCharter.ts:88`) | `03-role-and-da-transition.md`, "What stays human" |
| Q4 | names the rule and who decides | That rule becomes a forbidden action in the charter. A lead marked "stop" is never drafted for again. | `02-agent-anatomy.md`, element 8 |
| Q5 | gives a pass mark | The R5 shadow test for lead sorting uses that number, and Vick can't move past R5 on it until the mark is met | `03-role-and-da-transition.md`, readiness row 1 |
| Q6 | lists reasons | Those reasons become the fixed list Vick proposes from. Old leads become searchable by reason. | `03-role-and-da-transition.md`, row 8 |
| Q7 | names the correct price, dates and keeper | One approved program and price sheet replaces the four copies. Nothing that quotes a price leaves draft until it exists. | `02-agent-anatomy.md`, element 3 |
| Q8 | lists triggers | Each trigger becomes a charter boundary, and also the third item of the weekly check-in | `02-agent-anatomy.md`, element 8 |
| Blocker | wants the login | A person asks Ali. Until it's granted, every answer above stays draft in the platform. | Section 6 |
| Check-in | agrees, or changes the day | A person arranges it outside this project | Section 7 |

---

## Roselyn's answers

*Left empty on purpose. Fill in after the interview, with the date it took place.*

**Interview date:**

**Q1 (which first):**

**Q2 (who owns step 1):**

**Q3 (human forever):**

**Q4 (cold-lead rule):**

**Q5 (pass mark for lead sorting):**

**Q6 (reasons for not enrolling):**

**Q7 (correct price and dates, and keeper):**

**Q8 (switch-off triggers):**

**Blocker (wants admin login?):**

**Weekly check-in (day and time agreed?):**

---

## Sources

| Reference | What it shows |
|---|---|
| `docs/discovery/03-role-and-da-transition.md` | Roselyn's five steps, earlier answers, readiness tests with pass marks left open |
| `docs/discovery/02-agent-anatomy.md` | Coordination absent; where safeguards and inputs live |
| `docs/discovery/01-system-classes.md`, query Q1 | 32 capabilities, 12 human-decision, 8 move money |
| `services/agentDomain/agentDomainRegistry.ts:82-84`, `:188-189` | The access blocker |
| `services/agentDomain/agentDomainReleaseLadder.ts:128-142` | No agent-to-agent handoff |
| `models/AiAgent.ts:331` | `enabled`, how an agent is switched off |
| `models/AgentRoleCharter.ts:88` | `authority_forbidden` |
| `backend/src/seeds/seedKbData.ts:67-68` | Roselyn's working hours and timezone |
| `docs/synthflow-warm-lead-prompt.md:3-4` | The Cora voice agent handles warm leads |
| `docs/architecture/ai-workforce-management/CURRENT_STATE.md:94` | No evaluation criteria exist to borrow |
| `/agent-domains-mine`, `/agent-domains-mine/sales`, `/coverage` (live, November 2026) | Vick disabled, 0 tools; 0 of 32 confirmed; the four-price blocker |
