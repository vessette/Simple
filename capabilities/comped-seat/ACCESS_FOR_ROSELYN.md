# Roselyn's access, and the question of digest frequency

**For:** Victoria (preparation), then Roselyn (sales owner). **Date:** 12 November 2026.
**Sources:** Ali's update of 10 November ([`docs/discovery/02-agent-anatomy.md:14`](../../docs/discovery/02-agent-anatomy.md)), and the platform code at commit `109820a`. I haven't checked production; Roselyn can confirm in a minute (see below).

## Her access level

Ali confirmed on 10 November that Roselyn holds the **`revenue`** management role. He also added the **`agents`** section for her, which carries Vick's dashboard and review page. She needs to sign out and back in once for it to take effect.

Each role opens a fixed set of admin sections (`mgmtRoles.ts:86`), and the backend enforces it on every request (`mgmtSectionGate.ts`). For her:

| Section | What it covers | Roselyn |
|---|---|---|
| `dashboard` | The admin home page | Yes |
| `revenue` | The Revenue page, refunds, pipeline, opportunities, funnel (`mgmtSectionGate.ts:25-30`) | **Yes**, including the free-seat count |
| `leads` | Leads | Yes |
| `agents` | Vick's dashboard and review page | Yes, added on 10 November |
| `program` | The accelerator and community member admin pages, **where free seats are granted** (`mgmtSectionGate.ts:100`) | **No** |

**So the Revenue page isn't a blocker.** (An earlier draft of the free-seat recommendation called this unconfirmed. It has been corrected.)

Not having `program` is the right way round for free seats. Roselyn can see their effect on revenue but can't grant one herself, which keeps the person who asks for a seat separate from the person who grants it.

**To confirm it in a minute:** Roselyn signs in and opens the Revenue page. If it loads, her role is as recorded. If she gets a "not allowed" error, her role isn't what we think, and Ali is the person to fix it.

## How access is requested and changed

- **No request form exists in the platform.** An admin sets a staff member's role (`PATCH /api/admin/community/members/:memberId/mgmt-role`) or adds sections to it (`.../mgmt-extra-sections`).
- **Nobody can grant access they don't hold themselves** (`mgmtRoleGrant.ts`). In practice, that means a full admin or the owner.
- **The documented route is that Ali approves each manager's access.** That's how Roselyn got the `agents` section on 10 November (`MANAGER_ACCESS_PLAN.md:24-26`, which names Roselyn).
- **So the route is: ask Ali,** saying which section is needed and why.
- **Role changes are recorded** in the same admin audit log as free seats, with the same limits (see [AUDIT_LOG_REVIEW.md](AUDIT_LOG_REVIEW.md)).

The free-seat recommendation needs **no new access** for her. The digest section reaches her through the digest itself, and a future panel on the Revenue page sits in a section she already has.

## Raising digest frequency with her

How often the pipeline digest runs is still open ([`DIGEST_FOR_ROSELYN.md:47`](../pipeline-digest/DIGEST_FOR_ROSELYN.md)). It now carries free seats as well as the pipeline, so it's worth asking once, with both in view. Some points to keep in mind:
- **It's her decision.** The story says changing recipients or frequency is a manager's call.
- **Start from what she'd act on, and how quickly:**
  - The pipeline changes daily. If anything in it needs action the same day, a daily digest fits.
  - Free seats change rarely, and a grant matters when it happens.
- **Give two concrete options rather than an open question.** For example:
  - *Weekly*, Monday at 8 AM Central, with free seats included.
  - *Daily* at 8 AM Central, with free seats only on days something changed.
- **One more thing to settle:** should a new free seat reach her straight away, rather than waiting for the next digest? That's the only part that might not suit a fixed schedule.

A message she could answer in one line:

> Hi Roselyn, a quick one for when you have a minute. Vick's pipeline digest will also list any free seats granted or revoked. How often would you like it: weekly on Monday at 8 AM Central, or daily at 8 AM? And do you want new free seats flagged straight away, or is the digest enough? Also, could you check that the Revenue page opens for you? It should, with the role Ali set up.
