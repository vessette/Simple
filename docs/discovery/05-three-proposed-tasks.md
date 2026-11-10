# Three proposed agent tasks, with boundaries and completion evidence

**Story:** `sales.RESEARCH-5-THREE-PROPOSED-TASKS` · **Release:** Discovery and validation
**Accountable human:** Roselyn · **Prepared by:** Victoria Spencer-Auber · **Date:** 2026-11-10
**Status:** proposals for Roselyn's review. All three capabilities stay `draft`. Nothing here enables Vick, grants a tool or raises a level.

Citations are to `ColaberryIntern/ColaberryEnterprise_AI_LeadershipAccelerator` at commit `949fe19`. Paths starting `services/` are under `backend/src/`. Each task is one of this domain's 32 draft capabilities in `services/agentDomain/capabilities/sales.json`. None is invented.

---

## The three, and why these three

| # | Capability | Why it's chosen |
|---|---|---|
| 1 | `sales.pipeline_stage_and_lead_temperature_stewardship` | Roselyn's step 1 is sorting leads warm or cold, and she says old leads are being lost (`03-role-and-da-transition.md`, rows 1 and 8). |
| 2 | `sales.price_statement_consistency_audit` | Roselyn reports agents quoting the old Data Analytics price. The coverage data records four copies of the price that disagree. |
| 3 | `sales.abandoned_checkout_identification` | "Enrolled means paid" (Roselyn), so the people who started a checkout and didn't pay are the leads closest to enrolling. |

What they have in common:
- **All three only read and propose.** None moves money (`financial_consequence`: `none` or `reports_only`), none contacts a lead, and none is a human-only decision (`human_decision: false`).
- **The order is a proposal.** Roselyn's answer to interview question Q1 (`04-manager-interview.md`) decides which comes first.

**On evidence:** none of the evidence below is a story marked done, time passing, a good conversation, or a mocked test passing. This platform already has 106 approval rows whose only recorded decider is `system:auto_approve_timeout`, a 4.25-hour timer (`services/agentDomain/__tests__/promotionCriteria.test.ts:93-94`). Every piece of evidence below is either something a person checks row by row, or a named test against a real fixture.

**What the rungs mean** (`services/agentDomain/autonomyLadder.ts:58-69`):

| Rung | Meaning |
|---|---|
| R0 | Define the workflow |
| R2 | Answer from approved records |
| R4 | Multi-step sandbox tasks |
| R5 | Shadow mode against approved reference outcomes |
| R6 | A separately approved, supervised production pilot |
| R7 | Automation, with no person approving each action |

All three tasks start at **R0** and have a draft ceiling of **R6**. Until Vick is granted a tool, the `no_tool_grants` rule holds anything above R2 at R2 (`autonomyLadder.ts:207-211`).

---

## Task 1: Lead temperature and pipeline-stage proposals

`sales.pipeline_stage_and_lead_temperature_stewardship` (`sales.json:2297`)

### Evidence it completed correctly

Each is checked by a person or a named test, never inferred from a status:

| Rung | Evidence | Source |
|---|---|---|
| R2 | Every figure Vick states traces to a named endpoint, and the forecast is called a count, never revenue | `release_behaviour` R2 |
| R4 | A named test with a sandbox fixture: a stage a person set is **never** proposed back to its old value, and a lead with no activity is reported **unknown, not cold** | `release_behaviour` R4; `exceptions` |
| R5 | Vick's proposed temperatures, compared lead by lead with what Roselyn found on her call, agree at or above the pass mark she sets (interview Q5) over the number of leads she names | `03-role-and-da-transition.md`, readiness row 1 |
| R6 | Roselyn accepts proposals above a rate she sets, over a window she names. Every rejection is categorised. Written approval is given before the pilot starts. | `release_behaviour` R6 |

The pass mark and the window are **unknown** until Roselyn sets them.

### What the agent does

It reads each lead's stage, temperature and activity, and **proposes** a temperature or stage change, with the reason, into a queue for a person to accept or reject (`workflow`; production permissions).

### Tools and data

- **Data:** lead rows with stage, temperature and activity history, and opportunity scores (`inputs`).
- **Tools:** `query_lead_conversion_metrics`, `query_enrollment_funnel_state`, `assess_enrollment_completion_risk`, `escalate_to_human`.
  - Only `query_lead_conversion_metrics` exists today (`services/reese/agentToolCapabilities.ts:231-234`).
  - `escalate_to_human` exists but routes to curriculum (`:88-94`).
  - The other two don't exist.
- **Not available:** GoHighLevel, Roselyn's CRM. Whether it connects to the platform at all is **unknown**.

### What the agent must NOT do

- Write a stage or temperature itself. In production the agent's permitted actions are **empty**; only a person moves a stage or sets a temperature (`permissions_by_environment.production.agent: []`).
- Move back a stage that a person set.
- Call a lead with no activity "cold". It must say unknown.
- Report the forecast as revenue.
- Contact any lead.

### Approval

- **Roselyn** approves each proposed move, and approves the pilot in writing.
- She can't do either until she has an admin login (`services/agentDomain/agentDomainRegistry.ts:188-189`).

### Starting autonomy and ceiling

- **Start:** R0.
- **Draft ceiling:** R6.
- **Why R6:** stage and temperature are reversible CRM state that move no money and reach no prospect. It stops at R6 because "writing a stage change without review can silently overwrite a human's judgement about a live deal" (`sales.json:2400`).

### Switch it off if

- it moves back a stage a person set;
- it marks a lead with no activity as cold;
- Roselyn's rejections pass her stated limit over a week;
- or any trigger she names in interview Q8 happens.

**Note:** this capability's research cites a hardcoded 4500 in `revenueDashboardService.ts:11` as the forecast's source. That constant has since been removed (`01-system-classes.md`, query Q4). The rule it supports, that the forecast is a count and not revenue, still stands.

---

## Task 2: Price-statement consistency audit

`sales.price_statement_consistency_audit` (`sales.json:3296`)

### Evidence it completed correctly

| Rung | Evidence | Source |
|---|---|---|
| R0 | A written inventory of every place that states a price, reviewed by a person. It must include the known stale fallback **`price_per_enrollment … \|\| 4500` in `services/governanceService.ts:212`**. A planted fake location returns no match. | `release_behaviour` R0 |
| R2 | Vick never states a price it can't trace to the approved source, and reports two disagreeing places as disagreeing rather than averaging them | `release_behaviour` R2 |
| R6 | On every run, the known stale value is found and **zero** archived pages are reported as drift, over a window Roselyn names. Written approval is given before the pilot starts. | `release_behaviour` R6 |

The known stale value is the audit's **positive control**: an audit that doesn't find it is broken, whatever else it reports.

### What the agent does

It lists every place that states or works out a price, compares each with the one approved price, and reports every disagreement with its location. **A person makes every fix** (`workflow`).

### Tools and data

- **Data:** every code, seed, page and static file that states a price, plus the approved price source (`inputs`).
- **Tools:** `detect_price_statement_drift`, `read_plan_catalog`, `create_tickets`, `escalate_to_human`.
  - Only `create_tickets` exists today (`agentToolCapabilities.ts:106-109`).
  - `escalate_to_human` routes to curriculum.
  - The other two don't exist.

### What the agent must NOT do

- **Edit or change any price, anywhere.** "The audit must never edit a price" (`exceptions`), and no agent may change a price (`blocked_by`).
- Decide which price is right. It reports the disagreement; a person decides.
- Report a deliberately historical price on an archived page as drift. The rule for telling live pages from archived ones is **unknown** and has to be written first (`blocked_by`).

### Approval

- **Roselyn** accepts each finding.
- Which price is correct, and each correction, need a named decision-maker. Today that's **unknown**: interview Q7 asks who keeps the price current. Discount and pricing approval sat with Ali in the launch brief (`docs/training-program-2026-q3/launch-briefs/18-roselen-sales.md:69-70`).

### Starting autonomy and ceiling

- **Start:** R0.
- **Draft ceiling:** R6.
- **Why R6:** "The audit only reads and reports, so a supervised production pilot is defensible … Changing a price is explicitly forbidden to the agent, so R7 is prohibited" (`sales.json:3389`).

### Switch it off if

- a run misses the known stale value;
- it reports an archived page as drift;
- or it states any price it can't trace.

**Blocked first by:** one approved price, and the rule for telling live pages from archived ones.

---

## Task 3: Abandoned-checkout list

`sales.abandoned_checkout_identification` (`sales.json:1702`)

### Evidence it completed correctly

| Rung | Evidence | Source |
|---|---|---|
| R2 | Every verdict names the `payment_status` and the latest subscription status, and a paid former member is excluded with the reason | `release_behaviour` R2 |
| R4 | A named test with two fixtures: a free Explorer signup and a paid ex-member **never** appear on the list. Removing either exclusion makes the test **fail**. | `release_behaviour` R4 |
| R6 | **Zero** Explorers and **zero** paid ex-members on the list across a window Roselyn names, checked row by row. Written approval is given before the pilot starts. | `release_behaviour` R6 |

This isn't hypothetical. Two of seven people on a hand-pulled list were paid ex-members who were nearly called as leads (`exceptions`, citing `enrollmentPaymentFilter.ts:11-15`).

### What the agent does

It produces the list of people who started a checkout and didn't pay, excluding paid ex-members and free signups, with the date each checkout started, into a work queue for a person (`workflow`).

### Tools and data

- **Data:** enrollment rows with `payment_status`, plus the latest subscription row for each enrollment (`inputs`).
- **Tools:** `detect_abandoned_checkout`, `query_enrollment_funnel_state`, `escalate_to_human`.
  - None of the first two exists today.
  - `escalate_to_human` routes to curriculum.

### What the agent must NOT do

- **Contact anyone on the list.** That needs `live_email`, which is denied by default (`services/delivery/execution/executionPolicy.ts:33-42`). The ceiling applies to "producing the list and never to working it" (`sales.json:1786`).
- Include a paid ex-member or a free Explorer signup.
- Keep someone on the list after their payment is linked.
- Touch any payment or subscription.

### Approval

**Roselyn** works the list and approves each contact. The contact itself is made by a person (production permissions).

### Starting autonomy and ceiling

- **Start:** R0.
- **Draft ceiling:** R6, for producing the list only.
- **Why:** "Identifying the list is read-only. Contacting anyone on it is prospect contact needing live_email, which is default-denied" (`sales.json:1786`).

### Switch it off if

- a paid ex-member or an Explorer signup appears on the list;
- someone who has paid stays on it;
- or any message reaches a person on the list without a person sending it.

---

## Shared blockers

| Blocker | Affects | Source |
|---|---|---|
| Roselyn has no admin login, so she can't approve anything in the platform | All three | `agentDomainRegistry.ts:82-84`, `:188-189` |
| Vick has 0 tools, and most of the tools needed don't exist | All three | `/agent-domains-mine`; `agentToolCapabilities.ts` |
| No sales-routed `escalate_to_human`; today it creates a curriculum ticket | All three | `agentToolCapabilities.ts:88-94` |
| No pass marks or windows set | All three | `04-manager-interview.md`, Q5 |
| One approved price, and the rule for live versus archived pages | Task 2 | `sales.json` `blocked_by` |

## Sources

| Reference | What it shows |
|---|---|
| `services/agentDomain/capabilities/sales.json:1702`, `:2297`, `:3296` | The three capabilities: inputs, workflow, exceptions, tools, permissions, rung behaviour |
| `sales.json:1786`, `:2400`, `:3389` | The reason for each ceiling (`max_autonomy_rationale`) |
| `services/agentDomain/autonomyLadder.ts:58-69`, `:207-211` | What each rung means; the `no_tool_grants` rule |
| `services/agentDomain/__tests__/promotionCriteria.test.ts:93-94` | 106 approval rows decided by a 4.25-hour timer |
| `services/governanceService.ts:212` | The stale 4500 fallback still in the code |
| `services/reese/agentToolCapabilities.ts:88-94`, `:106-109`, `:231-234` | Which named tools exist, and where `escalate_to_human` routes |
| `services/delivery/execution/executionPolicy.ts:33-42` | `live_email` denied by default |
| `services/agentDomain/agentDomainRegistry.ts:82-84`, `:188-189` | Roselyn can't reach the approval surface |
| `docs/training-program-2026-q3/launch-briefs/18-roselen-sales.md:69-70` | Pricing and discount approvals sat with Ali |
| `docs/discovery/01-system-classes.md`, `03-role-and-da-transition.md`, `04-manager-interview.md` | The removed 4500 constant; Roselyn's steps; the pass-mark question |
