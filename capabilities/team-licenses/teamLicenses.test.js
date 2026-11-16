import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { quotePrice, tiers, seatBlock, REDEMPTION } from './teamLicenses.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/sources.json', import.meta.url), 'utf8'));
const src = () => structuredClone(fx);
const dollars = (s) => (String(s).match(/\$\s?\d[\d,]*/g) || []);
const approvedAmounts = (s) => new Set(s.claims.filter((c) => ['VERIFIED', 'OWNER_ATTESTED'].includes(c.verification)).flatMap((c) => dollars(c.publicWording)));

// Acceptance: every price quoted traces to an approved source; an unreconciled price copy is
// reported as unknown rather than quoted.
test('every price quoted traces to an approved, publishable registry claim', () => {
  const s = src();
  const out = tiers(s);
  assert.deepEqual(out.map((t) => [t.name, t.price, t.price_status]), [['Team', '$1,200', 'quoted'], ['Department', '$950 at department scale', 'quoted'], ['Enterprise', 'Scoped on a call', 'quoted']]);
  for (const t of out.filter((x) => x.price)) assert.match(t.price_source, /^frontend\/src\/config\/claimsRegistry\.ts:\d+-\d+$/);
  // No dollar figure anywhere in the output that the registry has not approved.
  const text = JSON.stringify(out) + JSON.stringify(REDEMPTION) + JSON.stringify(seatBlock({ id: 'sp', seats_purchased: 3, billing_status: 'paid' }, []));
  for (const d of dollars(text)) assert.ok(approvedAmounts(s).has(d), `${d} is not an approved price`);
});

test('an unreconciled copy makes the price unknown, naming both, and quotes neither', () => {
  const s = src();
  s.copies.push({ claim: 'pricing.department', where: 'frontend/src/pages/Example.tsx:9', value: '$900' });
  const q = quotePrice('pricing.department', s);
  assert.deepEqual([q.status, q.price], ['unknown', null]);
  assert.match(q.why, /Unreconciled: the registry says "\$950 at department scale".*Example\.tsx:9 says "\$900"/);
  const dept = tiers(s).find((t) => t.name === 'Department');
  assert.deepEqual([dept.price, dept.price_status], [null, 'unknown']);
  assert.equal(tiers(s).find((t) => t.name === 'Team').price_status, 'quoted', 'one bad copy does not taint another price');
});

test('blocked and unregistered prices are never quoted', () => {
  const s = src();
  assert.deepEqual([quotePrice('pricing.retired.4500', s).status, quotePrice('pricing.retired.4500', s).price], ['refused', null]);
  assert.equal(quotePrice('pricing.repo.1788', s).status, 'refused');
  assert.deepEqual([quotePrice('pricing.team.discount', s).status, quotePrice('pricing.team.discount', s).price], ['unknown', null]);
  s.claims.find((c) => c.key === 'pricing.team').verification = 'NEEDS_VERIFICATION';
  assert.equal(quotePrice('pricing.team', s).status, 'refused');
});

test('today every copy of the team prices agrees with the registry', () => {
  const s = src();
  assert.equal(quotePrice('pricing.team', s).copies_agreeing.length, 1);
  assert.equal(quotePrice('pricing.department', s).copies_agreeing.length, 2);
});

test('redemption is explained step by step, each step cited, with no price', () => {
  assert.equal(REDEMPTION.length, 6);
  for (const r of REDEMPTION) assert.match(r.cite, /\.ts:\d+/);
  assert.match(REDEMPTION.map((r) => r.step).join(' '), /cannot both succeed.*returns the same enrolment/);
});

test('a seat block: counts by state, and the gaps a person should look at', () => {
  const seats = (n, status) => Array.from({ length: n }, () => ({ sponsor_id: 'sp', status }));
  const ok = seatBlock({ id: 'sp', company_name: 'Acme', seats_purchased: 5, billing_status: 'paid' }, [...seats(3, 'redeemed'), ...seats(2, 'available')]);
  assert.deepEqual([ok.purchased, ok.codes_issued, ok.redeemed, ok.available, ok.flags], [5, 5, 3, 2, []]);
  const none = seatBlock({ id: 'sp', seats_purchased: 25, billing_status: 'paid' }, []);
  assert.match(none.flags[0], /25 of 25 purchased seats have no redemption code yet/);
  const over = seatBlock({ id: 'sp', seats_purchased: 2, billing_status: 'paid' }, seats(3, 'available'));
  assert.match(over.flags[0], /Over-allocated: 3 seat codes exist for 2 purchased seats/);
  const unpaid = seatBlock({ id: 'sp', seats_purchased: 2, billing_status: 'pending' }, seats(2, 'available'));
  assert.match(unpaid.flags.join(), /billing status is "pending", but redemption does not check it/);
  assert.match(ok.decision_owner, /human decision/);
});

test('malformed input is refused; nothing is modified', () => {
  assert.throws(() => quotePrice('pricing.team', {}), RangeError);
  assert.throws(() => tiers({ claims: [], copies: [] }), RangeError);
  assert.throws(() => seatBlock(null, []), RangeError);
  assert.throws(() => seatBlock({ id: 'sp', seats_purchased: -1 }, []), RangeError);
  assert.throws(() => seatBlock({ id: 'sp', seats_purchased: 1 }, 'x'), RangeError);
  assert.throws(() => seatBlock({ id: 'sp', seats_purchased: 1 }, [{ sponsor_id: 'other', status: 'available' }]), RangeError);
  const s = src(); const copy = structuredClone(s);
  assert.deepEqual(tiers(s), tiers(s));
  assert.deepEqual(s, copy);
});
