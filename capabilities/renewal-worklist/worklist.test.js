import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { worklist, excludedAbsent, REASONS } from './worklist.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/sources.json', import.meta.url), 'utf8'));
const subs = () => structuredClone(fx.subs);
const watch = () => structuredClone(fx.watch);

// Acceptance: every row cites its source check; excluded members are provably absent; an
// empty day is reported as empty.
test('every row cites the check that produced each of its reasons', () => {
  const w = worklist(subs(), watch(), fx.exclusions);
  assert.ok(w.rows.length > 0);
  for (const r of w.rows) {
    for (const x of r.reasons) {
      assert.equal(x.source, REASONS[x.reason].cite);
      assert.match(x.source, /\.ts:\d+/);
    }
  }
});

test('excluded members are provably absent, from every source, whatever the case of their email', () => {
  const w = worklist(subs(), watch(), fx.exclusions);
  assert.equal(excludedAbsent(w, fx.exclusions), true);
  assert.ok(!w.rows.some((r) => /ach1|card1/.test(r.member)));
  assert.equal(w.excluded.held_out, 3, 'one lapsed row, one renewal row and one card finding were held out');
  // Without the exclusion list they would have appeared: the test can fail.
  const open = worklist(subs(), watch(), []);
  assert.equal(excludedAbsent(open, fx.exclusions), false);
});

test('an empty day is reported as empty, and an unread source is never an empty day', () => {
  const quiet = worklist({ attention: [], upcomingPayments: [] }, { findings: [] }, fx.exclusions);
  assert.deepEqual([quiet.complete, quiet.empty, quiet.rows.length, quiet.message], [true, true, 0, 'Nothing needs renewal attention today.']);
  const unread = worklist({ attention: [], upcomingPayments: [] }, null, fx.exclusions);
  assert.deepEqual([unread.complete, unread.empty], [false, false]);
  assert.match(unread.message, /Incomplete: the billing watch result could not be read/);
  const onlyExcluded = worklist({ attention: [fx.subs.attention[2]], upcomingPayments: [] }, { findings: [] }, fx.exclusions);
  assert.equal(onlyExcluded.empty, true, 'a day whose only names are excluded is empty, not padded');
});

test('one row per member, ordered by consequence, with every reason kept', () => {
  const w = worklist(subs(), watch(), fx.exclusions);
  assert.deepEqual(w.rows.map((r) => [r.member, r.top_reason]), [
    ['p5@example.com', 'autopay_declined'], ['p1@example.com', 'lapsed_no_followup'], ['p2@example.com', 'checkout_failed'], ['p3@example.com', 'card_expiring'],
  ]);
  assert.deepEqual(w.rows.find((r) => r.member === 'p1@example.com').reasons.map((x) => x.reason), ['lapsed_no_followup', 'lapsed']);
  assert.deepEqual(w.rows.find((r) => r.member === 'p3@example.com').reasons.map((x) => x.reason), ['card_expiring', 'renewal_due']);
  assert.ok(!w.rows.some((r) => r.member === 'p4@example.com'), 'a renewal 34 days out is not today\'s work');
  assert.match(w.ordering, /^proposed/);
});

test('no row ever proposes a catch-up charge or a payment link for a scheduled member', () => {
  const w = worklist(subs(), watch(), fx.exclusions);
  assert.equal(w.no_catch_up_charges, true);
  for (const r of w.rows) assert.doesNotMatch(r.next_action, /charge (them|the) (missed|lapsed)|back-?charge|catch-?up charge/i);
  assert.match(w.rows[0].next_action, /Do not send a payment link/);
  assert.match(REASONS.lapsed.next, /written off, never charged/);
});

test('malformed input is refused; nothing is modified', () => {
  assert.throws(() => worklist({ attention: [] }, watch(), []), RangeError);
  assert.throws(() => worklist(subs(), { rows: [] }, []), RangeError);
  assert.throws(() => worklist(subs(), watch(), 'x'), RangeError);
  const s = subs(); const w = watch(); const copy = structuredClone([s, w]);
  assert.deepEqual(worklist(s, w, fx.exclusions), worklist(s, w, fx.exclusions));
  assert.deepEqual([s, w], copy);
});
