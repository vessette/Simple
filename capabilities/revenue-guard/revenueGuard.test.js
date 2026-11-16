import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { check, audit, describe, RULES, DERIVATIONS } from './revenueGuard.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/surfaces.json', import.meta.url), 'utf8'));
const STATEMENTS = Object.values(RULES).map((r) => r.statement);
const base = { surface: 'Test surface', label: 'Revenue', presented_as: 'revenue', traced_to: 'x.ts:1' };

// Acceptance: every verdict cites one of the four rule statements; the agent never
// asserts a revenue number of its own.
test('there are exactly four rule statements, each cited to file:line', () => {
  assert.equal(STATEMENTS.length, 4);
  for (const r of Object.values(RULES)) {
    assert.ok(r.citations.length > 0, r.id);
    for (const c of r.citations) assert.match(c, /\.ts:\d+(-\d+)?$/, `${r.id}: ${c}`);
  }
});

test('every verdict, for every derivation and shape, cites one of the four rule statements', () => {
  const shapes = [];
  for (const derivation of DERIVATIONS) {
    for (const presented_as of ['revenue', 'projection']) {
      for (const origin of [undefined, 'app_checkout', 'any_gateway_charge', 'manual_entry']) {
        for (const price_source of ['setting', 'constant', undefined]) {
          for (const labelled_assumption of [true, false]) shapes.push({ ...base, derivation, presented_as, origin, price_source, labelled_assumption });
        }
      }
    }
  }
  for (const f of [...shapes, ...fx.figures]) {
    const v = check(f);
    assert.ok(STATEMENTS.includes(v.rule.statement), `${f.derivation}: no rule statement cited`);
    assert.deepEqual(v.rule.citations, RULES[v.rule.id].citations);
    assert.ok(['meets', 'breaks', 'projection_allowed', 'cannot_tell'].includes(v.verdict));
  }
});

test('the guard never asserts a revenue number: a value given is never echoed or recomputed', () => {
  for (const derivation of DERIVATIONS) {
    const v = check({ ...base, derivation, origin: 'app_checkout', value: 45000, amount: 87654.32 });
    const text = JSON.stringify(v) + describe(v);
    for (const n of ['45000', '45,000', '87654', '87,654']) assert.ok(!text.includes(n), `${derivation} leaked ${n}`);
    for (const k of ['value', 'amount', 'revenue', 'total']) assert.equal(v[k], undefined, `${derivation} has a ${k} field`);
  }
  const a = audit(fx.figures.map((f) => ({ ...f, value: 123456 })));
  assert.ok(!JSON.stringify(a).includes('123456'));
});

test('an enrolment is not a payment: ten enrolments and no collected money is not revenue', () => {
  const v = check({ ...base, surface: 'A campaign', derivation: 'enrolment_count', value: 10 });
  assert.equal(v.verdict, 'breaks');
  assert.equal(v.rule.id, 'enrolment_not_payment');
});

test('a missing source is unavailable with a reason, never zero', () => {
  assert.deepEqual([check({ ...base, derivation: 'zero_when_missing' }).verdict, check({ ...base, derivation: 'zero_when_missing' }).rule.id], ['breaks', 'unavailable_not_zero']);
  assert.equal(check({ ...base, derivation: 'unavailable_with_reason' }).verdict, 'meets');
});

test('count times price: revenue breaks; a projection passes only if labelled and read from the setting', () => {
  assert.equal(check({ ...base, derivation: 'count_times_price' }).verdict, 'breaks');
  const p = { ...base, presented_as: 'projection', derivation: 'count_times_price' };
  assert.equal(check({ ...p, price_source: 'setting', labelled_assumption: true }).verdict, 'projection_allowed');
  assert.match(check({ ...p, price_source: 'constant', labelled_assumption: true }).why, /private constant/);
  assert.match(check({ ...p, price_source: 'setting', labelled_assumption: false }).why, /not labelled/);
  assert.match(check({ ...p, price_source: 'constant', labelled_assumption: false }).why, /private constant.*and.*not labelled/);
});

test('collected money meets only when app-originated; untraced origin is cannot_tell, never meets', () => {
  const c = { ...base, derivation: 'collected_payments' };
  assert.equal(check({ ...c, origin: 'app_checkout' }).verdict, 'meets');
  assert.equal(check({ ...c, origin: 'any_gateway_charge' }).verdict, 'breaks');
  assert.equal(check({ ...c, origin: 'manual_entry' }).verdict, 'breaks');
  assert.equal(check(c).verdict, 'cannot_tell');
  assert.equal(check({ ...base, derivation: 'unknown' }).verdict, 'cannot_tell');
});

test('the traced surfaces at platform main: two projections break the rule, nothing else does', () => {
  const a = audit(fx.figures);
  assert.equal(a.checked, 6);
  assert.deepEqual(a.breaks.map((v) => v.surface).sort(), ['Cory simulation', 'Opportunities page']);
  assert.ok(a.breaks.every((v) => v.rule.id === 'no_count_times_price'));
  assert.equal(a.cannot_tell.length, 0);
  const actual = a.verdicts.find((v) => v.label === 'Actual revenue');
  assert.equal(actual.verdict, 'meets');
});

test('malformed input is refused, not guessed at', () => {
  assert.throws(() => check(null), RangeError);
  assert.throws(() => check([]), RangeError);
  assert.throws(() => check({ ...base, derivation: 'vibes' }), RangeError);
  assert.throws(() => check({ ...base, derivation: 'unknown', presented_as: 'cash' }), RangeError);
  assert.throws(() => check({ ...base, derivation: 'unknown', surface: ' ' }), RangeError);
  assert.throws(() => check({ ...base, derivation: 'collected_payments', origin: 'stripe' }), RangeError);
  assert.throws(() => audit('x'), RangeError);
  assert.deepEqual(audit([]), { checked: 0, breaks: [], cannot_tell: [], verdicts: [] });
});

test('same input, same verdicts, in the same order', () => {
  assert.deepEqual(audit(fx.figures), audit([...fx.figures].reverse()));
  assert.equal(describe(check(fx.figures[4])), describe(check(fx.figures[4])));
});
