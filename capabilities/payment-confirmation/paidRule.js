// The one definition of "paid" Vick uses, as decided by the program lead on 2026-11-12:
// only Settled or Posted counts. Authorized does not open access or take a seat, and a
// reversal on someone already paid removes access and frees the seat.
//
// The platform has three rules today (webhookController.ts:118-121 accepts any status;
// paymentSyncService.ts:31-33 counts Authorized; paymentReconciliationService.ts:37 takes
// Settled or Posted only). Vick follows the decided one, never the code's, and says so.
//
// Status strings are matched without regard to case: notices carry "authorized", the
// API "Authorized". A status in none of the groups is unknown, never guessed.

export const PAID_RULE = Object.freeze({
  decided: '2026-11-12',
  text: 'Only Settled or Posted counts as paid (program lead, 2026-11-12).',
});

const GROUPS = Object.freeze({
  settled: ['settled', 'posted'],
  waiting: ['authorized', 'pending'],
  reversed: ['returned', 'returnednsf', 'reversed', 'refunded', 'chargeback', 'voided'],
  failed: ['failed', 'declined'],
});

/** Which group a payment-provider status falls in: settled, waiting, reversed, failed or unknown. */
export function classifyStatus(raw) {
  if (typeof raw !== 'string') return 'unknown';
  const s = raw.trim().toLowerCase().replace(/[\s_-]/g, '');
  for (const [group, list] of Object.entries(GROUPS)) if (list.includes(s)) return group;
  return 'unknown';
}

/** Does this status count as paid under the decided rule? true, false, or null when unknown. */
export function countsAsPaid(raw) {
  const g = classifyStatus(raw);
  return g === 'unknown' ? null : g === 'settled';
}
