# Renewal reminders: who gets which, when, and whether it went

**For:** Roselen, who signs off on this capability, and Ali. **Capability:** `sales.renewal_reminder_lifecycle`, first release (autonomy:R2).

## What it does

For any member, Vick says which renewal reminder they're due, on what date in Central time, and whether it was actually sent. It shows the working for every date, so you can check it yourself.

Vick sends nothing. The platform's own daily job does the sending.

## The four reminders

The dates come from the member's period end and the platform's own settings (`renewalReminderSelection.ts:60-61`, `:92`). Each reminder goes out at 9:00 AM Central, when the daily job runs. A member on autopay also gets the autopay notice at 8:30 AM, so it always arrives first.

| Reminder | Date | Example: period ends Mon 23 Nov |
|---|---|---|
| Advance notice | 7 days before | Mon 16 Nov |
| Final notice | 1 day before | Sun 22 Nov |
| After a lapse | 1 day after | Tue 24 Nov |
| Last follow-up | 7 days after | Mon 30 Nov, then nothing more |

Dates are **Central calendar days**, never UTC. A period ending at 9 PM Central on the 29th is the 29th, even though it's already the 30th in UTC. A test checks this, including across the daylight-saving change.

The advance and final windows have some give, as on the platform: a member first seen 5 days out still gets the advance notice. The two after-lapse follow-ups go out on day 1 and day 7 only.

## "Sent" means the record says sent

The platform keeps one record per member, billing period and reminder kind. That record is what stops a double send (`renewalReminderService.ts:83-118`). Vick reads it like this:

| The record says | Vick says |
|---|---|
| **sent**, with a time | **Sent**, and when |
| **claimed** | **Not confirmed.** The send started but wasn't confirmed. It may have arrived, so it won't be sent again, but Vick doesn't call it sent. |
| no record | **Not sent** |
| record not read | **Unknown**, never "sent" |

## Who doesn't get one

Vick gives the same reasons as the platform:
- free seats;
- inactive or withdrawn members;
- members whose notifications are paused;
- members whose programme hasn't started yet;
- an old billing period that a newer one has replaced;
- a member not yet within 7 days of their renewal.

## Things worth knowing

- **Reminders only go out while the switch is on** (`RENEWAL_REMINDERS_ENABLED`). Whether it's on in production is Ali's to confirm; I haven't checked it. With it off, Vick says nobody will be sent anything.
- **A stuck "claimed" record blocks that reminder for good.** If a send times out after the email has left the platform, the record stays "claimed", deliberately, to avoid a double send. Nothing in the platform reports those records, so a member could miss a reminder and nobody would know. **Roselen asked on 18 November 2026 for them to be reported.** Vick now lists every "claimed" reminder more than a day past its date, with how many days it has been stuck, for a person to check. Adding the same check to the platform's daily billing check is a change for Kes.
- **Autopay is decided by the schedule id on the subscription.** If that id is missing on a stale row, an autopay member would get the "please pay" wording instead of the heads-up. That's as the brief describes, and still how it works.

## What I need from you

- **Ali:** is `RENEWAL_REMINDERS_ENABLED` on in production?
- **Ali:** Roselen wants stuck reminders reported. Do you agree they should go into the platform's daily billing check too?

Code: [reminderSchedule.js](reminderSchedule.js). Tests: [reminderSchedule.test.js](reminderSchedule.test.js), 9 tests. Example members (made up): [fixtures/book.json](fixtures/book.json).
