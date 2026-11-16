import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reminderDates, kindDueAt, sendStatus, whoIsDue, centralDate, ADVANCE_LEAD_DAYS, FINAL_LEAD_DAYS, LAPSE_FOLLOWUP_DAYS } from './reminderSchedule.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/book.json', import.meta.url), 'utf8'));
const NOW = Date.parse(fx.now);
const sub = (id) => structuredClone(fx.rows.find((r) => r.id === id));
const shift = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

// Acceptance: every due date is reproducible from current_period_end and the lead-day
// constants; the agent never claims a reminder was sent without the idempotency record.
test('every reminder date is the period end in Central plus or minus its constant', () => {
  const offsets = { advance_7d: -ADVANCE_LEAD_DAYS, final_1d: -FINAL_LEAD_DAYS, after_lapse_1d: LAPSE_FOLLOWUP_DAYS[0], after_lapse_7d: LAPSE_FOLLOWUP_DAYS[1] };
  for (const r of fx.rows) {
    const end = centralDate(Date.parse(r.current_period_end));
    for (const d of reminderDates(r.current_period_end)) {
      assert.equal(d.date, shift(end, offsets[d.kind]), `${r.id} ${d.kind}`);
      assert.match(d.working, new RegExp(`is ${end} in Central`));
      assert.match(d.working, /(ADVANCE_LEAD_DAYS|FINAL_LEAD_DAYS|LAPSE_FOLLOWUP_DAYS\[\d\]) = \d/);
    }
  }
});

test('dates are Central calendar days, not UTC: an evening-UTC end is the day before in Central', () => {
  // 03:00Z on 30 Nov is 21:00 on 29 Nov in Central (CST, UTC-6).
  const d = reminderDates('2026-11-30T03:00:00.000Z');
  assert.equal(d.find((x) => x.kind === 'final_1d').date, '2026-11-28');
  assert.equal(d.find((x) => x.kind === 'advance_7d').date, '2026-11-22');
  // Across the March DST change: 04:30Z on 9 Mar 2026 is 23:30 on 8 Mar in CDT.
  assert.equal(reminderDates('2026-03-09T04:30:00.000Z').find((x) => x.kind === 'after_lapse_1d').date, '2026-03-09');
});

test('who is due today, by the platform rules, with each date reproducible', () => {
  const r = whoIsDue(fx.rows, NOW, { ledger: fx.ledger, switchOn: true });
  assert.equal(r.as_of_central, '2026-11-16');
  // Earliest period end first.
  assert.deepEqual(r.due.map((d) => d.subscription_id), ['s4', 's3', 's2', 's1']);
  const by = Object.fromEntries(r.due.map((d) => [d.subscription_id, d]));
  assert.deepEqual([by.s1.kind, by.s2.kind, by.s3.kind, by.s4.kind], ['advance_7d', 'final_1d', 'after_lapse_1d', 'after_lapse_7d']);
  for (const d of r.due) {
    const dates = reminderDates(fx.rows.find((x) => x.id === d.subscription_id).current_period_end);
    assert.equal(d.scheduled_date, dates.find((x) => x.kind === d.kind).date);
  }
  assert.equal(by.s2.autopay, true);
  const skip = Object.fromEntries(r.skipped.map((s) => [s.subscription_id, s.reason]));
  assert.deepEqual(skip, { s5: 'comped', s6: 'superseded', s7: 'notifications_paused', s8: 'not_yet_due' });
});

test('sent only with a ledger row marked sent; claimed is not sent; no ledger is unknown', () => {
  const r = whoIsDue(fx.rows, NOW, { ledger: fx.ledger, switchOn: true });
  const by = Object.fromEntries(r.due.map((d) => [d.subscription_id, d.sent.status]));
  assert.deepEqual(by, { s1: 'sent', s2: 'claimed_unconfirmed', s3: 'not_sent', s4: 'not_sent' });
  for (const d of whoIsDue(fx.rows, NOW, { switchOn: true }).due) assert.equal(d.sent.status, 'unknown');
  const s1 = sub('s1');
  assert.equal(sendStatus(s1, 'advance_7d', [{ ...fx.ledger[0], sent_at: null }]).status, 'unknown');
  assert.equal(sendStatus(s1, 'advance_7d', [{ ...fx.ledger[0], status: 'failed' }]).status, 'unknown');
  // A row for another period end does not count for this one.
  assert.equal(sendStatus(s1, 'advance_7d', [{ ...fx.ledger[0], period_end: '2026-10-23T18:26:00.000Z' }]).status, 'not_sent');
  assert.equal(sendStatus(s1, 'final_1d', fx.ledger).status, 'not_sent');
});

test('with the switch off, nothing is said to send', () => {
  for (const d of whoIsDue(fx.rows, NOW, { ledger: fx.ledger }).due) assert.match(d.will_send_today, /RENEWAL_REMINDERS_ENABLED is off/);
});

test('the window rules match the platform: final wins inside a day, lapse follow-ups only on days 1 and 7', () => {
  const end = '2026-11-23T18:26:00.000Z';
  const at = (iso) => kindDueAt(end, Date.parse(iso));
  assert.equal(at('2026-11-16T15:00:00Z'), 'advance_7d');
  assert.equal(at('2026-11-21T15:00:00Z'), 'advance_7d');
  assert.equal(at('2026-11-22T15:00:00Z'), 'final_1d');
  assert.equal(at('2026-11-23T15:00:00Z'), 'final_1d');
  assert.equal(at('2026-11-15T15:00:00Z'), null);
  assert.equal(at('2026-11-24T15:00:00Z'), 'after_lapse_1d');
  assert.equal(at('2026-11-26T15:00:00Z'), null);
  assert.equal(at('2026-11-30T15:00:00Z'), 'after_lapse_7d');
  assert.equal(at('2026-12-01T15:00:00Z'), null);
});

test('malformed input is refused; nothing is modified', () => {
  assert.throws(() => reminderDates(null), RangeError);
  assert.throws(() => reminderDates('soon'), RangeError);
  assert.throws(() => whoIsDue('x', NOW), RangeError);
  assert.throws(() => whoIsDue([], NaN), RangeError);
  assert.throws(() => sendStatus(sub('s1'), 'advance_7d', 'rows'), RangeError);
  const rows = structuredClone(fx.rows); const copy = structuredClone(rows);
  assert.deepEqual(whoIsDue(rows, NOW, { ledger: fx.ledger }), whoIsDue(rows, NOW, { ledger: fx.ledger }));
  assert.deepEqual(rows, copy);
});
