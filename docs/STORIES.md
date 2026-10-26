# sales — Stories

38 stories across 3 releases, walking-skeleton first:
the earliest release proves the thinnest end-to-end path including the trust
spine, and later releases stack features on top of something already working.

## Before the releases — start here

- **[STORY-000](stories/STORY-000.md)** — Build your Command Center

The first thing you build, on day one, before any part of the system itself. It is
the page you keep open for the rest of the programme and demo from. It belongs to no
release and fulfils none of your requirements, because it is the window onto your
system rather than a part of it.

## r0 · Discovery and validation — weeks 0–0

**Goal:** Deliver every r0 story for sales.
**Done when you can show:** The r0 documents exist in the repository and their acceptance criteria are met.

- **[sales.RESEARCH-1-SYSTEM-CLASSES](stories/sales.RESEARCH-1-SYSTEM-CLASSES.md)** — Compare the five system classes, and place this domain among them
- **[sales.RESEARCH-2-AGENT-ANATOMY](stories/sales.RESEARCH-2-AGENT-ANATOMY.md)** — Map the nine anatomy elements onto this domain's agent
- **[sales.RESEARCH-3-ROLE-AND-DA-TRANSITION](stories/sales.RESEARCH-3-ROLE-AND-DA-TRANSITION.md)** — Document Roselyn's role, and which DA responsibilities transition
- **[sales.RESEARCH-4-MANAGER-INTERVIEW](stories/sales.RESEARCH-4-MANAGER-INTERVIEW.md)** — Prepare a 30-minute interview with Roselyn and propose a weekly check-in
- **[sales.RESEARCH-5-THREE-PROPOSED-TASKS](stories/sales.RESEARCH-5-THREE-PROPOSED-TASKS.md)** — Capture three proposed agent tasks with boundaries and completion evidence

## r1 · Legacy migration plan — weeks 0–0

**Goal:** Deliver every r1 story for sales.
**Done when you can show:** The r1 documents exist in the repository and their acceptance criteria are met.

- **[sales.LEGACY-MIGRATION-PLAN](stories/sales.LEGACY-MIGRATION-PLAN.md)** — Legacy migration plan

## r2 · r2 — weeks 0–0

**Goal:** Deliver every r2 story for sales.
**Done when you can show:** The r2 documents exist in the repository and their acceptance criteria are met.

- **[sales.CAP.abandoned_checkout_identification](stories/sales.CAP.abandoned_checkout_identification.md)** — Abandoned-checkout identification, separated from free signups and ex-members
- **[sales.CAP.app_originated_payment_reconciliation](stories/sales.CAP.app_originated_payment_reconciliation.md)** — App-originated payment reconciliation after a missed webhook
- **[sales.CAP.billing_health_watch](stories/sales.CAP.billing_health_watch.md)** — Billing health watch: duplicates, lapses, expiring cards, schedules against the book
- **[sales.CAP.comped_seat_grant_and_revocation](stories/sales.CAP.comped_seat_grant_and_revocation.md)** — Comped seat grant and revocation
- **[sales.CAP.da_revenue_reporting_transition](stories/sales.CAP.da_revenue_reporting_transition.md)** — Data Analyst revenue and enrolment reporting duties transitioning to AI
- **[sales.CAP.enrollment_checkout_link_issuance](stories/sales.CAP.enrollment_checkout_link_issuance.md)** — Enrolment checkout: PaySimple customer, hosted payment link, pending enrolment
- **[sales.CAP.enrollment_completion_follow_through](stories/sales.CAP.enrollment_completion_follow_through.md)** — Enrolment completion follow-through, from checkout started to seat active
- **[sales.CAP.icp_prospect_discovery_and_fit_scoring](stories/sales.CAP.icp_prospect_discovery_and_fit_scoring.md)** — ICP prospect discovery and program-fit scoring
- **[sales.CAP.manager_decision_queue_for_sales_actions](stories/sales.CAP.manager_decision_queue_for_sales_actions.md)** — A decision queue the accountable manager can actually reach
- **[sales.CAP.offer_pipeline_routing](stories/sales.CAP.offer_pipeline_routing.md)** — Offer pipeline classification for unrouted leads
- **[sales.CAP.outbound_batch_preparation_for_approval](stories/sales.CAP.outbound_batch_preparation_for_approval.md)** — Outbound enrolment batch prepared for human approval
- **[sales.CAP.outbound_sequence_health_watch](stories/sales.CAP.outbound_sequence_health_watch.md)** — Outbound sequence health watch: detect and propose
- **[sales.CAP.payment_confirmation_and_seat_grant](stories/sales.CAP.payment_confirmation_and_seat_grant.md)** — Payment webhook confirmation, seat grant and portal access
- **[sales.CAP.payment_handoff_integrity](stories/sales.CAP.payment_handoff_integrity.md)** — Payment-handoff integrity across the hosted-page boundary
- **[sales.CAP.payment_webhook_replay_dedup_watch](stories/sales.CAP.payment_webhook_replay_dedup_watch.md)** — Payment webhook replay and delivery-dedup gap watch
- **[sales.CAP.pipeline_digest_for_manager](stories/sales.CAP.pipeline_digest_for_manager.md)** — Sales pipeline digest for the accountable manager
- **[sales.CAP.pipeline_stage_and_lead_temperature_stewardship](stories/sales.CAP.pipeline_stage_and_lead_temperature_stewardship.md)** — Pipeline stage, lead temperature and forecast stewardship
- **[sales.CAP.price_statement_consistency_audit](stories/sales.CAP.price_statement_consistency_audit.md)** — Price-statement consistency audit across every surface that quotes a price
- **[sales.CAP.prospect_outreach_draft_for_human_send](stories/sales.CAP.prospect_outreach_draft_for_human_send.md)** — Prospect outreach and sales material drafted for a human to send
- **[sales.CAP.prospect_question_answering_from_approved_kb](stories/sales.CAP.prospect_question_answering_from_approved_kb.md)** — Grounded answers to prospect questions from the approved sales knowledge base
- **[sales.CAP.quote_and_offer_packet_preparation](stories/sales.CAP.quote_and_offer_packet_preparation.md)** — Quote and offer packet preparation for a human to price and send
- **[sales.CAP.refund_and_void_issuance](stories/sales.CAP.refund_and_void_issuance.md)** — Refund and void issuance against a settled or unsettled payment
- **[sales.CAP.renewal_and_revenue_follow_through_worklist](stories/sales.CAP.renewal_and_revenue_follow_through_worklist.md)** — Renewal and revenue follow-through worklist
- **[sales.CAP.renewal_reminder_lifecycle](stories/sales.CAP.renewal_reminder_lifecycle.md)** — Renewal reminder and autopay-disclosure lifecycle
- **[sales.CAP.revenue_and_subscription_reporting](stories/sales.CAP.revenue_and_subscription_reporting.md)** — Collected revenue, MRR, ARR, plan mix and tenure reporting
- **[sales.CAP.revenue_definition_integrity_guard](stories/sales.CAP.revenue_definition_integrity_guard.md)** — Revenue-definition integrity guard: app-originated checkout only
- **[sales.CAP.seat_capacity_and_cohort_fill_forecast](stories/sales.CAP.seat_capacity_and_cohort_fill_forecast.md)** — Seat capacity and cohort fill forecast
- **[sales.CAP.strategy_call_no_show_detection_and_recovery](stories/sales.CAP.strategy_call_no_show_detection_and_recovery.md)** — Strategy-call no-show detection and recovery queue
- **[sales.CAP.subscription_cancellation_and_schedule_suspension](stories/sales.CAP.subscription_cancellation_and_schedule_suspension.md)** — Subscription cancellation and recurring-schedule suspension
- **[sales.CAP.subscription_checkout_and_plan_activation](stories/sales.CAP.subscription_checkout_and_plan_activation.md)** — Membership subscription checkout and plan activation
- **[sales.CAP.subscription_churn_and_renewal_risk_analysis](stories/sales.CAP.subscription_churn_and_renewal_risk_analysis.md)** — Subscription churn and renewal-risk analysis
- **[sales.CAP.team_license_and_sponsored_seat_administration](stories/sales.CAP.team_license_and_sponsored_seat_administration.md)** — Team-license and sponsored-seat administration
