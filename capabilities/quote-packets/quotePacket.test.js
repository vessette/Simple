import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { assemblePacket, checkPacket, approvedSources } from './quotePacket.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const pinned = read('../prospect-kb-answers/fixtures/pinned.json');
const registry = read('../team-licenses/fixtures/sources.json');
const fx = read('./fixtures/requests.json');
const R = (label) => structuredClone(fx.requests.find((r) => r.label === label));
const base = { preparedFor: 'Roselen', pinned, registry };
const src = approvedSources(pinned, registry);
const disclose = ' Each participant also pays about $20/mo for Anthropic and under $10/mo for API usage.';

// Acceptance: a packet containing a discount, a bespoke price, a refund term or the word 'free'
// fails a named test.
test('a packet with a discount fails', () => {
  for (const t of ['We can offer a 10% discount for your team.', 'Take 15% off this month.', 'A special price for early sign-up.', 'We will waive the first month.']) {
    const r = checkPacket(t + disclose, src);
    assert.equal(r.pass, false, t);
    assert.match(r.problems.join(' '), /Discount or special terms/, t);
  }
});

test('a packet with a bespoke price fails', () => {
  for (const t of ['Membership is $129/mo billed annually.', 'For 20 seats, $900 per seat, per year.', 'Total: $19,000.']) {
    const r = checkPacket(t + disclose, src);
    assert.equal(r.pass, false, t);
    assert.match(r.problems.join(' '), /Bespoke price \(not in an approved source\)/, t);
  }
});

test('a packet with a refund term fails', () => {
  const r = checkPacket('Full refund within 14 days if you cancel.' + disclose, src);
  assert.equal(r.pass, false);
  assert.match(r.problems.join(' '), /refunds or cancellation/);
});

test("a packet with the word 'free' fails", () => {
  const r = checkPacket('Your first week is free.' + disclose, src);
  assert.equal(r.pass, false);
  assert.match(r.problems.join(' '), /Banned word "free"/);
});

test('baseline: every fixture assembles into a packet that passes its own check', () => {
  for (const req of fx.requests) {
    const p = assemblePacket({ ...base, request: R(req.label) });
    assert.equal(p.status, 'draft_for_human', `${req.label}: ${p.check.problems.join(' ')}`);
    assert.equal(p.committed_price, null);
    assert.doesNotMatch(p.text, /\bfree\b|refund|discount/i);
  }
});

test('team packets quote the published tier per seat and never compute a total', () => {
  const a = assemblePacket({ ...base, request: R('Employer A') });
  assert.match(a.text, /published Team tier is \$1,200 per seat, per year/);
  const b = assemblePacket({ ...base, request: R('Employer B') });
  assert.match(b.text, /published Department tier is \$950 per seat, per year/);
  for (const p of [a, b]) assert.doesNotMatch(p.text, /\$9,600|\$19,000|total of \$/i);
});

test('what the packet cannot state is listed for the human, including the buyer\'s asks', () => {
  const b = assemblePacket({ ...base, request: R('Employer B') });
  const items = b.cannot_state.map((c) => c.item);
  assert.ok(items.includes('Refund and cancellation terms'));
  assert.ok(items.some((i) => /a discount for 20 seats/.test(i)));
  assert.ok(items.some((i) => /refund terms/.test(i)));
  assert.match(assemblePacket({ ...base, request: R('Employer C') }).cannot_state[0].why, /scoped on a call/);
  assert.match(assemblePacket({ ...base, request: R('Employer D') }).cannot_state[0].why, /below the smallest team tier/);
});

test('if a tier price copy disagrees, the packet does not quote it', () => {
  const reg = structuredClone(registry);
  reg.copies.push({ claim: 'pricing.team', where: 'frontend/src/pages/Example.tsx:1', value: '$1,100' });
  const p = assemblePacket({ ...base, registry: reg, request: R('Employer A') });
  assert.doesNotMatch(p.text, /\$1,200|\$1,100/);
  assert.match(p.cannot_state[0].why, /can't be quoted/);
});

test('no send path, and malformed input is refused', () => {
  const code = readdirSync(new URL('.', import.meta.url)).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
    .map((f) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8')).join('\n');
  assert.doesNotMatch(code, /\bfetch\(|https?:\/\/|nodemailer|mandrill|sendMail|child_process/i);
  assert.throws(() => assemblePacket({ ...base, request: { label: 'x', kind: 'bulk' } }), RangeError);
  assert.throws(() => assemblePacket({ ...base, preparedFor: '', request: R('P1') }), RangeError);
  assert.throws(() => checkPacket('', src), RangeError);
});
