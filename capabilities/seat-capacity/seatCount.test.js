import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seatKind, seatCount, projectFill } from './seatCount.js';

const row = (payment_status, extra = {}) => ({ status: 'active', enrollment_type: 'standard', payment_status, ...extra });
const cohort = { name: 'Founding', max_seats: 40, seats_taken: 12 };
const rows = [
  ...Array.from({ length: 6 }, () => row('paid')),
  row('pending_invoice'), row('pending_invoice'),
  row('pending'), row('failed'),
  row('pending', { enrollment_type: 'explorer' }), row('pending', { enrollment_type: 'explorer' }), row('pending', { enrollment_type: 'explorer' }),
  row('paid', { status: 'withdrawn' }),
];

// Acceptance: the definition distinguishes paid seats, reserved seats and Explorers, and states
// the minimum data required before a projection is reported at all.
test('paid, reserved and Explorer are three different things, counted separately', () => {
  assert.equal(seatKind(row('paid')), 'paid');
  assert.equal(seatKind(row('pending_invoice')), 'reserved');
  assert.equal(seatKind(row('pending', { enrollment_type: 'explorer' })), 'explorer');
  assert.equal(seatKind(row('paid', { enrollment_type: 'explorer' })), 'explorer', 'an Explorer never takes a paid seat');
  const c = seatCount(cohort, rows);
  assert.deepEqual([c.paid, c.reserved_by_unpaid_invoice, c.explorers_not_counted], [6, 2, 3]);
  assert.deepEqual([c.remaining_if_reservations_hold, c.remaining_if_reservations_lapse], [32, 34]);
});

test('no projection at all until a minimum amount of data is set and met', () => {
  assert.equal(projectFill(cohort, [], '2026-11-16').status, 'unavailable');
  assert.match(projectFill(cohort, [], '2026-11-16').why, /No minimum amount of data has been set/);
  const few = projectFill(cohort, ['2026-11-10', '2026-11-12'], '2026-11-16', { enrolments: 8, weeks: 4 });
  assert.equal(few.status, 'unavailable');
  assert.match(few.why, /Only 2 paid enrolment\(s\).*minimum is 8 over 4.*Report the count, not a forecast/);
  const dates = ['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06', '2026-10-13', '2026-10-20'];
  const enough = projectFill(cohort, dates, '2026-11-16', { enrolments: 8, weeks: 4 });
  assert.equal(enough.status, 'projection');
  assert.match(enough.basis, /paid enrolments over .* weeks = .* a week, assumed to continue/);
});

test('every disagreement is reported, never resolved', () => {
  const c = seatCount(cohort, rows, { cap: 40, cap_source: 'Sales Hub pinned facts', remaining: 32, remaining_source: 'knowledge base seed' });
  assert.match(c.flags[0], /counter says 12, but 6 paid and 2 reserved .* \(8\)/);
  assert.equal(c.flags.length, 1, 'cap and remaining agree here');
  const off = seatCount({ ...cohort, seats_taken: 8 }, rows, { cap: 50, cap_source: 'pricing page', remaining: 32, remaining_source: 'knowledge base seed' });
  assert.ok(off.flags.some((f) => /published cap is 50 .* cohort allows 40/.test(f)));
  const told = seatCount({ ...cohort, seats_taken: 8 }, [...rows, row('paid'), row('paid')], { remaining: 32, remaining_source: 'knowledge base seed' });
  assert.ok(told.flags.some((f) => /Prospects are told 32 seats remain .* real count gives 30/.test(f)));
});

test('withdrawn and unknown enrolments are not counted, and unknowns are flagged', () => {
  const c = seatCount(cohort, [row('paid', { status: 'withdrawn' }), row('refunded')]);
  assert.equal(c.paid, 0);
  assert.ok(c.flags.some((f) => /1 enrolment\(s\) have a payment status the definition does not cover/.test(f)));
});

test('malformed input is refused', () => {
  assert.throws(() => seatCount({ max_seats: -1 }, []), RangeError);
  assert.throws(() => seatCount(cohort, 'x'), RangeError);
  assert.throws(() => seatKind(null), RangeError);
  assert.throws(() => projectFill(cohort, [], 'today', null), RangeError);
  assert.throws(() => projectFill(cohort, [], '2026-11-16', { enrolments: 0, weeks: 4 }), RangeError);
});
