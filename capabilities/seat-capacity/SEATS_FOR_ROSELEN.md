# Seats: what counts as a real seat, and when a forecast is allowed

**For:** Roselen, who signs off on this capability and sets the minimum for a forecast, and Ali. **Capability:** `sales.seat_capacity_and_cohort_fill_forecast`, first release (autonomy:R0): the definitions written down for review. Nothing changes a seat count or a published claim.

## What prospects are told today

The knowledge base answers "how many seats are left?" with **"The Founding Cohort has 32 of 40 seats remaining"** (`seedKbData.ts:249`). Those numbers are **typed into the seed data** (`:47-48`), not counted from real enrolments. So the seat-scarcity claim this capability is meant to keep true isn't connected to the seats at all. It's exactly the "overstated seat claim" risk the brief warns about.

## How the platform counts seats now

- **A seat is taken** when an invoice is requested (`enrollmentService.ts:94-97`) or a payment is confirmed (`:174`), and the cohort is "full" when the counter reaches the maximum (`:31-32`).
- **Explorers never take a seat** (`:428`; `cohortService.ts:174-181`).
- **The counter only goes up.** Nothing lowers it when an invoice goes unpaid or someone withdraws; only a one-off admin cleanup resets it (`productionCleanupRoute.ts:370`). So over time it can say "full" when it isn't.
- I couldn't find any code that turns an invoice enrolment into a paid one. If that's done by hand, whether the seat is counted again is unknown.

## The definitions (proposed: please review)

| Kind | What it is | Takes a seat? |
|---|---|---|
| **Paid seat** | An active, standard enrolment whose payment is confirmed | **Yes** |
| **Reserved seat** | An active enrolment with an invoice requested but not paid | **Held, not paid**, and always shown separately |
| **Explorer** | A free trial account | **Never** |
| Not counted | Started a checkout but didn't pay; payment failed; withdrawn | No |
| Unknown | Any other payment status | Not counted, and flagged |

**Real seats remaining** is reported two ways, never blended into one number:
- *if the reservations hold:* maximum − paid − reserved;
- *if they lapse:* maximum − paid.

**Every disagreement is reported, not resolved:**
- the platform's counter vs the real count;
- the published cap (40, in the Sales Hub facts) vs the cohort's own maximum;
- what prospects are told vs the real count.

## When a fill forecast is allowed

**Not at all until you set a minimum.** A forecast from a handful of enrolments isn't a forecast. Proposed rule:
- **at least 8 paid enrolments, over at least 4 weeks,** in that cohort;
- below that, report the count and say "forecast unavailable";
- above it, the forecast states its basis: "N paid enrolments over W weeks, assumed to continue", with reserved seats not counted as filled.

The numbers are yours to set. Until you do, Vick reports no forecast at all.

## What I need from you

1. **Do the definitions match how you think about seats?** In particular, should a reserved (invoiced) seat count as taken when telling prospects how many are left?
2. **The forecast minimum:** 8 enrolments over 4 weeks, or something else?
3. **Ali:** the "32 of 40 remaining" answer comes from a typed number. Should it be worked out from the real count instead? That's a platform change, and it's what makes the seat-scarcity claim safe to make.

Code: [seatCount.js](seatCount.js). Tests: [seatCount.test.js](seatCount.test.js), 5 tests, including that paid, reserved and Explorer are counted separately, and that no forecast appears until a minimum is set and met.
