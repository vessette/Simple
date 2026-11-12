# Citation sample review: unlabelled sales citations

**What this is.** A hand review of a seeded random sample of the 256 unlabelled citations in the platform's sales capability file (the ones `scripts/checkCitations.mjs` cannot check). The sample list is in [06-citation-check-sales.md](06-citation-check-sales.md) and can be redrawn with `--sample 50 --seed 20261111`.

**How each was judged.** I read the sentence the citation supports in the capability file and the cited lines at platform commit `109820a`. Results: **correct** if the lines show what the sentence says, **wrong** if they don't (with where the code actually is, when found), **unclear** if the sentence is too vague to tell. One reviewer, reviewed once. A second reviewer would make this stronger.

## Result

| | Sample rows (n = 50) | Distinct citations (n = 33) |
|---|---|---|
| Correct | 29 | 22 |
| Wrong | 19 | 9 |
| Unclear | 2 | 2 |

**Estimate for the 256:** 38% wrong, 95% interval 26% to 52%. That is about **97 wrong citations, somewhere between 67 and 133**. Counting the unclear ones as wrong gives 29% to 56%.

The row figure is the estimate, because the sample was drawn over rows. The distinct figure is lower (9 of 33) because two wrong citations are repeated across almost every capability. It isn't a separate random sample, so it has no interval here.

## What it shows

1. **Unlabelled citations are wrong more often than labelled ones.** 21 of 100 labelled citations were wrong; here it is 19 of 50. The labelled rate could not have been reused.
2. **Two citations account for most of it.** `agentDomainRegistry.ts:158-170` is unlabelled in all 32 capabilities and `mgmtRoles.ts:54` in 31. Both are wrong at `109820a`. That is 63 of the 256 rows, known wrong without sampling, and fixing those two strings fixes all 63.

   **A tighter estimate splits them out.** Of the 38 sampled rows that are not those two, 7 are wrong (9% to 33%). Applied to the other 193 rows, that is about 36 more (17 to 64), so **about 99 wrong in total, between 80 and 127**. The two estimates agree.

   **Is the sample representative?** On the one thing that can be checked against the whole set, yes: the two repeated citations are 12 of 50 sampled rows (24%) and 63 of 256 overall (25%). The draw was also spread across all 32 capabilities in proportion to size, by design.
3. **The cause is mostly drift.** Where I could find the intended code, it sits a few lines away (`webhookController.ts:54` is now `:57`, `paysimpleService.ts:399` is now `:404`) or one function away (`schedulerService.ts:2335`). The checkout and cancellation route citations point at code unrelated to subscriptions.

## Every sampled row

| # | Capability | Citation | Result | Note |
|---|---|---|---|---|
| 1 | abandoned_checkout_identification | `backend/src/services/agentDomain/agentDomainRegistry.ts:158-170` | wrong | Lines are a comment about another manager's login; Roselyn's entry is at :187-189 |
| 2 | app_originated_payment_reconciliation | `backend/src/services/paymentReconciliationService.ts:193-212 (the email and customer-id sweep variant)` | unclear | Lines span the end of the email match and the start of reconcilePayment; the sweep itself is at :258 |
| 3 | app_originated_payment_reconciliation | `backend/src/routes/admin/settingsRoutes.ts:33` | correct | The reconcile route |
| 4 | billing_health_watch | `backend/src/services/schedulerService.ts:2301-2302` | unclear | Lines raise the webhook-health alert, cited under the billing watch; may or may not be the intended job |
| 5 | comped_seat_grant_and_revocation | `subscriptionService.ts:338` | correct | startCheckout, which rejects the comp plan |
| 6 | comped_seat_grant_and_revocation | `backend/src/services/agentDomain/agentDomainRegistry.ts:158-170` | wrong | Lines are a comment about another manager's login; Roselyn's entry is at :187-189 |
| 7 | da_revenue_reporting_transition | `backend/src/services/agentDomain/agentDomainRegistry.ts:158-170` | wrong | Lines are a comment about another manager's login; Roselyn's entry is at :187-189 |
| 8 | enrollment_checkout_link_issuance | `backend/src/services/delivery/execution/executionPolicy.ts:33-42` | correct | DENIED_CAPABILITIES list |
| 9 | enrollment_checkout_link_issuance | `paysimpleService.ts:399` | wrong | The 4500 default is at :404 |
| 10 | enrollment_completion_follow_through | `generateLaunchTasks.js:66` | correct | Roselyn not yet on Basecamp |
| 11 | enrollment_completion_follow_through | `backend/src/services/access/mgmtRoles.ts:54` | wrong | Line is 'agents' in SECTION_KEYS; the revenue role is at :17-20 |
| 12 | icp_prospect_discovery_and_fit_scoring | `backend/src/services/access/mgmtRoles.ts:54` | wrong | Line is 'agents' in SECTION_KEYS; the revenue role is at :17-20 |
| 13 | manager_decision_queue_for_sales_actions | `backend/src/services/agentDomain/agentDomainRegistry.ts:158-170` | wrong | Lines are a comment about another manager's login; Roselyn's entry is at :187-189 |
| 14 | offer_pipeline_routing | `backend/src/services/access/mgmtRoles.ts:54` | wrong | Line is 'agents' in SECTION_KEYS; the revenue role is at :17-20 |
| 15 | outbound_batch_preparation_for_approval | `aiOpsScheduler.ts:226` | correct | Daily Mon-Fri, 20 a day |
| 16 | outbound_sequence_health_watch | `backend/src/services/aiOpsScheduler.ts:175` | correct | Campaign repair agent schedule |
| 17 | outbound_sequence_health_watch | `backend/src/services/aiOpsScheduler.ts:174` | correct | Campaign health scan schedule |
| 18 | payment_confirmation_and_seat_grant | `webhookController.ts:54` | wrong | event_id is logged at :57 |
| 19 | payment_confirmation_and_seat_grant | `enrollmentService.ts:183` | wrong | Line is about retiring an Explorer row; markEnrollmentFailed is at :239 |
| 20 | payment_handoff_integrity | `backend/src/services/agentDomain/agentDomainRegistry.ts:158-170` | wrong | Lines are a comment about another manager's login; Roselyn's entry is at :187-189 |
| 21 | payment_handoff_integrity | `backend/src/services/appPaymentReconcileService.ts:22-28 (customer 43728423 at checkout, charge on 43728431 minted four minutes later; three students unlinked, one locked out two days)` | correct | The checkout-window note |
| 22 | payment_webhook_replay_dedup_watch | `backend/src/services/delivery/execution/executionPolicy.ts:33-42` | correct | DENIED_CAPABILITIES list |
| 23 | payment_webhook_replay_dedup_watch | `backend/src/services/paysimpleWebhookHealth.ts:21-121 (rolling window, severity 9 critical and severity 6 warning)` | correct | Rolling window and thresholds |
| 24 | pipeline_digest_for_manager | `backend/src/services/adminOs/metricRegistry.ts:181-188` | correct | Net revenue unavailable |
| 25 | pipeline_digest_for_manager | `backend/src/routes/admin/settingsRoutes.ts:38` | correct | Digest test route |
| 26 | pipeline_stage_and_lead_temperature_stewardship | `backend/src/controllers/adminLeadController.ts:496-544 (temperature history and update)` | correct | Temperature handlers |
| 27 | pipeline_stage_and_lead_temperature_stewardship | `backend/src/services/agentDomain/agentDomainRegistry.ts:158-170` | wrong | Lines are a comment about another manager's login; Roselyn's entry is at :187-189 |
| 28 | price_statement_consistency_audit | `backend/src/seeds/seedKbData.ts:216 (prices as merge tags in the KB answer template)` | correct | Start of the pricing KB entry |
| 29 | price_statement_consistency_audit | `docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16` | correct | Roselyn's row |
| 30 | prospect_outreach_draft_for_human_send | `backend/src/services/agentDomain/agentDomainRegistry.ts:158-170` | wrong | Lines are a comment about another manager's login; Roselyn's entry is at :187-189 |
| 31 | prospect_question_answering_from_approved_kb | `docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16` | correct | Roselyn's row |
| 32 | prospect_question_answering_from_approved_kb | `backend/src/services/delivery/execution/executionPolicy.ts:33-42` | correct | DENIED_CAPABILITIES list |
| 33 | quote_and_offer_packet_preparation | `docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16` | correct | Roselyn's row |
| 34 | quote_and_offer_packet_preparation | `backend/src/services/delivery/execution/executionPolicy.ts:33-42` | correct | DENIED_CAPABILITIES list |
| 35 | refund_and_void_issuance | `backend/src/controllers/salesHubCoryController.ts:33` | correct | Terms pending approval |
| 36 | refund_and_void_issuance | `backend/src/services/access/mgmtRoles.ts:54` | wrong | Line is 'agents' in SECTION_KEYS; the revenue role is at :17-20 |
| 37 | renewal_and_revenue_follow_through_worklist | `docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16` | correct | Roselyn's row |
| 38 | renewal_and_revenue_follow_through_worklist | `CLAUDE_CODE_AI_EMPLOYEE_CONSOLIDATION_LOOP_PROMPT.md:106` | correct | Roselyn's domain row |
| 39 | renewal_reminder_lifecycle | `backend/src/services/renewal/renewalReminderEmail.ts:139-174` | correct | renewalSubject |
| 40 | revenue_and_subscription_reporting | `docs/architecture/ai-workforce-management/HUMAN_OWNERSHIP_MAP.md:16` | correct | Roselyn's row |
| 41 | revenue_and_subscription_reporting | `backend/src/services/revenuePaymentsService.ts:172-187 (collected = memberships + deposits; net = collected - refunds)` | correct | The summary arithmetic |
| 42 | revenue_definition_integrity_guard | `backend/src/services/marketingAnalyticsService.ts:6-33 (the enrolments x 4500 figure removed, with the reasoning)` | correct | The removal note |
| 43 | seat_capacity_and_cohort_fill_forecast | `backend/src/services/access/mgmtRoles.ts:54` | wrong | Line is 'agents' in SECTION_KEYS; the revenue role is at :17-20 |
| 44 | strategy_call_no_show_detection_and_recovery | `backend/src/services/schedulerService.ts:2335` | wrong | Now the renewal-reminder flag; the no-show detector was at this line on 2026-10-09 |
| 45 | subscription_cancellation_and_schedule_suspension | `backend/src/routes/participantRoutes.ts:437` | wrong | A guest-pass comment; the cancel route is at :461 |
| 46 | subscription_checkout_and_plan_activation | `backend/src/controllers/participantController.ts:105-133` | wrong | The points handler, not checkout |
| 47 | subscription_checkout_and_plan_activation | `backend/src/routes/participantRoutes.ts:434-437` | wrong | Presenter and guest routes, not subscription routes |
| 48 | subscription_churn_and_renewal_risk_analysis | `backend/src/services/renewal/renewalReminderSelection.ts:76-92 (lapse follow-up windows)` | correct | LAPSE_FOLLOWUP_DAYS |
| 49 | team_license_and_sponsored_seat_administration | `backend/src/controllers/sponsorController.ts:307-327 (sponsor link and verify)` | correct | handleRequestSponsorLink |
| 50 | team_license_and_sponsored_seat_administration | `backend/src/routes/leadRoutes.ts:79 (sponsor inquiry)` | correct | Sponsor inquiry route |
