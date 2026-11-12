# Review: does the existing audit log make free-seat grants accountable?

**For:** Roselyn (sales owner) and Ali (approver), with Kes for the platform side.
**Status:** review, read from the platform code at commit `109820a`. This is what the code does. I haven't looked at the production table, so how many rows exist and whether any are missing is unchecked.
**Short answer:** partly. The log can show that *some* admin made a grant request, and when. It can't show why, who approved it, or whether it took effect. And the person accountable for free seats, Roselyn, has no way to see it.

## How a grant gets recorded

1. An admin clicks **Free Access** on a person's history panel. It's a one-click toggle with no confirmation, and the request carries no body (`PersonHistoryDrawer.tsx:101-106`). The community members page does the same (`communityAdminApi.ts:75-86`).
2. The request reaches the admin router. The audit step is the first thing registered on that router (`adminRoutes.ts:164`), so it covers the accelerator routes (`:264`) and the community member routes (`:400`).
3. The route checks the admin login (`requireAdmin`) and grants the seat.
4. **After the response has gone back,** the audit step writes one row to `audit_logs` if the status was a success (`auditMiddleware.ts:71-89`). Nothing waits for that write. If it fails, the error is printed to the console and that's all (`:85-87`).

## What each field gives you

| Field | What it holds for a free-seat grant | Good enough for accountability? |
|---|---|---|
| `admin_user_id` | The admin's id: an `admin_users` id for a full admin, but an **enrolment id** for a staff login (`authMiddleware.ts:18-24`). | **Partly.** It can be traced to a person, but only by checking both tables, because the row doesn't say which kind of id it is. The admin's email isn't saved. |
| `created_at` | When the row was written, just after the grant. | **Yes.** |
| `action` | `create` for a grant, `delete` for a revoke. | **No.** A revoke reads like an enrolment was deleted. |
| `entity_type`, `entity_id` | From the accelerator page: `enrollments` and the enrolment id. From the community page: `members` and the **community member id**. | **Partly.** The same event is filed two ways. Finding every grant for one person means searching under both ids. |
| `new_values` | The request body, which is empty. | **No.** There's no reason, category or approver. |
| `old_values` | Always empty (`auditMiddleware.ts:82`). | **No.** Nothing shows the person was paying before the grant set their amount paid to $0. |
| `ip_address` | Cloudflare's address, not the admin's (`authFailureLog.ts:21-27`). | **No.** |

## Accountability questions, answered from the log today

| Question | Answerable? |
|---|---|
| Which admin granted this seat? | **Partly:** an id that has to be traced, and only if the log write succeeded. |
| When? | **Yes.** |
| To whom? | **Yes,** but under one of two ids. |
| Why? | **No.** |
| Who approved it? | **No.** |
| Did the grant actually take effect? | **Not reliably.** A revoke with nothing to revoke still answers success and is logged as a `delete` (`acceleratorRoutes.ts:101-109`). A failed grant isn't logged at all, which is fine; but on the page the admin isn't told it failed either, because the error is silently swallowed (`PersonHistoryDrawer.tsx:108-110`). |
| Was the person already paying? | **No.** |
| Can Roselyn see any of this? | **No.** Nothing in the platform lists audit entries. The only code that reads the table counts the rows and fetches the newest one for a system status panel (`managementService.ts:20-35`). Seeing who granted a seat takes direct database access. |
| Is the record complete? | **Not guaranteed:** the write is fire-and-forget, after the response. |
| How long is it kept? | **No policy.** No code deletes from the table, so rows stay unless someone removes them by hand. |

## Does it fit what this project needs?

The story asks for **the granting admin's identity** as an input, and **an explicit revocation**. The log gets partway on the first and doesn't support the second well:
- **Identity** is there, but only as an id of an unstated kind, it isn't guaranteed to be written, and nobody can see it without database access.
- **Revocation** is logged as an enrolment deletion, even when nothing was revoked.
- **The reason** behind a discount, which is what makes a free seat reviewable, isn't captured anywhere.

For Vick, nothing changes until someone can read these rows: Vick can't reach the production database.

## Enhancements, in order of value

The first three are in [COMP_AUDIT_PROPOSAL.md](COMP_AUDIT_PROPOSAL.md). The last four come from this review and have been added to it.

1. **Require a category, a reason and the approver** on grant and revoke. Refuse the request without them. *(Proposal change 1.)*
2. **A confirmation dialog** instead of a one-click toggle. *(Change 2.)*
3. **A named entry written with the grant, or not at all.** It records what happened, the actor's kind, id and email, and the person's state before the grant. *(Change 3.)*
4. **Tell the admin when a grant or revoke fails.** Today the page swallows the error. That's a defect under this repo's own rules, and the smallest fix of all.
5. **Make the entries readable** by the people accountable for them: a filtered view of free-seat entries for Roselyn, or rows a person exports for Vick to report on. Without this, the rest only helps someone with database access.
6. **Record the real caller's address** using the platform's existing `describeCaller` helper (`authFailureLog.ts:39`), which reads the forwarded header that nginx sets.
7. **State how long audit rows are kept,** even if the answer is "forever".

## Questions for Roselyn and Ali

1. Should Roselyn have a view of free-seat grants and revokes, or should someone export them for Vick to report on?
2. How long should grant records be kept?
3. Is fixing the silent failure on the Free Access button (item 4) something Kes can take now? It's small and doesn't depend on the other decisions.
