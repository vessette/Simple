// Seat capacity: the definition of a real remaining seat, autonomy:R0.
// Capability: sales.seat_capacity_and_cohort_fill_forecast. Read-only. These functions make the
// written definition testable; they change no seat count and no published claim.
//
// Platform rules at 34dce98:
//   full check         enrollmentService.ts:31-32 (seats_taken >= max_seats means full)
//   invoice reserves   enrollmentService.ts:94-97 (seat taken when the invoice is requested)
//   payment takes      enrollmentService.ts:174 (seat taken when payment confirms)
//   Explorers          enrollmentService.ts:428 (no seat) and cohortService.ts:174-181
//   never decremented  no code lowers seats_taken except an admin cleanup (productionCleanupRoute.ts:370)
//   prospect claim     seedKbData.ts:47-48, :249 (seats_remaining is a typed number, not counted)

/** How each enrolment is counted. */
export function seatKind(e) {
  if (!e || typeof e !== 'object') throw new RangeError('An enrolment row is required.');
  if (e.enrollment_type === 'explorer') return 'explorer';
  if (e.status && e.status !== 'active') return 'not_active';
  if (e.payment_status === 'paid') return 'paid';
  if (e.payment_status === 'pending_invoice') return 'reserved';
  if (e.payment_status === 'pending' || e.payment_status === 'failed') return 'no_seat';
  return 'unknown';
}

/**
 * Seats for one cohort, each kind counted separately. Never a single blended number, and
 * every disagreement is reported rather than resolved.
 */
export function seatCount(cohort, enrollments, published = {}) {
  if (!cohort || !Number.isInteger(cohort.max_seats) || cohort.max_seats < 0) throw new RangeError('A cohort with a whole max_seats is required.');
  if (!Array.isArray(enrollments)) throw new RangeError('enrollments must be the cohort\'s enrolment rows.');
  const n = { paid: 0, reserved: 0, explorer: 0, no_seat: 0, not_active: 0, unknown: 0 };
  for (const e of enrollments) n[seatKind(e)] += 1;
  const flags = [];
  const counted = n.paid + n.reserved;
  if (Number.isInteger(cohort.seats_taken) && cohort.seats_taken !== counted) {
    flags.push(`The platform's seat counter says ${cohort.seats_taken}, but ${n.paid} paid and ${n.reserved} reserved enrolments are active (${counted}). The counter only goes up, so withdrawn or never-paid enrolments can stay counted.`);
  }
  if (Number.isInteger(published.cap) && published.cap !== cohort.max_seats) flags.push(`The published cap is ${published.cap} (${published.cap_source}), but the cohort allows ${cohort.max_seats}. Reported, not resolved.`);
  if (Number.isInteger(published.remaining) && published.remaining !== cohort.max_seats - counted) {
    flags.push(`Prospects are told ${published.remaining} seats remain (${published.remaining_source}), but the real count gives ${cohort.max_seats - counted}.`);
  }
  if (n.unknown) flags.push(`${n.unknown} enrolment(s) have a payment status the definition does not cover; they are not counted.`);
  if (counted > cohort.max_seats) flags.push(`Overbooked: ${counted} paid and reserved seats against a maximum of ${cohort.max_seats}.`);
  // The same person holding two seats in one cohort is double counting, not two sales.
  const seen = new Map();
  for (const e of enrollments) {
    const kind = seatKind(e);
    if ((kind !== 'paid' && kind !== 'reserved') || !e.email) continue;
    const k = String(e.email).trim().toLowerCase();
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  const doubles = [...seen.values()].filter((v) => v > 1).length;
  if (doubles) flags.push(`${doubles} person(s) hold more than one seat in this cohort; each extra seat is double counting.`);
  return {
    cohort: cohort.name || cohort.id,
    max_seats: cohort.max_seats,
    paid: n.paid,
    reserved_by_unpaid_invoice: n.reserved,
    remaining_if_reservations_hold: cohort.max_seats - counted,
    remaining_if_reservations_lapse: cohort.max_seats - n.paid,
    explorers_not_counted: n.explorer,
    flags,
  };
}

/**
 * A fill projection, or "unavailable" when there is too little data. The minimum is the sales
 * manager's to set; until she does, no projection is produced at all.
 *   paidDates  ISO dates on which each paid enrolment in this cohort was confirmed
 *   min        { enrolments, weeks } both required before any projection
 */
export function projectFill(cohort, paidDates, asOf, min = null) {
  if (!Array.isArray(paidDates)) throw new RangeError('paidDates must be an array of dates.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(asOf))) throw new RangeError('asOf must be YYYY-MM-DD.');
  if (min === null) return { status: 'unavailable', why: 'No minimum amount of data has been set, so no projection is reported. The sales manager sets it.' };
  if (!Number.isInteger(min.enrolments) || !Number.isInteger(min.weeks) || min.enrolments < 1 || min.weeks < 1) throw new RangeError('min needs whole enrolments and weeks, at least 1 each.');
  const ms = paidDates.map((d) => Date.parse(d)).filter(Number.isFinite).sort((a, b) => a - b);
  const now = Date.parse(`${asOf}T23:59:59Z`);
  const weeks = ms.length ? (now - ms[0]) / (7 * 86400000) : 0;
  if (ms.length < min.enrolments || weeks < min.weeks) {
    return { status: 'unavailable', why: `Only ${ms.length} paid enrolment(s) over ${Math.max(0, Math.floor(weeks))} week(s); the minimum is ${min.enrolments} over ${min.weeks}. Report the count, not a forecast.` };
  }
  const perWeek = ms.length / weeks;
  const left = cohort.max_seats - ms.length;
  return {
    status: 'projection',
    basis: `${ms.length} paid enrolments over ${weeks.toFixed(1)} weeks = ${perWeek.toFixed(2)} a week, assumed to continue. Reserved seats are not counted as filled.`,
    weeks_to_fill: left <= 0 ? 0 : Math.round((left / perWeek) * 10) / 10,
  };
}
