# Recommendation: record why each free seat was granted, and who approved it

**For:** Roselyn (sales owner) and Ali (approver). **Date:** 12 November 2026.
**Detail:** [COMP_AUDIT_PROPOSAL.md](COMP_AUDIT_PROPOSAL.md) (the full design) and [AUDIT_LOG_REVIEW.md](AUDIT_LOG_REVIEW.md) (what's logged today).

## The gap

The platform logs which admin granted a free seat and when. It doesn't record why, or who approved it, and Roselyn can't see the log at all. A free seat is a 100% discount that never expires, so these gaps make it hard to check a grant afterwards.

## Recommendation

**1. Every grant and revoke asks for a reason and an approver, and is refused without them.** The admin fills in three things in a confirmation step:
- **Category:** staff, partner, or agreed exception.
- **Reason:** one sentence, specific enough to review later.
- **Approved by:** who agreed to it.

The platform saves these with the grant, plus who made the change, when, and whether the person was already paying. If the record can't be saved, the grant doesn't happen.

**2. Approval: record it now, enforce it later.** For now the admin names the approver, and Vick flags any grant where the admin approved their own. Once Vick's manager decision queue exists, a grant would need an approved request first.

**3. Roselyn sees every grant and revoke in two steps:**
- **Now, with no platform change:** Vick adds a "free seats since the last digest" section to Roselyn's pipeline digest (how often it runs is still her choice). It lists who was granted or revoked a seat, by whom, approved by whom, and why. Someone with database access exports the log rows, and Vick reports from them; Vick can't reach the database itself. Until reasons are captured, every reason reads "not recorded", and the list itself shows the size of the gap.
- **Once step 1 is built:** a free-seats panel on the Revenue page, next to the free-seat count it already shows. Only the revenue, admin and owner roles can open that page (`mgmtRoles.ts:78-86`). Whether Roselyn's login can reach it is unconfirmed.

**4. One small fix first.** If a grant fails, the admin isn't told today. Fixing that needs no decision.

## What I need from you

| # | Decision | Who |
|---|---|---|
| 1 | Agree that a grant requires a category, a reason and an approver. Are those three categories the right ones? | Roselyn and Ali |
| 2 | Who approves a free seat? Is approving your own grant acceptable for now? | Ali |
| 3 | Can someone export free-seat log rows for each digest? Should Roselyn's login reach the Revenue page? | Ali, with Kes |

Building steps 1, 3 (the panel) and 4 is a platform change for Kes. Vick's part, the digest section and the flags, is small and waits only on decision 3.
