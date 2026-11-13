# Checklist for updating revenue figures, and one way to handle failed lookups

**For:** Roselyn (sales owner), Ali (approver), and whoever holds an admin role with the `system` section (owner, admin or platform). Kes for the code steps.
**Status:** proposal. Platform references are to commit `109820a`. It follows [PLAN_PRICE_CHECK_AND_GOVERNANCE.md](PLAN_PRICE_CHECK_AND_GOVERNANCE.md).

## How the projection price gets into the system

1. **It's stored as one row,** `price_per_enrollment`, in the system settings table.
2. **Anything that projects revenue asks for it** with `getSetting('price_per_enrollment')`. If the row exists, its value is used. If not, the code falls back to a **default of $4,500** written into the code (`settingsService.ts:9`, `:72-76`).
3. **One place adds a second fallback,** `|| 4500`, in case the value can't be read as a number (`governanceService.ts:212`).
4. **Production holds $4,500 in the row** (per the platform's price check, `checkPriceAgreement.js:281-283`). So the row, the default and the fallback all say $4,500.
5. **It's changed on the admin settings page** (`PATCH /api/admin/settings`, `settingsRoutes.ts:37`). That needs an admin login whose role includes the `system` section (`mgmtSectionGate.ts:242`; `mgmtRoles.ts:78-80`, `:138`). Roselyn's `revenue` role can't change it, and shouldn't.
6. **Every change is recorded,** with who made it, the old value and the new one (`settingsService.ts:104-118`).

Every line where $4,500 is set in the code, and a proposal to replace them with one function, are in [DEFAULT_4500_CHANGES.md](DEFAULT_4500_CHANGES.md).

**Fixing the row alone isn't enough.** If the row were ever deleted, or the value couldn't be read, the $4,500 default and fallback in the code would quietly take over again. So the code defaults have to go too.

## Who's involved

| Who | Part |
|---|---|
| **Ali** | Decides the value, and records why. He set the rule on 10 September: labelled, read from the setting, and the $4,500 default changed. |
| **An admin with the `system` section** | Changes the setting on the admin settings page. |
| **Kes** | Removes the $4,500 default and fallback from the code, so an unset value shows "unavailable" rather than $4,500. |
| **Roselyn** | Told before the change, and checks the projections afterwards. She owns the revenue outcome, and her page shows the results. |
| **Vick** | No part in the change. Afterwards, it updates its notes that say production holds $4,500. |

## Checklist 1: changing the projection price

**Before**
- [ ] Ali has decided the value, and the reason is written down. For a subscription the candidates are the first year ($1,788), the first month ($149 or $199), or the average a member pays over their time with us.
- [ ] The decision is recorded where the team keeps decisions: the open escalation (ESCALATION-002) and the revenue write-up.
- [ ] Roselyn knows the change is coming, and roughly how much projected figures will move.
- [ ] Note the current projected figures on the revenue dashboard and the opportunities page, so the change can be checked.

**The change**
- [ ] An admin with the `system` section changes `price_per_enrollment` on the settings page.
- [ ] Confirm the change was recorded with the old value ($4,500), the new value and who made it.

**In the code** (Kes; ideally in the same week)
- [ ] Remove the $4,500 default from `settingsService.ts`. An unset value becomes "unavailable", not a number.
- [ ] Remove the `|| 4500` fallback in `governanceService.ts`.
- [ ] Point the opportunities forecast and the scenario simulator at the setting, and remove them from the price check's frozen list.
- [ ] The price check passes, with no $4,500 left in any service.

**After**
- [ ] Each projection shows the new assumed price beside it ("assumes $X per enrolment, from settings").
- [ ] The projected figures moved by the expected ratio (new price ÷ $4,500), and nothing else changed.
- [ ] Recorded figures (collected, refunds, MRR) didn't move. They never read this setting, so if one moved, something is wrong.
- [ ] Tell Roselyn what changed and when, in Central time.
- [ ] Vick's notes that say "production holds $4,500" are updated.

## Checklist 2: when the membership price itself changes

- [ ] Ali decides the new price, and when it starts.
- [ ] Kes changes `membershipPrice.ts`, the one price file. Everything else reads from it.
- [ ] The price check passes. Today it compares the checkout, what Maya quotes, the knowledge base and the forecast; after the plan in Part B, it also catches typed copies anywhere.
- [ ] The scholarship and any other figure worked out from the price changes with it. After the plan, these are calculated, not typed.
- [ ] Run Checklist 1 for the projection setting at the same time.
- [ ] Decide what existing members pay at their next renewal, and check what the renewal code actually charges before the change goes live. I haven't checked this.
- [ ] Tell Roselyn, and anyone who quotes prices to prospects.
- [ ] Vick's copy of the plan list is refreshed, and its tests are re-run.

## A consistent way to handle failed lookups on the governance page

**Today:** the service behind the page makes 11 lookups (`metricCollector.ts:103-111`, `:186-203`). If one fails, it quietly substitutes zeros, empty lists, or, for the system overview, "healthy". The page can't tell a real zero from a failure.

### Rule 1: every figure has one of four states

| State | Meaning | What the page shows |
|---|---|---|
| **Loaded** | The lookup worked, with a real value | The value. A real zero shows as $0 or 0 |
| **Empty** | The lookup worked, and there's genuinely nothing yet | "None yet", not a blank |
| **Out of date** | The lookup failed, but a last good value is stored | The old value, greyed, with "as of 4:10 PM CST", plus the reason it isn't current |
| **Unavailable** | The lookup failed, and nothing is stored | "Unavailable", with the reason |

### Rule 2: every failure goes in one of five categories

These use the error types the platform's rules already define (TimeoutError, UpstreamUnavailable, RateLimitError, AuthError, ValidationError, ContractViolation), so the log and the page say the same thing.

| Category | Platform error types | Page message | Worth a retry? |
|---|---|---|---|
| **Took too long** | TimeoutError | "This took too long to load." | Yes |
| **Source not responding** | UpstreamUnavailable, RateLimitError | "The source isn't responding right now." | Yes |
| **Not set up** | A missing setting or credential | "This isn't set up yet." For example, the projection price is unset. | No; it needs an admin |
| **Not permitted** | AuthError | "Your login can't see this figure." | No |
| **Data problem** | ValidationError, ContractViolation | "The data didn't look right. The team has been alerted." | No; it needs a fix |

Any other failure is logged with its type and shown as "Source not responding" until it's given a category. It's never shown as zero.

### Rule 3: one summary at the top of the page

The 11 lookups feed these sections:

| Section | Lookups |
|---|---|
| Revenue and enrolments | dashboard stats (`:103`) |
| Leads | lead stats (`:104`) |
| Pipeline | pipeline stats (`:105`) |
| Website | visitor stats (`:106`) |
| Agents | agent KPIs (`:107`) |
| Opportunities | opportunity summary (`:108`) |
| Forecast | forecast projections (`:109`) |
| System health | governance overview (`:110`) |
| Campaigns | campaign metrics, budget, outcomes (`:111`, `:194`, `:203`) |

When everything loads, nothing extra is shown. When something doesn't, a single line at the top says which sections and why:

> **8 of 9 sections loaded.** Unavailable: Revenue and enrolments (took too long). **[Try again]**

- **"Try again"** appears only when at least one failure is worth a retry. It reloads only the failed sections.
- **If system health couldn't be checked,** the status says **"Unknown"**, never "Healthy".

### Rule 4: the same behaviour behind every lookup

- **A time limit, then one retry after a short pause,** then give up and report the category.
- **Log every failure** in the platform's standard format: section, error type, duration, and an ID to trace it.
- **Never hand back a stand-in value.** A lookup returns its value or its failure.

### How we'd know it works

- For each of the 11 lookups, a forced failure shows "unavailable" (or "out of date") with the right category, never 0.
- A real zero still shows as 0.
- A forced failure of the system overview shows "Unknown".
- The summary line names exactly the failed sections. "Try again" reloads only those.
- Every forced failure produces one log line with its error type.

The same four states and five categories could be used on any other admin page, so failures look the same everywhere. The governance page is the place to start because it's the one that currently says "healthy" when it can't tell.
