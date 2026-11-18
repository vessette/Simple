import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { explainHandoff, SRC, WRONG_PAYER_OWNER } from './handoffExplainer.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/cases.json', import.meta.url), 'utf8'));
const c = (k) => structuredClone(fx.cases[k]);
const kinds = (r) => r.findings.map((f) => f.kind);
const val = (r, what) => r.claims.find((x) => x.what === what);

// Acceptance: every claim traces to a gateway read or a stored row; an unverifiable id is
// reported as unverified rather than as matching.
test('every claim traces to a gateway read or a stored row', () => {
  const ok = new RegExp(`^(${[SRC.sub, SRC.enrol, SRC.payment, SRC.customer].map((s) => s.replace(/[{}/]/g, '\\$&')).join('|')})|^not known|^no id`);
  for (const k of Object.keys(fx.cases)) {
    const r = explainHandoff(c(k));
    for (const cl of r.claims) assert.match(cl.source, ok, `${k}: "${cl.what}" has source "${cl.source}"`);
    for (const f of r.findings) assert.ok(f.source, `${k}: finding ${f.kind} has no source`);
    assert.equal(r.writes, 'none');
  }
});

test('an unverifiable id is unverified, never matching', () => {
  const r = explainHandoff(c('gateway_unread'));
  assert.equal(val(r, 'stored vs charged').value, 'unverified');
  assert.equal(val(r, 'stored id belongs to the payer').value, 'unverified');
  assert.equal(val(r, 'billing account').status, 'unverified');
  assert.ok(kinds(r).includes('unverified'));
  assert.ok(!JSON.stringify(r).includes('same_customer'));
  // A customer record with no email is also unverified, not a match.
  const noEmail = c('same_customer'); noEmail.customers['90010'].Email = '';
  assert.equal(val(explainHandoff(noEmail), 'stored id belongs to the payer').value, 'unverified');
});

test('the hosted page minted its own customer: stored and charged differ, and the account resolves from the first payment', () => {
  const r = explainHandoff(c('hosted_page_minted'));
  assert.equal(val(r, 'stored vs charged').value, 'different_customer');
  assert.match(val(r, 'stored vs charged').why, /bill against the charged customer's account, never the stored id/);
  assert.deepEqual([val(r, 'billing account').value, val(r, 'billing account').status], ['80002', 'resolves']);
  assert.equal(val(r, 'charged id belongs to the payer').value, 'belongs_to_payer');
  assert.deepEqual(kinds(r), [], 'its own enrolment in sharedWith is not a shared id');
});

test('a stored id pointing at someone else, and shared by other enrolments, is flagged, not reconciled', () => {
  const r = explainHandoff(c('poisoned_cache'));
  assert.equal(val(r, 'stored id belongs to the payer').value, 'belongs_to_someone_else');
  assert.ok(kinds(r).includes('id_belongs_to_someone_else'));
  const shared = r.findings.find((f) => f.kind === 'shared_customer_id');
  assert.deepEqual(shared.other_enrolments, ['e7', 'e8']);
  assert.match(shared.why, /exclude it, do not reconcile/);
});

test('an excluded member is reported as excluded, not broken', () => {
  const r = explainHandoff(c('excluded_no_payment'));
  assert.equal(r.excluded, true);
  assert.equal(kinds(r)[0], 'excluded');
  assert.match(r.findings.find((f) => f.kind === 'schedule_account_unresolved').why, /exclusion list, which may explain it/);
  assert.equal(val(r, 'billing account').status, 'unresolved');
});

test('a clean handoff: same customer, belongs to the payer, no findings', () => {
  const r = explainHandoff(c('same_customer'));
  assert.equal(val(r, 'stored vs charged').value, 'same_customer');
  assert.equal(val(r, 'stored id belongs to the payer').value, 'belongs_to_payer');
  assert.deepEqual(kinds(r), []);
});

test('malformed input is refused; nothing is modified', () => {
  assert.throws(() => explainHandoff(null), RangeError);
  assert.throws(() => explainHandoff({ subscription: {}, enrollment: { email: 'a@b.c' } }), RangeError);
  assert.throws(() => explainHandoff({ subscription: { id: 's' }, enrollment: {} }), RangeError);
  assert.throws(() => explainHandoff({ ...c('same_customer'), payment: 'x' }), RangeError);
  const input = c('poisoned_cache'); const copy = structuredClone(input);
  assert.deepEqual(explainHandoff(input), explainHandoff(input));
  assert.deepEqual(input, copy);
});

// The sales manager's answer (18 Nov 2026): an id that belongs to someone else goes to admissions operations.
test('an id that belongs to someone else is routed to admissions operations; other findings carry no owner', () => {
  const r = explainHandoff(c('poisoned_cache'));
  const f = r.findings.find((x) => x.kind === 'id_belongs_to_someone_else');
  assert.equal(f.goes_to, WRONG_PAYER_OWNER);
  assert.match(WRONG_PAYER_OWNER, /^Admissions operations/);
  for (const x of r.findings.filter((y) => y.kind !== 'id_belongs_to_someone_else')) assert.equal(x.goes_to, undefined, x.kind);
});
