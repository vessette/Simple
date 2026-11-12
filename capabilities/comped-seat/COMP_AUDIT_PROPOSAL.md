# Proposal: record who granted each free seat, and why

**For:** Roselyn (sales owner), Ali (approver), and Kes or whoever owns the platform's admin routes.
**Status:** proposal, not built. It changes the platform, which Vick doesn't own, so it needs Ali or Kes to agree before anyone builds it. It answers decision 2 in [COMPS_FOR_ROSELYN.md](COMPS_FOR_ROSELYN.md).
**Platform references:** commit `109820a`.

## What's recorded today

The platform already logs every admin write. The free-seat routes sit behind it (`adminRoutes.ts:164`, `:264`, `:400`). For each successful grant or revoke request, a row goes into `audit_logs` (`auditMiddleware.ts:56-92`):

| Recorded | What it holds for a free seat |
|---|---|
| `admin_user_id` | The admin's id. For a full admin that's an `admin_users` id; for a staff login it's their **enrolment id** (`authMiddleware.ts:18-24`). Nothing in the row says which. |
| `action`, `entity_type`, `entity_id` | `create` or `delete` on `enrollments`, with the enrolment id. A revoke reads like an enrolment was deleted. |
| `new_values` | The request body. The grant asks for nothing, so it's empty. |
| `old_values` | Always empty. |
| `ip_address`, `created_at` | Where from, and when. |

So **who granted a seat and when are recorded today, but why is not.** The entry doesn't say "free seat", and it records nothing of the person's state before the grant. That matters because a grant overwrites the amount they'd paid with $0 (`subscriptionService.ts:602`). If the log write fails, the error is printed to the console and the grant still goes through (`auditMiddleware.ts:85-87`).

## The proposal: three changes

### 1. The grant asks for a reason, and refuses without one

The grant and revoke routes would accept a body, checked before anything changes (this repo's rule for incoming requests):

| Field | Rule |
|---|---|
| `category` | One of `staff`, `partner`, `agreed_exception`. The business outcome names these three. |
| `reason` | Required, 10 to 500 characters. A sentence a person could review later. |
| `approved_by` | Required: who approved it, if not the admin making the change. |

A grant missing any of these gets a `400` and nothing changes. Revoking would require a `reason` too. Even this change alone would put the reason into today's audit row, because that row already stores the request body.

### 2. A confirmation step before the grant

The admin page would show a dialog before calling the route. It would show:
- the person's name and enrolment;
- **any paid plan they're on**, with a warning (decision 1);
- any earlier free seats, and when they were revoked.

The admin picks a category, writes a reason and names the approver, then confirms. The dialog is there for the person; **the check in step 1 is the real control.** Anything that calls the route directly still has to provide a reason.

### 3. A named audit entry, written with the grant or not at all

The grant service would write its own entry to `audit_logs`, inside the same database transaction as the grant. If the entry can't be written, the grant is rolled back and the admin sees an error. The existing middleware entry stays as it is.

```json
{
  "action": "comp_granted",
  "entity_type": "subscription",
  "entity_id": "<the comp row id>",
  "admin_user_id": "<the admin's id>",
  "old_values": {
    "payment_status": "paid",
    "amount_paid": 1788,
    "active_paid_plans": [{ "id": "<row id>", "plan": "annual" }]
  },
  "new_values": {
    "enrollment_id": "<id>",
    "category": "partner",
    "reason": "Guest instructor for the January cohort, agreed with Ali",
    "approved_by": "Ali",
    "actor": { "kind": "admin_user", "id": "<id>", "email": "<admin email>" }
  },
  "created_at": "2026-11-12T22:40:00Z"
}
```

- **Actions:**
  - `comp_granted` for a new seat.
  - `comp_grant_reused` when the person already has an active free seat (today's grant reuses it silently, `subscriptionService.ts:652-653`).
  - `comp_revoked`.
  - `comp_revoke_noop` when there was nothing to revoke (today that still answers success).
- **`old_values`** keeps what the grant overwrites: payment status, the amount paid and any paid plan. So "was this person paying?" can always be answered afterwards.
- **`actor`** names the kind of login, so the id can be read correctly, and keeps the email.
- **Times** are stored in UTC, as the column requires. Anything a person reads shows Central time.

The `audit_logs` table already has every column this needs. `action` takes up to 50 characters, and the values go in its JSON fields. **No new table and no schema change.**

## Approval: two options

| | Option A: name the approver (recommended now) | Option B: request, then approve |
|---|---|---|
| How | The admin records who approved. The log keeps it. | Someone files a request; only an approved request can be granted. |
| Strength | A record, not a control: an admin could name someone who never agreed. | A real control: no approval, no grant. |
| Cost | Small: the three changes above. | Needs a decision queue. Vick's planned manager decision queue is that task. |

**I'd recommend A now, and B when the decision queue exists.** Under A, Vick would flag any grant where the approver and the admin are the same person, so self-approval is visible rather than hidden.

## What Vick would do with it

Once the entries exist and a person passes them in, Vick's report would show, for each seat:
- who granted it, who approved it, the category and the reason;
- whether the person was paying at the time.

"Why" stops being unknown. Vick would also flag:
- **seats with no matching entry:** every seat granted before the change, plus any granted some other way;
- **self-approved grants.**

Vick still never grants or revokes a seat.

**Seats that already exist won't get a reason by themselves.** Vick would list them, so Roselyn can record a reason for each or decide to revoke it.

## Failure modes

| If... | Then |
|---|---|
| A field is missing or too short | `400`; nothing changes. |
| The audit entry can't be written | The grant is rolled back; the admin sees an error and can retry. |
| An admin double-clicks Grant | **Today** the check for an existing seat and the creation aren't in one transaction, so two seats could be created. In the proposal, the transaction locks the person's rows, so the second click finds the first seat and logs `comp_grant_reused`. A database rule allowing one active free seat per person would make this certain, but that **is** a schema change, so it's offered separately for Kes. |
| The approver is the admin making the change | Allowed under option A; Vick flags it. |

The change would ship with tests:
- a grant without a reason is refused;
- a grant writes exactly one `comp_granted` entry;
- a failed entry rolls the grant back;
- a second grant logs `comp_grant_reused` and creates no new row;
- a revoke with nothing to revoke logs `comp_revoke_noop`;
- a staff login's actor is recorded as a staff enrolment.

## What this doesn't settle

- **Decision 1:** what happens to the paid plan when someone already paying is given a free seat. The log would make that visible, but it doesn't set the rule.
- **Decision 3:** how the revenue page counts a revoked seat.

## Questions for Roselyn and Ali

1. Option A now, B later?
2. Are `staff`, `partner` and `agreed_exception` the right categories?
3. Should a revoke require a reason too? (Proposed: yes.)
4. Is self-approval acceptable under option A, or should the route refuse it?
