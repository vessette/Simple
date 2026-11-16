import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stepOfRow, personState, stuckList, STEPS } from './followThrough.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/roster.json', import.meta.url), 'utf8'));
const rows = () => structuredClone(fx.rows);
const OWNERS = { paid_locked_out: 'Taiwo', invoice_unpaid: 'Taiwo' };

// Acceptance: every state traces to the enrolment and subscription rows; a person with two
// rows is reported as one person, and an unowned step is reported as unowned rather than
// assigned to whoever is handy.
test('every state traces to the enrolment and subscription rows it was read from', () => {
  for (const r of fx.rows) {
    const p = personState(r.email, rows(), OWNERS);
    assert.ok(p.traces.length >= 1);
    for (const t of p.traces) {
      const src = fx.rows.find((x) => x.id === t.trace.enrollment_id);
      assert.ok(src, 'trace names a real row');
      assert.equal(t.trace.payment_status, src.payment_status);
      assert.equal(t.trace.portal_enabled, src.portal_enabled);
      assert.equal(t.trace.latest_subscription_status, src.subscription ? src.subscription.status : null);
    }
    if (STEPS[p.step]) assert.match(p.rule, /\.ts:\d+/);
  }
});

test('a person with two rows is one person: abandoned checkout plus Explorer account', () => {
  const p = personState('p5@example.com', rows(), OWNERS);
  assert.equal(p.rows, 2, 'emails match regardless of case and spaces');
  assert.equal(p.step, 'checkout_abandoned', 'the paid intent wins over the free account');
  assert.deepEqual(p.also, [{ step: 'explorer_only', enrollment_id: 'e6' }]);
  const list = stuckList(rows(), OWNERS);
  assert.equal(list.filter((x) => x.person === 'p5@example.com').length, 1);
  assert.equal(new Set(list.map((x) => x.person)).size, list.length);
});

test('an unowned step is reported unowned, never assigned to whoever is handy', () => {
  const p = personState('p4@example.com', rows(), OWNERS);
  assert.deepEqual([p.step, p.owner, p.owner_status], ['payment_failed', null, 'unowned']);
  assert.match(p.owner_note, /Roselen to name one; Vick does not assign it/);
  const none = personState('p2@example.com', rows(), {});
  assert.deepEqual([none.owner, none.owner_status], [null, 'unowned']);
  const blank = personState('p2@example.com', rows(), { paid_locked_out: '  ' });
  assert.equal(blank.owner_status, 'unowned');
  assert.deepEqual([personState('p2@example.com', rows(), OWNERS).owner, personState('p2@example.com', rows(), OWNERS).owner_status], ['Taiwo', 'owned']);
});

test('each step, with its next action', () => {
  const step = (e) => personState(e, rows(), OWNERS).step;
  assert.equal(step('p1@example.com'), 'complete');
  assert.equal(step('p2@example.com'), 'paid_locked_out');
  assert.match(personState('p2@example.com', rows(), OWNERS).next_action, /completion failure, not a payment one/);
  assert.equal(step('p3@example.com'), 'invoice_unpaid');
  assert.match(personState('p3@example.com', rows(), OWNERS).next_action, /held from someone who could pay/);
  assert.equal(step('p7@example.com'), 'explorer_only');
  assert.equal(step('p8@example.com'), 'not_followed');
  assert.equal(step('p9@example.com'), 'not_started');
  assert.equal(step('nobody@example.com'), 'no_enrolment');
});

test('the stuck list: one entry per person, most advanced step first, nobody complete or free', () => {
  assert.deepEqual(stuckList(rows(), OWNERS).map((p) => [p.person, p.step]), [
    ['p2@example.com', 'paid_locked_out'], ['p3@example.com', 'invoice_unpaid'], ['p4@example.com', 'payment_failed'],
    ['p5@example.com', 'checkout_abandoned'], ['p9@example.com', 'not_started'],
  ]);
});

test('missing fields are unknown, never guessed', () => {
  assert.equal(stepOfRow({ id: 'x', status: 'active', payment_status: 'paid' }).step, 'unknown');
  assert.equal(stepOfRow({ id: 'x', status: 'active' }).step, 'unknown');
  assert.equal(stepOfRow({ id: 'x', status: 'active', payment_status: 'refunded' }).step, 'unknown');
  const p = personState('q@example.com', [{ id: 'x', email: 'q@example.com', status: 'active', payment_status: 'paid' }]);
  assert.deepEqual([p.step, p.owner_status], ['unknown', 'not_applicable']);
  assert.ok(stuckList([{ id: 'x', email: 'q@example.com', status: 'active', payment_status: 'paid' }]).some((x) => x.step === 'unknown'), 'an unknown person still appears on the list');
});

test('malformed input is refused; nothing is modified', () => {
  assert.throws(() => personState('', rows()), RangeError);
  assert.throws(() => personState('p1@example.com', 'x'), RangeError);
  assert.throws(() => personState('p1@example.com', rows(), null), RangeError);
  assert.throws(() => stepOfRow(null), RangeError);
  assert.throws(() => stuckList('x'), RangeError);
  const r = rows(); const copy = structuredClone(r);
  assert.deepEqual(stuckList(r, OWNERS), stuckList(r, OWNERS));
  assert.deepEqual(r, copy);
});
