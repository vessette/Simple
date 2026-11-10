# Offer routing: what happens after a lead is scored, and what Roselyn needs to decide

**Capability:** `sales.offer_pipeline_routing` · **For:** Roselyn · **Status:** findings and questions only. Nothing has been changed.

All citations are to `ColaberryEnterprise_AI_LeadershipAccelerator` at commit `949fe19`, under `backend/src/`.

## What routing does on the platform today

The capability describes routing as "write a label". On the platform it does more:

1. **Scoring sets the offer, and the offer starts outreach.** `classifyAndRouteLead()` writes the score, the qualification level and the offer onto the lead. It then **enrolls the lead into that offer's campaign** (`services/offerRouterService.ts:27-52`).

2. **Warm or cold is decided by one thing.** A lead counts as warm only if it has an advisory session or an advisory source (`offerRouterService.ts:37-38`). Every other lead goes to the cold map, where Accelerator means the **`cold_outbound`** campaign (`:14-15`).
   - The agent also picks up leads with only a described idea or a maturity score (`services/agents/offerRoutingAgent.ts:24-28`).
   - So an inbound lead who filled in the idea form, but never had an advisory session, can be enrolled in cold outbound.

3. **Outreach feeds the score that chose the outreach.** Opens, clicks and replies are 10% of the score (`services/offerScoringService.ts:56-65`, `:74`). The score sets the qualification level, and the advisory rule needs "qualification not low" (`:117`).

4. **Every lead with an advisory session is re-scored, oldest first.** The comment says 7 days, but the query only orders by `updated_at`, up to 20 a run, every 6 hours (`offerRoutingAgent.ts:54-68`). So engaging with a campaign can change a lead's offer, and a changed offer enrolls the lead into a **second** campaign.
   - Enrollment skips a lead only if it is already in *that* campaign (`services/campaignService.ts:458-463`).
   - I found no step that removes the lead from the first one.

5. **A re-score overwrites whatever offer is there**, with errors swallowed (`offerRoutingAgent.ts:64-67`; `offerRouterService.ts:28-33`). The lead record has no field saying who set the offer (`models/Lead.ts`: `recommended_offer`, line 129, but no "routed by"). **So the platform cannot tell a person's routing from its own.** The capability's rule "never overwrite a human routing" can't be enforced until that field exists.

6. **The re-score query has no unsubscribe filter.** The first query excludes `status = 'unsubscribed'` (`offerRoutingAgent.ts:29`); the re-score query (`:55-62`) does not. Whether the send step blocks an unsubscribed lead is **unknown**: no check appears in `enrollLeadsInCampaign()` (`campaignService.ts:430-490`), and I didn't trace the sender.

7. **A failed engagement lookup reads as zero engagement** (`offerScoringService.ts:65`, `catch { /* non-blocking */ }`), which lowers the score without saying so.

## What Roselyn needs to decide

Each decision lists the realistic options, what each one does, and its risk.

**What is not known:** the effect on engagement or conversion. Nothing in the repository measures how routing changes conversion, so no figure is given. Where a measurement would show it, it is named.

### 1. Should routing only label a lead, or also enroll it?

| Option | What happens | Risk |
|---|---|---|
| **A. Label only** | The offer is written; a person decides whether and when to enroll. The routing capability stays reversible and contacts nobody, which is what its R6 ceiling assumes. | Slower first contact, and someone has to work the routed list. Leads can sit labelled but uncontacted. |
| **B. Label and enroll** (today) | Routing starts outreach at once (`offerRouterService.ts:35-52`). | A wrong label becomes a wrong message to a real person. It's prospect contact, so `live_email` is needed, which is denied by default. An enrolled lead can't be "unrouted" quietly. |

**What would show the effect:** the Apollo checks 5 and 6 (enrollments, and messages sent by channel), rerun per offer. **Unknown today.**

### 2. What makes a lead warm rather than cold?

| Option | What happens | Risk |
|---|---|---|
| **A. Advisory session only** (today) | Anyone without one goes to the cold map. Accelerator means `cold_outbound` (`:37-38`, `:14-15`). | An inbound lead who filled in the idea form gets cold outreach, which goes against her rule on chasing cold leads. |
| **B. Any inbound action counts as warm** (form, idea, maturity check) | Inbound leads get warm campaigns. | A stale or one-off signal keeps someone "warm" for good, unless a time limit is added. |
| **C. Her own list of warm signals, with a time limit** | Matches how she sorts leads on her calls. | Needs her list. It becomes a rule cited like T1 to T3. |

### 3. Should engaging with outreach be allowed to change a lead's offer?

| Option | What happens | Risk |
|---|---|---|
| **A. Yes** (today, 10% of the score) | Opens and clicks can lift a lead into advisory. | The outreach moves the score that chose it: a loop, and opens are a weak signal. |
| **B. No: routing uses only what the lead told us** | The offer is stable and explainable from the lead's own data. | Real interest shown by replying is ignored, unless replies are handled separately. |
| **C. Replies count; opens and clicks don't** | Keeps the strongest signal. | Needs a change to the scoring rule, and a test. |

### 4. Once a lead has an offer, may a re-score change it?

| Option | What happens | Risk |
|---|---|---|
| **A. Yes, automatically** (today) | The offer follows the data. | Offers change with no person involved, a person's routing is overwritten (finding 5), and leads end up in two campaigns. |
| **B. Never after the first routing** | Stable, and simple to explain. | A lead who matures stays on the wrong offer until a person notices. |
| **C. A re-score can only *propose* a change, for her to accept** | Matches the capability's R6 (a supervised queue). | Adds items to her queue. **She can't act on any until she has an admin login.** |

### 5. When an offer changes, should the lead leave the old campaign?

| Option | What happens | Risk |
|---|---|---|
| **A. Yes: a move step** | One campaign per lead. | A move is itself an outreach change, so it needs its own approval. |
| **B. No** (today) | Nothing to build. | Two campaigns sending to the same person at once. |

### 6. Should an unsubscribed lead ever be re-scored or re-enrolled?

The only safe answer is no. The decision here is to **confirm it**, and to ask someone to check whether the send step already blocks them (**unknown**).

**Risk if left as is:** the re-score query includes unsubscribed leads (`offerRoutingAgent.ts:55-62`). If the sender doesn't block them, they could be contacted again.

### 7. What makes a lead an Accelerator lead?

| Option | What happens | Risk |
|---|---|---|
| **A. Write a rule** (T4) | Accelerator placements become explainable and testable. | Needs her definition. |
| **B. Keep it as the fallback** (today) | No work. | Every lead nobody understood gets Accelerator. The explainer will keep answering "cannot place" for those. |

### 8. When enterprise and advisory both match, which wins?

| Option | What happens | Risk |
|---|---|---|
| **A. Enterprise wins** (today, by order) | Large organisations go to enterprise. | It's exactly what the capability's exception rules out: picking the larger offer. |
| **B. Advisory wins** | The lead is offered the smaller starting step first. | A large deal may start too small. |
| **C. Neither: list it for her** | She decides each one. | More items in her queue. |

### A build item, not a decision

Questions 1, 4 and 5 can only be enforced once the lead records **who routed it**. That field doesn't exist (`models/Lead.ts`). It goes to whoever owns the lead model.
