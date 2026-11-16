import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { draftOutreach, checkDraft, FREE_RULE } from './draftOutreach.js';

const pinned = JSON.parse(readFileSync(new URL('../prospect-kb-answers/fixtures/pinned.json', import.meta.url), 'utf8'));
const fx = JSON.parse(readFileSync(new URL('./fixtures/prospects.json', import.meta.url), 'utf8'));
const src = { pinned: pinned.pinned_facts, context: pinned.context };
const P = (label) => structuredClone(fx.prospects.find((p) => p.label === label));
const base = { sender: 'Roselen', src, asOf: '2026-11-16' };

// Acceptance: baseline tests pass, and a draft containing an untraceable price or the word
// 'free' fails a named test.
test('baseline: every kind of draft for every unsuppressed fixture passes its own check', () => {
  for (const p of fx.prospects.filter((x) => !x.suppressed)) {
    for (const kind of ['intro', 'follow_up', 'pricing']) {
      const d = draftOutreach({ ...base, prospect: P(p.label), kind });
      assert.equal(d.status, 'draft_for_review', `${p.label} ${kind}: ${d.check.problems.join(' ')}`);
      assert.equal(d.for_review_by, 'Roselen');
      for (const c of d.check.claims) assert.ok(c.source, `${c.raw} untraced`);
    }
  }
});

test('a draft with an untraceable price fails', () => {
  const r = checkDraft('Hi P1,\n\nMembership is $129/mo billed annually. Students also pay about $20/mo for Anthropic and under $10/mo for API usage.', src);
  assert.equal(r.pass, false);
  assert.match(r.problems.join(' '), /Ungrounded price: "\$129"/);
  assert.equal(checkDraft('Enroll today for $4,500.', src).pass, false);
});

test('a draft containing the word "free" fails, citing the rule and its alternatives', () => {
  const r = checkDraft('Join our free Open House to learn more.', src);
  assert.equal(r.pass, false);
  assert.match(r.problems.join(' '), /Banned word "free" \(bannedCopyRule\.ts:108-113.*Use "\$0 to start" or "No card needed"/);
  for (const t of ['FREE seats left', 'Free!', 'It is free.']) assert.equal(checkDraft(t, src).pass, false, t);
  for (const t of ['Feel freely welcome.', 'Freedom to build.']) assert.equal(checkDraft(t, src).pass, true, t);
  assert.equal(FREE_RULE.id, 'tac-807-172-d-free');
});

test('drafts never use "free", even though the pinned facts say "free Open House"', () => {
  assert.match(pinned.pinned_facts, /\bfree Open House\b/, 'the source really does contain the banned word');
  for (const asOf of ['2026-07-01', '2026-11-16']) {
    for (const kind of ['intro', 'follow_up', 'pricing']) {
      assert.doesNotMatch(draftOutreach({ ...base, asOf, prospect: P('P1'), kind }).body, /\bfree\b/i);
    }
  }
  assert.match(draftOutreach({ ...base, asOf: '2026-07-01', prospect: P('P1'), kind: 'intro' }).body, /Key dates: Open House Thursday July 16, 2026/);
});

test('no refund or cancellation claim; cost drafts disclose the student-paid tools', () => {
  assert.equal(checkDraft('You can cancel anytime and get a refund.', src).pass, false);
  const d = draftOutreach({ ...base, prospect: P('P1'), kind: 'pricing' });
  assert.doesNotMatch(d.body, /refund|cancel/i, 'the "(cancel anytime)" in the pinned price sentence is not carried into a draft');
  assert.match(d.body, /Anthropic subscription for Claude Code \(about \$20\/mo\).*under \$10\/mo/s);
});

test('dates that have passed are never offered', () => {
  const d = draftOutreach({ ...base, prospect: P('P1'), kind: 'intro' });
  assert.doesNotMatch(d.body, /July 16|July 23/);
  assert.match(d.body, /confirm the next cohort's dates with you directly/);
});

test('a suppressed prospect gets no draft', () => {
  const d = draftOutreach({ ...base, prospect: P('P3'), kind: 'intro' });
  assert.deepEqual([d.status, d.draft], ['refused', null]);
});

test('no send path: a draft has nothing a sender could pick up, and this module calls nothing', () => {
  const d = draftOutreach({ ...base, prospect: P('P1'), kind: 'intro' });
  for (const k of ['send', 'queue', 'schedule', 'to', 'email', 'recipient', 'send_at']) assert.ok(!(k in d), `draft has a ${k} field`);
  const code = readdirSync(new URL('.', import.meta.url)).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
    .map((f) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(code, /\bfetch\(|https?:\/\/|nodemailer|mandrill|sendMail|child_process|require\(|\bimport\(/i);
});

test('malformed input is refused', () => {
  assert.throws(() => draftOutreach({ ...base, prospect: null, kind: 'intro' }), RangeError);
  assert.throws(() => draftOutreach({ ...base, prospect: P('P1'), kind: 'blast' }), RangeError);
  assert.throws(() => draftOutreach({ ...base, sender: ' ', prospect: P('P1'), kind: 'intro' }), RangeError);
  assert.throws(() => draftOutreach({ ...base, asOf: 'today', prospect: P('P1'), kind: 'intro' }), RangeError);
  assert.throws(() => checkDraft('', src), RangeError);
});
