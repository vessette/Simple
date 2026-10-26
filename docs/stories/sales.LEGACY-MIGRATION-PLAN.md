# sales.LEGACY-MIGRATION-PLAN — Legacy migration plan

Disposition of this domain's 16 inherited legacy agent record(s).

- **migrated_to_capability**: 5
- **superseded**: 6
- **unknown**: 4
- **retired**: 1

### Superseded (6) -- functionality carried forward
- `ApolloWeeklyEnrollmentAgent` -> sales.outbound_batch_preparation_for_approval: Superseded by sales.outbound_batch_preparation_for_approval. The agent auto-approves high-fit recommendations and enrols them into cold outbound with no named human approver (backend/src/services/agentRegistrySeed.ts:481-495, backend/src/services/aiOpsScheduler.ts:226); outbound contact needs live_email, one of the eight default-denied capabilities (executionPolicy.ts:33-42). The selection half survives in sales.icp_prospect_discovery_and_fit_scoring; the auto-approve-and-enrol half becomes an approval packet a named human signs. Note the slice records it as weekly at 300 while the live wiring is Mon-Fri at 20 a day, so its real volume today is unknown.
- `AutonomousRampEvaluator` -> a capability: Superseded by the programme's own per-capability autonomy mapping and evidence-based promotion (execution-contract.md:52-57). This agent advances, holds or pauses a campaign's ramp phase on a health score alone (backend/src/services/agentRegistrySeed.ts:443-453, schedulerService.ts:3227). Under the new model authority is mapped per capability on the namespaced autonomy:R0-R9 ladder with a named human approver and required evidence, and a health score promotes nothing. No sales capability inherits the auto-advance behaviour, and that is the intended outcome rather than a loss.
- `CampaignQAAgent` -> sales.outbound_sequence_health_watch: Superseded by sales.outbound_sequence_health_watch. The agent creates test leads and exercises live email, SMS and voice channels end to end (backend/src/services/agentRegistrySeed.ts:432-442, backend/src/services/aiOpsScheduler.ts:178). Exercising a live channel is prospect-reaching behaviour requiring live_email, which is default-denied, and creating synthetic leads in a production CRM pollutes the same tables the pipeline reports on. The useful part, detecting that a channel is broken, is the detection half of the watch; channel exercise becomes a sandbox-only release step at autonomy:R3 or R4.
- `CampaignRepairAgent` -> sales.outbound_sequence_health_watch: Superseded by sales.outbound_sequence_health_watch. Detecting broken automations and stalled sequences carries over; auto-retrying failed sends up to three times and auto-resolving errors older than seven days does not (backend/src/services/agentRegistrySeed.ts:329-343, backend/src/services/aiOpsScheduler.ts:175). A retry is a send, which needs live_email, and auto-resolving an unfixed error is how a watchdog hides the incident it was built to catch (billing/billingHealthCheck.ts:8-11). Repair becomes detect-and-propose with a human-approved execution step.
- `CampaignSelfHealingAgent` -> sales.outbound_sequence_health_watch: Superseded by sales.outbound_sequence_health_watch. It retries failed emails and re-triggers SMS and voice after a QA failure, then re-tests (backend/src/services/agentRegistrySeed.ts:496-510, backend/src/services/aiOpsScheduler.ts:179). auto_heal_enabled is precisely the authorized-action-class nobody has authorized for this domain, and every action it takes is an outbound send. The failure-detection half is kept; the healing half is replaced by a proposal a human approves.
- `ScheduledActionsProcessor` -> sales.prospect_outreach_draft_for_human_send: Superseded, for this domain only, by sales.prospect_outreach_draft_for_human_send. This is the actual send engine: it processes pending ScheduledEmail records across email, voice and SMS, applies AI content generation at send time and enforces pacing (backend/src/services/agentRegistrySeed.ts:71-81, schedulerService.ts:1740). Sending is live_email, a default-denied capability, so no sales agent may hold it at any autonomy level. The engine itself is not retired and keeps running as deterministic infrastructure; what changes is that the sales agent prepares drafts and a named human, or this existing engine under human direction, performs the send.

### Retired (1) -- and why each is safe to lose
- `ContentOptimizationAgent`: Retired, confirming the slice's own classification. It detects low-engagement campaigns and rewrites pending email subjects and bodies with AI at up to ten rewrites per run (backend/src/services/agentRegistrySeed.ts:346-364, backend/src/services/aiOpsScheduler.ts:176). It is force-disabled on every boot as a safety measure because it overwrites email content with a fake lead name, with the explicit note that it must use suggestion-only mode (backend/src/services/agentRegistrySeed.ts:3203-3207). Auto-rewriting queued outbound copy without review is not a capability this domain will hold at any autonomy level, so it is not revived and nothing inherits it. Note the slice cites backend/src/services/agentRegistrySeed.ts:3033-3036 for the force-disable; in the current worktree that block is at :3203-3207, so the slice's line numbers have drifted.

**A `retire` marking is not self-justifying.** Across three domains in this programme, 28 of 39 rows marked `retire` turned out to hold live, reachable code. Each retirement above states why, and each needs the manager's confirmation.

### Unresolved (4) -- what would settle each
- `CampaignEvolutionEngine`: Cross-domain ownership unresolved. Generating AI message variants, A/B scoring, promoting winners and retiring underperformers (backend/src/services/agentRegistrySeed.ts:454-464, schedulerService.ts:3239) is outbound content optimisation, whose natural owner is Marketing Intelligence and Brand (domain seq 3). The slice routed it here on the category=outbound heuristic alone, which every one of these 16 rows shares. Recorded explicitly so the behaviour is not silently dropped between two matrices; the owner must be settled between Roselyn and Sohail Syed before it is claimed anywhere.
- `CampaignOpsSuperAgent`: Cross-domain ownership unresolved. It aggregates the four campaign-ops agents into a department report for Campaign Operations (backend/src/services/agentRegistrySeed.ts:2129-2139, backend/src/services/aiOpsScheduler.ts:347), and its department is Campaign Operations rather than Sales. Its three constituent inputs are re-scoped into sales.outbound_sequence_health_watch, but the department-level aggregation itself has no sales owner. Recorded rather than dropped; needs cross-domain reconciliation.
- `ConversationOptimizationAgent`: Cross-domain ownership unresolved, and a second objection stands independently. It detects step-level reply-rate dropoffs and then rewrites the AI instructions used for future sends (backend/src/services/agentRegistrySeed.ts:365-378, backend/src/services/aiOpsScheduler.ts:177). The dropoff detection could sit in sales, but self-editing the instructions that govern its own future output is exactly what the charter precedent forbids an agent from doing to itself (employees/learner-success/ROLE_CHARTER_v2.md:36-37, an agent cannot approve its own memory, charter or KPI changes). Recorded rather than dropped; owner and the self-edit question both need deciding before it is claimed.
- `MandrillOpenClickPoll`: Cross-domain ownership unresolved. It is engagement-attribution infrastructure: it polls Mandrill for campaign-tagged mail and attributes each open and click to the sent email whose subject matches, deduplicating on (lead, outcome, subject, day), after 40 percent of rows were mis-pinned before 2026-09-11 (backend/src/services/agentRegistrySeed.ts:148-160, schedulerService.ts:2422). That is marketing measurement rather than selling. Recorded here so its hard-won dedup and subject-matching contract is not lost between matrices; it must be claimed by the marketing or platform domain, not quietly retired.

These are recorded as `unknown` rather than guessed. "No useful legacy functionality is silently lost" is the rule, and an unexamined row is exactly where loss hides.

### Not covered by this plan
The 21 legacy records whose `proposed_owner_domain` is `unresolved` belong to no domain and are therefore not in any project's plan. Five of them are live production rows. They need an owner decision, and naming that here is the point.

**Release:** r1 · Legacy migration plan (weeks 0–0)
**Owner:** 
**Blocked by:** nothing — you can start this now

## The requirement this satisfies

_No requirement linked._

## How to build it

# Legacy migration plan
**Domain:** Sales, Enrollment & Subscriptions · **Release:** Legacy migration plan · **Story:** `sales.LEGACY-MIGRATION-PLAN`
**Accountable human:** Roselyn · **Deliverable:** `docs/migration/legacy-migration-plan.md`

## What this is

This is Claude Code work, and the product is a written document. There is no feature to ship
and no agent to switch on. The document is the thing your manager reviews, so it is written
to be read by them rather than by you.

## The specification is the brief on this story, not this prompt

Read the brief above this prompt on the story page. It names this domain's real figures, your
accountable human, and the specific blockers discovery already found. **Those numbers are not
repeated here on purpose:** a second copy drifts from the first, and then nobody knows which
is true. Work from the brief; this prompt tells you how to turn it into a document.

## How to build it

- The brief already contains the disposition of every inherited legacy record for this domain, with reasons and `file:line` evidence. **Your job is not to redo that work.** It is to turn it into a plan a manager can act on, and to check it.
- Verify a sample against the repo. Open two or three of the cited `file:line` references with Claude Code and confirm they say what the brief claims. Record which ones you checked.
- Every record marked `unknown` is the real work. For each, say what single question would resolve it and who can answer.

## What the document must contain

- A disposition table: one row per legacy record, its category, and its successor capability where there is one.
- The `unknown` records called out separately, each with the question that resolves it and the person who can answer.
- Which citations you personally verified, and what you found.
- A sequence: what has to be decided first, and what is blocked until it is.
- Anything in the brief you believe is WRONG, with your evidence. Discovery was done at speed and finding an error in it is a better outcome than agreeing with all of it.

Write it as Markdown with real headings. A wall of prose is not a deliverable, and neither is
a bulleted restatement of the brief.

## Evidence this is done

Cite the real thing. For this story that is the committed file `docs/migration/legacy-migration-plan.md`, and inside it,
every claim carrying either a source or the word unknown.

**None of these count:** this story being marked complete, elapsed time, a conversation that
went well, a document that restates the brief without answering it, or a confident sentence
with no source. Your accountable manager evaluates the evidence.

**Unknown is a real answer and is worth more than a guess.** Several of these questions have
no source material in this repository. Writing "the source does not exist, and here is what
would have to be written" is a complete answer, not a failure to find one.

## Before you start

- **The platform source is PUBLIC. You do not need access granted.** Wherever this brief
  cites a file like `backend/src/services/agentRegistrySeed.ts`, it means the Colaberry
  platform repository:
  **https://github.com/ColaberryIntern/ColaberryEnterprise_AI_LeadershipAccelerator**
  Clone it read-only beside your own project and point Claude Code at it. Sarbjit hit this
  within hours of starting and was right to stop rather than invent an answer: a brief that
  cites a path without naming its repository is the brief being wrong, not you.
- **Nothing in this story authorizes an outbound message.** Do not send an invitation, an
  email or a direct message, and do not record a meeting as booked. Arranging anything with a
  person is a human action taken outside this project.
- **Nothing here changes an agent.** Do not enable one, grant it a tool, or raise an autonomy
  level. A capability stays `draft` until your manager has actually reviewed it.
- Your repo may not be connected yet. The prompt works either way; the story cannot be
  verified and no points are awarded until a repo is connected, because verification is a
  read of your repo.

## Failure paths you must handle


## Acceptance — your stop condition

Tick each box as it genuinely passes. This file is yours — the platform reads
the same criteria out of `.colaberry/progress.json`, which Claude Code keeps in
step (see the managed block in CLAUDE.md). Ticking something you have not
actually met only misleads you.

- [ ] The plan accounts for every inherited legacy record for this domain, each one kept, merged or retired with a reason.
- [ ] The migration is described as replayable: running it twice leaves the same end state, with no duplicated side effects.
- [ ] The plan states what happens to a record the migration cannot classify, rather than assuming none exist.

When every box above is ticked, stop and show the demo.
