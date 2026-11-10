# Legacy migration plan: Sales, Enrollment & Subscriptions

**Story:** `sales.LEGACY-MIGRATION-PLAN` · **Release:** Legacy migration plan
**Accountable human:** Roselyn · **Prepared by:** Victoria Spencer-Auber · **Date:** 2026-11-10
**Status:** a plan for Roselyn to review. Nothing has been switched off, deleted or changed. Every step below needs a named person's decision first.

Citations are to `ColaberryIntern/ColaberryEnterprise_AI_LeadershipAccelerator` at commit `949fe19` (11:36 AM CST on 2026-11-10). Paths starting `services/` are under `backend/src/`. The dispositions come from the story brief and `services/agentDomain/capabilities/sales.json` (`legacy_dispositions`, line 3646). They were checked, not redone.

---

## Summary

| Disposition | Count | What happens |
|---|---|---|
| Migrated to a capability | 5 | Keep running unchanged; the capability record takes ownership |
| Superseded | 6 | The safe half carries into a successor capability; the unsafe half is switched off once the successor exists |
| Retired | 1 | Already disabled on every boot; needs Roselyn's confirmation, then removal from the schedule |
| Unknown | 4 | Unchanged until one named question is answered by a named person |
| **Total** | **16** | |

This plan covers all 16 records whose proposed owner is this domain (`docs/architecture/ai-workforce-management/LEGACY_AGENT_CLASSIFICATION.csv`: 16 of 246 rows).

---

## Disposition table

The "Registry line" column is where the record sits today in `services/agentRegistrySeed.ts`. Most of the brief's line numbers are out of date (see [What the brief gets wrong](#what-the-brief-gets-wrong)).

| # | Legacy record | Registry line | Category | Disposition | Successor capability | Carries over / does not |
|---|---|---|---|---|---|---|
| 1 | `ApolloLeadIntelligenceAgent` | `:567` | outbound | **Migrated** | `sales.icp_prospect_discovery_and_fit_scoring` | Discovery and fit scoring, with recommendations held for admin approval |
| 2 | `CampaignHealthScanner` | `:420` | ai_ops | **Migrated** | `sales.outbound_sequence_health_watch` | Health scanning, as the detection half of the watch |
| 3 | `EmailDigest` | `:327` | outbound | **Migrated** (sales slice only) | `sales.pipeline_digest_for_manager` | The sales part of the digest; the generic admin digest stays with the platform |
| 4 | `NoShowDetector` | `:195` | outbound | **Migrated** | `sales.strategy_call_no_show_detection_and_recovery` | Detecting no-shows 30+ minutes late |
| 5 | `OfferRoutingAgent` | `:2311` | outbound | **Migrated** | `sales.offer_pipeline_routing` | Classifying unrouted leads into pipelines |
| 6 | `ApolloWeeklyEnrollmentAgent` | `:583` | outbound | **Superseded** | `sales.outbound_batch_preparation_for_approval` | Selection carries over. **Auto-approving and enrolling leads into cold outbound with no named human does not.** |
| 7 | `AutonomousRampEvaluator` | `:545` | outbound | **Superseded** | none (by design) | Advancing a campaign's ramp on a health score alone does not carry over; a health score promotes nothing |
| 8 | `CampaignQAAgent` | `:534` | ai_ops | **Superseded** | `sales.outbound_sequence_health_watch` | Detecting a broken channel carries over. Creating test leads and sending on live channels does not. |
| 9 | `CampaignRepairAgent` | `:431` | ai_ops | **Superseded** | `sales.outbound_sequence_health_watch` | Detection carries over. Auto-retrying sends and auto-resolving old errors does not. |
| 10 | `CampaignSelfHealingAgent` | `:598` | ai_ops | **Superseded** | `sales.outbound_sequence_health_watch` | Detection carries over. Retrying emails and re-triggering SMS and voice (`auto_heal_enabled: true`, `:608`) does not. |
| 11 | `ScheduledActionsProcessor` | `:173` | outbound | **Superseded** (for sales only) | `sales.prospect_outreach_draft_for_human_send` | **The send engine keeps running** as platform infrastructure. What sales gives up is any agent holding the send. |
| 12 | `ContentOptimizationAgent` | `:448` | ai_ops | **Retired** | none | Rewriting queued outbound copy without review. See [Retired](#retired-1). |
| 13 | `CampaignEvolutionEngine` | `:556` | outbound | **Unknown** | none yet | See [Unknown](#the-4-unknown-records) |
| 14 | `CampaignOpsSuperAgent` | `:2231` | dept_super | **Unknown** | none yet | See below |
| 15 | `ConversationOptimizationAgent` | `:467` | ai_ops | **Unknown** | none yet | See below |
| 16 | `MandrillOpenClickPoll` | `:250` | outbound | **Unknown** | none yet | See below |

Source for the dispositions and reasons: `sales.json` `legacy_dispositions` and the story brief.

---

## The 4 unknown records

Each stays **exactly as it is today** until its question is answered.

| Record | The single question that resolves it | Who can answer | Why it's unresolved |
|---|---|---|---|
| `CampaignEvolutionEngine` | Does Marketing own generating and A/B-testing outbound message variants? | **Roselyn and Sohail Syed** (Marketing Intelligence & Brand) | It's outbound content optimisation, whose natural owner is Marketing (brief) |
| `CampaignOpsSuperAgent` | Who owns the Campaign Operations department report, now that its inputs are moving into a sales capability? | **Ali** | Its department is Campaign Operations, not Sales, and that department has no owner here (brief; category `dept_super`, `:2231`) |
| `ConversationOptimizationAgent` | Should reply-rate drop detection become a sales capability, **with the rewriting of its own instructions removed**? | **Roselyn and Sohail Syed** | The rewriting is forbidden either way: an agent may not edit the instructions that govern itself (brief, citing the learner-success charter) |
| `MandrillOpenClickPoll` | Does Marketing or Platform claim email open/click attribution, including its dedup rule `(lead, outcome, subject, day)`? | **Sohail Syed** (Marketing) or **Kes** (Platform). Ali decides if neither claims it. | It's marketing measurement, not selling (brief). Its matching rule fixed 40% of rows being mis-attributed before 2026-09-11 (`:258`), so it must not be lost. |

---

## Retired (1)

**`ContentOptimizationAgent`.** It rewrites queued email subjects and bodies with AI.

Why it's safe to lose:
- It's already **force-disabled on every boot** because "ContentOptimizationAgent overwrites email content with fake lead name — CRITICAL safety issue" (`services/agentRegistrySeed.ts:3434-3440`).
- Nothing carries over: rewriting outbound copy without review isn't a capability anyone is proposing.

What's still live:
- It's **still on the schedule**, every 6 hours (`services/aiOpsScheduler.ts:176`).
- It's still in the registry (`:448`).
- Only the `enabled` check stops it running.

This is the pattern the brief warns about: 28 of 39 "retire" rows elsewhere still held live, reachable code.

**Retiring it properly means:** Roselyn confirms, and then a developer removes its schedule entry and its registry entry. Until then it stays disabled, as it is today.

---

## Citations I verified

| # | Claim in the brief | What I found |
|---|---|---|
| 1 | `ContentOptimizationAgent` is force-disabled on boot (cited `agentRegistrySeed.ts:3203-3207`) | **True**, but the code is now at `:3434-3440` |
| 2 | `CampaignSelfHealingAgent` has `auto_heal_enabled` (cited `:496-510`) | **True**: `auto_heal_enabled: true`, `max_retry_attempts: 3`, now at `:598-610` |
| 3 | `MandrillOpenClickPoll` dedups on `(lead, outcome, subject, day)` after 40% of rows were mis-pinned (cited `:148-160`) | **True**, now at `:250-258` |
| 4 | `ApolloWeeklyEnrollmentAgent` auto-approves and enrols with no named human (cited `:481-495` and `aiOpsScheduler.ts:226`) | **True.** The registry says weekly, up to 300 (`:583-592`); the scheduler runs it Monday to Friday (`aiOpsScheduler.ts:226`) |
| 5 | The 16 rows' categories | **Not as the brief says.** See below. |
| 6 | 16 records belong to this domain | **True**: 16 rows in `LEGACY_AGENT_CLASSIFICATION.csv` |

---

## What the brief gets wrong

1. **Most of its `agentRegistrySeed.ts` line numbers are out of date.** The registry file has changed since discovery. For example:
   - `ApolloWeeklyEnrollmentAgent`: cited `:481-495`, now `:583`
   - `MandrillOpenClickPoll`: cited `:148-160`, now `:250`
   - the `ContentOptimizationAgent` safety block: cited `:3203-3207`, now `:3434-3440`

   The claims still hold at the new locations (above). Line numbers in this plan are current as of `949fe19`.

2. **"The category=outbound heuristic … which every one of these 16 rows shares" is false.** Only 9 of the 16 are `outbound`. 6 are `ai_ops`:
   - `CampaignHealthScanner`
   - `CampaignQAAgent`
   - `CampaignRepairAgent`
   - `CampaignSelfHealingAgent`
   - `ConversationOptimizationAgent`
   - `ContentOptimizationAgent`

   1 is `dept_super` (`CampaignOpsSuperAgent`). The categories were read from each entry in `agentRegistrySeed.ts`.

   So the ownership argument for the 4 unknown rows can't rest on category alone. Two of them are not `outbound` at all.

3. **"Safe to lose" for the retired row is incomplete.** It's still scheduled (`aiOpsScheduler.ts:176`), so retirement isn't finished until the schedule entry is removed (above).

---

## How the migration stays safe to run twice

**Every step sets an end state. None toggles.** Each step is "make sure record X is in state Y", checked before acting, so a second run finds it already done and changes nothing.

1. **Key on the row's database id, not the agent's name.** `agent_name` is not guaranteed unique: one agent was registered twice with two schedules (`services/aiOpsScheduler.ts:142-146`).
2. **Switch off; never delete.**
   - On every boot the registry seed calls `findOrCreate` by `agent_name` (`agentRegistrySeed.ts:3365-3368`). A deleted row would be **recreated**, so deleting isn't stable.
   - The seed's update for existing rows leaves `status` and run state alone (`:3381-3391`), so `enabled: false` survives a reboot.
   - Removing a record for good is a code change that takes it out of the registry list.
3. **Record each step once.** A ledger row keyed on `(row id, step, plan version)` is written before the change. A second run that finds the row skips the step. The ledger doesn't exist yet; it has to be built before any step runs.
4. **The scheduler respects `enabled`.** `runAgent()` checks `AiAgent.enabled` before running (`aiOpsScheduler.ts:280-296`), so switching an agent off takes effect without a redeploy.

**What each disposition means in practice:**

| Disposition | Step | Done twice? |
|---|---|---|
| Migrated | No change to the legacy row. The capability record points at it. | Nothing to repeat |
| Superseded | Once the successor capability is approved, make sure the unsafe half is off (for example `auto_heal_enabled` false, or the agent disabled) | Already off, so no change |
| Retired | Make sure `enabled` is false (already true at boot), then a developer removes the schedule and registry entries | Already off; already removed |
| Unknown | No change | Nothing to repeat |

---

## A record the migration can't classify

This plan doesn't assume every record fits. A record that can't be classified:

1. **is left exactly as it is**: not switched off, not switched on, not deleted;
2. **is recorded as `unknown`** in the ledger, with the question that would resolve it and the person who can answer;
3. **is raised at the weekly check-in** (`docs/discovery/04-manager-interview.md`, section 7);
4. **is never retired by default.** An unexamined row is where useful behaviour gets lost.

That covers two cases:
- **A record that appears later.** A new registry entry that looks like sales work isn't one of the 16, so it gets the steps above and is not slotted into this table.
- **The 21 records with no owner at all** (`LEGACY_AGENT_CLASSIFICATION.csv`, `proposed_owner_domain: unresolved`). They aren't in any domain's plan. Naming them is the action: **Ali** decides who owns them. The brief says five are live production rows. That count can't be checked from the repository, so it is **unknown** here.

---

## Is `ApolloWeeklyEnrollmentAgent` running in production?

**Unknown from the repository.** Here is what the code does settle.

### What does NOT stop it

`executionPolicy.ts` does not apply to this agent.
- Its eight denied capabilities, including `live_email`, govern **delivery execution runs**: the GitHub Actions jobs that build and ship code (`services/delivery/execution/executionPolicy.ts:1-19`).
- They are enforced when such a run is planned (`services/delivery/execution/executionOrchestrator.ts:41`).
- The Apollo agent is a scheduled runtime job. It never imports or calls that module (`services/agents/apolloLeadIntelligenceAgent.ts:1-7`).

**So `live_email` being "default-denied" does not, by itself, stop this agent enrolling leads into an outbound campaign.**

### What does decide whether it runs

| Gate | What the code says | Can I see the production value? |
|---|---|---|
| The `enabled` flag on its `ai_agents` row | The run is skipped if `enabled` is false or `status` is `paused` (`services/agents/agentControlGate.ts:38-44`, called from `services/aiOrchestrator.ts:190-195`). The row defaults to **enabled** (`models/AiAgent.ts:423-427`), and its seed entry sets no `enabled` value (`services/agentRegistrySeed.ts:583-597`). | No |
| An active cold-outbound campaign | With no `cold_outbound` campaign in `active` status, the run records `no_campaign_found` and does nothing (`apolloLeadIntelligenceAgent.ts:104-120`) | No |
| The schedule | Monday to Friday at 14:00 UTC, 9 AM CT (`services/aiOpsScheduler.ts:226`), though the registry still says weekly (`agentRegistrySeed.ts:588`) | Yes |
| How many it enrolls | 300 per run if the seeded config is in place, 20 if the config is empty (`apolloLeadIntelligenceAgent.ts:102`; `agentRegistrySeed.ts:592-595`) | No |

### Checks for someone with production access

All read-only. They're written down so the request is exact and the answers can be filed here. Ask **Ali or Kes**. "Last 30 days" is a suggestion, so use whatever window Roselyn wants.

**Is it running?**

| # | Check | Where | Why |
|---|---|---|---|
| 1 | Its `enabled` flag and `status` | `ai_agents` row for `ApolloWeeklyEnrollmentAgent` | The run gate (`agentControlGate.ts:38-44`) |
| 2 | Its `last_run_at`, and whether recent `AiAgentActivityLog` rows show enrollments or `no_campaign_found` | `ai_agents`; `AiAgentActivityLog` | Shows it ran, not only that it could |
| 3 | Is there a campaign with `type = 'cold_outbound'` and `status = 'active'`? | `campaigns` | Without one it does nothing (`apolloLeadIntelligenceAgent.ts:104-120`) |

**What has the campaign actually done?**

| # | Check | Where | Why |
|---|---|---|---|
| 4 | How many recommendations are `status = 'approved'` with `reviewed_by` empty, in the last 30 days | `lead_recommendations` | The agent approves with no reviewer: it calls `bulkApproveRecommendations(ids, null)` (`apolloLeadIntelligenceAgent.ts:242`), and `reviewed_by` is stored as null (`services/leadIntelligenceService.ts:271-273`). **These rows are the "no named human" approvals, counted.** |
| 5 | How many leads were enrolled into that campaign, in the last 30 days | `campaign_leads` (`enrolled_at`, `campaign_id`) | How many people the auto-approval reached |
| 6 | How many messages that campaign sent, by `channel` (email, SMS, voice), and how many are still queued | `scheduled_emails` (`campaign_id`, `channel`, `status`, `sent_at`) | Whether enrollment turned into real contact, and on which channels |
| 7 | Whether the send engine `ScheduledActionsProcessor` is `enabled` | `ai_agents` | It does the sending (legacy record 11). If it's off, enrolled leads queue but aren't contacted. |
| 8 | Whether any enrolled lead's email matches someone already enrolled in a program | `campaign_leads` against `enrollments` | A current student or former member cold-contacted as a prospect. The same mistake nearly happened on a hand-pulled list (`sales.json`, `sales.abandoned_checkout_identification`). |

**Reading the answers:**
- **1 and 3 both "yes":** it runs every weekday.
- **Check 4 above zero:** it has approved leads with no person.
- **Check 6 shows sent messages:** those people were contacted. That is the evidence Roselyn needs for the step 2 decision below.

Not in the repository, and so not checked: whether an unsubscribed lead can be enrolled. Ask that alongside check 8; it is **unknown** here.


---

## Sequence: what has to be decided first

| Step | Decision | Who | Blocks |
|---|---|---|---|
| 1 | Roselyn gets an admin login | Ali | Every confirmation below. She can't approve anything in the platform today (`services/agentDomain/agentDomainRegistry.ts:188-189`). |
| 2 | **Should `ApolloWeeklyEnrollmentAgent` keep auto-enrolling leads into cold outbound in the meantime?** | Roselyn, with Ali | Nothing else, but it's live behaviour with no human approver. Whether it is running in production is **unknown** from the repository. |
| 3 | Confirm the retirement of `ContentOptimizationAgent` | Roselyn | Removal of its schedule and registry entries |
| 4 | Answer the four ownership questions | Roselyn and Sohail; Ali; Kes | The 4 unknown rows |
| 5 | Build the migration ledger | A developer | Any step that changes a row |
| 6 | Approve each successor capability | Roselyn | Switching off the unsafe half of each of the 6 superseded rows. Until then the legacy rows keep running as today. |

The 5 migrated rows need no step in this sequence. They keep running.

---

## Sources

| Reference | What it shows |
|---|---|
| `services/agentDomain/capabilities/sales.json:3646` | `legacy_dispositions`: all 16 rows |
| `services/agentRegistrySeed.ts:173`, `:195`, `:250`, `:327`, `:420`, `:431`, `:448`, `:467`, `:534`, `:545`, `:556`, `:567`, `:583`, `:598`, `:2231`, `:2311` | Where each of the 16 sits today, and its category |
| `services/agentRegistrySeed.ts:3365-3368`, `:3381-3391`, `:3434-3440` | `findOrCreate` on boot; status preserved; the force-disable |
| `services/aiOpsScheduler.ts:142-146`, `:176`, `:226`, `:280-296` | Name not unique; the retired agent still scheduled; Apollo schedule; the `enabled` gate |
| `docs/architecture/ai-workforce-management/LEGACY_AGENT_CLASSIFICATION.csv` | 246 rows: 16 for this domain, 21 unresolved |
| `services/agentDomain/agentDomainRegistry.ts:188-189` | Roselyn can't reach the approval surface |
| `docs/discovery/04-manager-interview.md` | The proposed weekly check-in |
