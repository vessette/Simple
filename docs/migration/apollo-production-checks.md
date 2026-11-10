# Apollo enrollment agent: production checks

**For:** Ali or Kes, or anyone with read access to the production database
**Asked by:** Victoria Spencer-Auber, for Roselyn (Sales, Enrollment & Subscriptions)
**Background:** `docs/migration/legacy-migration-plan.md`, section "Is `ApolloWeeklyEnrollmentAgent` running in production?"

**Why we're asking:** the code lets this agent approve leads and enroll them into cold outbound every weekday, with no person approving. The repository can't show whether it is actually doing that. These checks can.

**Rules for running them:**
- **Read only.** Every query is a `SELECT`. Please don't switch anything off while checking. Pausing the agent is Roselyn's decision once the answers are in.
- **Counts only.** No names or emails are needed. Check 8 deliberately returns a number.
- **The window is the last 30 days.** Change it if Roselyn asks for a different one.
- The table and column names come from the platform's models at commit `949fe19`. If one doesn't match the live database, note it and skip that check.

---

## Is it running?

- [ ] **1. Is the agent switched on?**
  ```sql
  SELECT id, enabled, status, last_run_at
  FROM ai_agents WHERE agent_name = 'ApolloWeeklyEnrollmentAgent';
  ```
  Answer:

- [ ] **2. What has it done recently?**
  ```sql
  SELECT action, result, COUNT(*), MAX(created_at)
  FROM ai_agent_activity_logs
  WHERE agent_id IN (SELECT id FROM ai_agents WHERE agent_name = 'ApolloWeeklyEnrollmentAgent')
    AND created_at > now() - interval '30 days'
  GROUP BY action, result;
  ```
  Answer:

- [ ] **3. Is there an active cold-outbound campaign?**
  ```sql
  SELECT id, name, status FROM campaigns
  WHERE type = 'cold_outbound' AND status = 'active';
  ```
  Answer:

## What has it done?

- [ ] **4. Leads approved with no person recorded.** The agent approves with `reviewed_by` left empty.
  ```sql
  SELECT COUNT(*) FROM lead_recommendations
  WHERE status = 'approved' AND reviewed_by IS NULL
    AND COALESCE(reviewed_at, created_at) > now() - interval '30 days';
  ```
  Answer:

- [ ] **5. Leads enrolled into cold outbound**
  ```sql
  SELECT COUNT(*) FROM campaign_leads cl
  JOIN campaigns c ON c.id = cl.campaign_id
  WHERE c.type = 'cold_outbound' AND cl.enrolled_at > now() - interval '30 days';
  ```
  Answer:

- [ ] **6. Messages sent or queued, by channel**
  ```sql
  SELECT se.channel, se.status, COUNT(*) FROM scheduled_emails se
  JOIN campaigns c ON c.id = se.campaign_id
  WHERE c.type = 'cold_outbound' AND se.created_at > now() - interval '30 days'
  GROUP BY se.channel, se.status;
  ```
  Answer:

- [ ] **7. Is the send engine switched on?** If it's off, enrolled leads are queued but not contacted.
  ```sql
  SELECT enabled, status, last_run_at FROM ai_agents
  WHERE agent_name = 'ScheduledActionsProcessor';
  ```
  Answer:

- [ ] **8. Enrolled leads who are already in a program** (count only)
  ```sql
  SELECT COUNT(DISTINCT l.id) FROM campaign_leads cl
  JOIN campaigns c ON c.id = cl.campaign_id
  JOIN leads l ON l.id = cl.lead_id
  JOIN enrollments e ON lower(e.email) = lower(l.email)
  WHERE c.type = 'cold_outbound';
  ```
  Answer:

- [ ] **9. Can someone who has unsubscribed be enrolled?** There's no query: I couldn't find how opt-outs are handled in the code. A yes, a no or "unknown" is fine.

  Answer:

---

## What the answers mean

| If… | Then |
|---|---|
| 1 shows `enabled = true`, `status` not `paused`, **and** 3 returns a row | It runs every weekday |
| 4 is above 0 | It has approved leads with no person |
| 6 shows `sent` rows | Those leads were contacted, on the channels listed |
| 7 shows the send engine off | Leads are queued, not contacted |
| 8 is above 0 | Current students or members were enrolled as cold prospects |

**Who decides next:** Roselyn, with Ali, decides whether to pause the agent. That's step 2 of the migration plan's sequence.

**Checked by:** &nbsp;&nbsp;&nbsp;&nbsp; **Date:**
