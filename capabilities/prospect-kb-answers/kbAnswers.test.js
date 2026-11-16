import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { answer, check, claims, pricesAgree, ASK_ALI } from './kbAnswers.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/pinned.json', import.meta.url), 'utf8'));
const src = { pinned: fx.pinned_facts, context: fx.context };
const TODAY = '2026-11-16';

// A sample of the questions reps ask, across every topic and some the KB can't answer.
const SAMPLE = [
  'How much does it cost?', 'What is the total cost including everything?', 'Are there any extra fees?',
  'Can I get a refund if I cancel?', 'What is the cancellation policy?', 'When does the next cohort start?',
  'When is the open house?', 'How many seats are left?', 'What is the weekly schedule?', 'How many hours per week?',
  'Is there a scholarship?', 'Do I need to know how to code?', 'Is there a job guarantee?', 'Can my employer pay?',
  'How much is it and can I get my money back?', 'What do I get at the end?',
];

// Acceptance: every factual claim traces to a KB entry or a pinned fact; a cost answer always
// discloses the student-paid Anthropic and API costs; a refund answer states the terms are
// pending approval. A fabricated price, date or policy in any sampled answer fails the release.
test('every sampled answer passes the audit: claims traced, cost disclosed, refund pending', () => {
  for (const q of SAMPLE) {
    const a = answer(q, src, TODAY);
    const c = check(q, a.text, src);
    assert.ok(c.pass, `${q}: ${c.problems.join(' ')}`);
    for (const cl of c.claims) assert.ok(cl.source, `${q}: ${cl.raw} untraced`);
    for (const p of a.parts) assert.ok(p.source === null ? p.text === ASK_ALI : /^(pinned|kb\[\d\])$/.test(p.source), q);
  }
});

test('a cost answer always discloses the student-paid Anthropic and API costs', () => {
  for (const q of SAMPLE.filter((x) => /cost|fees|how much/i.test(x))) {
    const t = answer(q, src, TODAY).text;
    assert.match(t, /Anthropic subscription for Claude Code \(about \$20\/mo\)/, q);
    assert.match(t, /API usage .*under \$10\/mo/, q);
  }
  const bare = check('How much does it cost?', 'It is $149/mo billed annually or $199/mo monthly.', src);
  assert.equal(bare.pass, false);
  assert.match(bare.problems.join(), /student-paid Anthropic/);
});

test('a refund answer says the terms are pending approval and quotes none', () => {
  const a = answer('Can I get a refund if I cancel?', src, TODAY);
  assert.match(a.text, /pending final approval/);
  assert.doesNotMatch(a.text, /full refund|\d+[- ]day/i);
  assert.equal(check('Can I get a refund?', 'Yes, you can get a refund.', src).pass, false);
  const invented = check('Can I get a refund?', 'There is a full refund within 14 days; terms are pending final approval.', src);
  assert.equal(invented.pass, false);
  assert.match(invented.problems.join(' '), /Ungrounded policy: "full refund"/);
  assert.match(invented.problems.join(' '), /Ungrounded count: "14 days"/);
});

test('a fabricated price, date or count fails the audit outright', () => {
  const base = 'The founding rate is $149/mo billed annually. Students also pay about $20/mo for Anthropic and under $10/mo for API usage.';
  assert.equal(check('How much does it cost?', base, src).pass, true);
  assert.equal(check('How much does it cost?', base.replace('$149', '$129'), src).pass, false);
  assert.equal(check('How much does it cost?', `${base} The old price was $4,500.`, src).pass, false);
  assert.equal(check('When does it start?', 'Kickoff is Thursday July 30, 2026.', src).pass, false);
  assert.equal(check('When does it start?', 'Kickoff is Thursday July 23, 2027.', src).pass, false);
  assert.equal(check('How many seats?', 'The cohort is capped at 50 seats.', src).pass, false);
  assert.equal(check('How many seats?', 'The cohort is capped at 40 seats.', src).pass, true);
  assert.equal(check('Is there a job guarantee?', 'Yes, we guarantee a job.', src).pass, false);
});

test('where the KB is silent, it says so and suggests Ali, never filling the gap', () => {
  for (const q of ['Can my employer pay?', 'Is there a job guarantee?']) {
    const a = answer(q, src, TODAY);
    assert.equal(a.silent, true, q);
    assert.equal(a.text, ASK_ALI);
  }
  assert.equal(answer('Is there a scholarship?', src, TODAY).parts[0].source, 'kb[0]');
});

test('dates that have passed are flagged for Ali, not repeated as upcoming', () => {
  const now = answer('When does the next cohort start?', src, TODAY);
  assert.match(now.text, /dates on file have passed \(July 16, 2026, July 23, 2026\)/);
  assert.match(now.text, /confirm the next cohort's dates with Ali/);
  const then = answer('When does the next cohort start?', src, '2026-07-01');
  assert.match(then.text, /cohort kickoff Thursday July 23, 2026/);
});

test('the pinned prices agree with the plan prices today, and drift is caught', () => {
  assert.deepEqual(pricesAgree(fx.pinned_facts, fx.plan_prices), { agree: true, missing: [] });
  assert.deepEqual(pricesAgree(fx.pinned_facts, { annual_per_month: 159, monthly: 199 }), { agree: false, missing: ['$159'] });
});

test('claim extraction: prices, dates and counts, normalised', () => {
  const c = claims('$1,788 a year, $149/mo, July 16, 2026, 23 July, 12-week, 4 live hours, 40 seats, 2h');
  assert.deepEqual(c.map((x) => x.key), ['$1788', '$149', 'july 16', 'july 23', '12 week', '40 seat', '2 hour']);
});

test('malformed input is refused', () => {
  assert.throws(() => answer('', src, TODAY), RangeError);
  assert.throws(() => answer('x'.repeat(601), src, TODAY), RangeError);
  assert.throws(() => answer('q', { pinned: '' }, TODAY), RangeError);
  assert.throws(() => answer('q', { pinned: 'x', context: Array(9).fill({ q: 'a', a: 'b' }) }, TODAY), RangeError);
  assert.throws(() => answer('q', src, '16 Nov'), RangeError);
  assert.throws(() => check('q', '', src), RangeError);
});

test('deterministic: same question, same answer; inputs untouched', () => {
  const copy = structuredClone(src);
  assert.deepEqual(answer('How much does it cost?', src, TODAY), answer('How much does it cost?', src, TODAY));
  assert.deepEqual(src, copy);
});
