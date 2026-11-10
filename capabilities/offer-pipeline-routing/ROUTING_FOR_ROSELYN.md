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

| # | Question | Why it matters | What it changes |
|---|---|---|---|
| 1 | Should routing a lead **only label it**, or also enroll it in a campaign? | Today the label is the outreach (finding 1) | If label only, the R6 pilot is a label queue. If it also enrolls, that is prospect contact, which needs `live_email` (denied by default). |
| 2 | What makes a lead **warm** rather than cold? Is an advisory session the only signal? | An idea-form lead can land in cold outbound (finding 2), against her rule on chasing cold leads | The warm/cold rule becomes part of the taxonomy and is cited like T1 to T3 |
| 3 | Should engaging with outreach be allowed to **raise a lead's score or change its offer**? | The score feeds on the outreach it chose (finding 3) | Engagement is removed from the routing score, or kept and labelled |
| 4 | Once a lead has an offer, may a re-score **change** it? How often? | Offers can change with no person involved, and leads can end up in two campaigns (findings 4 and 5) | A changed offer becomes a proposal for her to accept |
| 5 | When an offer changes, should the lead **leave the old campaign**? | Nothing removes it today (finding 4) | An explicit move step, with its own approval |
| 6 | Confirm that an **unsubscribed lead is never re-scored or re-enrolled**, and ask someone to check the send step | The re-score query doesn't exclude them (finding 6) | A filter, and a test that pins it |
| 7 | What makes a lead an **Accelerator** lead? | It has no rule of its own; it's only the fallback (see the PR) | A T4 rule, or Accelerator stays "cannot place" |
| 8 | When **enterprise and advisory** both match, which wins, or does the lead stay unrouted? | The platform settles it by order; the explainer says "cannot place" | One sentence in the taxonomy |

Questions 1 and 4 also need a **"routed by" field** on the lead before any answer can be enforced (finding 5). That's a build item, not her decision. It goes to whoever owns the lead model.
