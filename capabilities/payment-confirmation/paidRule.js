// The one definition of "paid" Vick uses, as decided by the program lead on 2026-11-12:
// only Settled or Posted counts. Authorized and Pending are recorded and re-checked until
// they settle or fail; they do not open access or count as paid.
//
// A reversal on a paid student drops them to Week 0 (the free preview tier,
// announcementWeek0.ts:3) and leaves their login alone. There is no seat to free by hand:
// the seat count comes from paid enrolments. (The program lead's later decision, as set
// out in the platform builder's spec draft of 2026-11-12. It replaces "remove access and
// free the seat" from the first answer.)
//
// The platform decides "paid" in five places today, and none uses Settled or Posted only
// (all at 109820a):
//   1. the payment-notice handler accepts any status (webhookController.ts:118-121)
//   2. the 30-minute sync counts Authorized (paymentSyncService.ts:31-33)
//   3. the 20-minute app reconcile does the same, via the sync's isCollected
//      (appPaymentReconcileService.ts:96, :330)
//   4. the reconciliation sweep accepts Authorized for an already-linked customer
//      (paymentReconciliationService.ts:38, :275)
//   5. membership renewals count Authorized and Pending (subscriptionScheduleService.ts:275)
// Vick follows the decided rule, never the code's, and says so.
//
// Status strings are matched without regard to case: notices carry "authorized", the
// API "Authorized". A status in none of the groups is unknown, never guessed.

export const PAID_RULE = Object.freeze({
  decided: '2026-11-12',
  text: 'Only Settled or Posted counts as paid (program lead, 2026-11-12).',
  reversal: 'the student drops to Week 0, the free preview tier, and keeps their login. The seat count comes from paid enrolments, so no seat is freed by hand.',
});

const GROUPS = Object.freeze({
  settled: ['settled', 'posted'],
  waiting: ['authorized', 'pending'],
  reversed: ['returned', 'returnednsf', 'reversed', 'refunded', 'chargeback'],
  // Voided sits with failed, as in the platform builder's spec: no money moved.
  failed: ['failed', 'declined', 'voided'],
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
