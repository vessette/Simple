import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { answer, refuseProjection, describe, FIGURES } from './revenueAnswers.js';

const fx = JSON.parse(readFileSync(new URL('./fixtures/responses.json', import.meta.url), 'utf8'));
const res = () => structuredClone(fx.responses);
const read = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const PARAM = { plan_roster: 'annual', tenure_roster: 1 };
const keyFor = (src, k) => (FIGURES[k].param ? `${src.endpoint}:${PARAM[k]}` : src.endpoint);

// Acceptance: every figure is reproducible from a named endpoint and filter; the agent
// reports unavailable rather than zero where a source is missing, and never derives
// revenue from a price times a count.
test('every figure is reproducible from a named endpoint, field and filter', () => {
  const r = res();
  let known = 0;
  for (const k of Object.keys(FIGURES)) {
    const a = answer(k, r, PARAM[k]);
    if (a.status !== 'known') continue;
    known++;
    assert.match(a.source.endpoint, /^GET \/api\/admin\/revenue\//, k);
    assert.ok(a.source.filter && a.source.field, `${k}: filter or field missing`);
    const raw = read(r[keyFor(a.source, k)], a.source.field);
    // The figure IS the endpoint's field: nothing computed on top.
    assert.equal(a.value, Array.isArray(raw) ? raw.length : raw, `${k} is not the field's own value`);
    if (Array.isArray(raw)) assert.deepEqual(a.rows, raw);
    assert.ok(a.means, `${k}: no meaning stated`);
  }
  assert.equal(known, Object.keys(FIGURES).length - 1, 'every figure but net revenue is known from these responses');
  assert.equal(answer('plan_roster', r, 'annual').source.filter, 'plan=annual');
  assert.match(answer('mrr', r).source.filter, /all time, no period filter/);
});

test('each figure is read from the field that holds it, pinned', () => {
  const expected = {
    collected_recorded: ['payments', 'summary.collected', 12345.5], memberships_recorded: ['payments', 'summary.memberships', 12195.5],
    deposits_available: ['payments', 'summary.deposits', 150], refunds_succeeded: ['payments', 'summary.refunds', 199],
    collected_less_refunds: ['payments', 'summary.net', 12146.5], mrr: ['subscriptions', 'kpis.mrr', 1543], arr: ['subscriptions', 'kpis.arr', 18516],
    arpu: ['subscriptions', 'kpis.arpu', 171.44], collectible_mrr: ['subscriptions', 'kpis.collectibleMrr', 1195], lapsed_mrr: ['subscriptions', 'kpis.lapsedMrr', 348],
    active_subscribers: ['subscriptions', 'kpis.activeSubscribers', 9], comped_seats: ['subscriptions', 'kpis.compedSeats', 2],
  };
  for (const [k, [ep, field, value]] of Object.entries(expected)) {
    const a = answer(k, res());
    assert.deepEqual([a.source.endpoint, a.source.field, a.value], [`GET /api/admin/revenue/${ep}`, field, value], k);
  }
});

test('a missing source is unavailable with its reason, never zero', () => {
  const r = res();
  delete r['GET /api/admin/revenue/payments'];
  const a = answer('collected_recorded', r);
  assert.deepEqual([a.status, a.value], ['unavailable', null]);
  assert.match(a.reason, /GET \/api\/admin\/revenue\/payments response was not given/);
  const nulled = res(); nulled['GET /api/admin/revenue/subscriptions'].kpis.mrr = null;
  assert.match(answer('mrr', nulled).reason, /no usable kpis\.mrr \(it is null\).*not reported as zero/);
  const text = res(); text['GET /api/admin/revenue/subscriptions'].kpis.arr = '18516';
  assert.equal(answer('arr', text).status, 'unavailable');
  const err = res(); err['GET /api/admin/revenue/subscriptions'] = { error: 'Internal Server Error' };
  assert.match(answer('arpu', err).reason, /returned an error: Internal Server Error/);
  assert.equal(answer('tenure_roster', res(), 2).status, 'unavailable', 'a roster not fetched is unavailable');
  // A real zero in a response is a figure, not a gap.
  const zero = res(); zero['GET /api/admin/revenue/payments'].summary.refunds = 0;
  assert.deepEqual([answer('refunds_succeeded', zero).status, answer('refunds_succeeded', zero).value], ['known', 0]);
});

test('net revenue: the platform marks it unavailable, and Vick says so with its reason', () => {
  const a = answer('net_revenue', res());
  assert.equal(a.status, 'unavailable');
  assert.match(a.reason, /The platform marks net revenue unavailable: "Source IDENTIFIED but not yet wired/);
  assert.equal(a.see_instead, 'collected_less_refunds');
  assert.match(FIGURES.collected_less_refunds.means, /not net revenue as the platform defines it/);
  const r = res(); delete r['GET /api/admin/revenue/dashboard'];
  assert.match(answer('net_revenue', r).reason, /dashboard response that carries the reason was not given/);
  const asked = answer('revenue', res());
  assert.equal(asked.status, 'unavailable');
  assert.match(asked.note, /collected_recorded and collected_less_refunds/);
});

test('never derives revenue from a price times a count: projections are refused as revenue', () => {
  for (const f of ['revenueForecast.projectedRevenue', 'revenueForecast.pipelineValue']) {
    const a = refuseProjection(f);
    assert.equal(a.status, 'refused');
    assert.match(a.reason, /an assumed price .* times a count .* not revenue/);
  }
  assert.throws(() => refuseProjection('summary.collected'), RangeError);
  for (const f of Object.values(FIGURES)) assert.ok(!/projected|pipelineValue|priceAssumption/.test(f.field || ''), 'a figure reads a projection');
  // Changing the assumed price moves no answer Vick gives.
  const r = res(); r['GET /api/admin/revenue/dashboard'].revenueForecast.priceAssumption.value = 4500;
  for (const k of Object.keys(FIGURES)) assert.deepEqual(answer(k, r, PARAM[k]), answer(k, res(), PARAM[k]), k);
});

test('MRR and collected say what they are, so neither is mistaken for cash in the bank', () => {
  assert.match(answer('mrr', res()).means, /run-rate .* not money collected/);
  assert.match(answer('collected_recorded', res()).means, /One amount per enrolment: a scheduled renewal does not add to it/);
  assert.match(answer('tenure_funnel', res()).means, /not retention/);
});

test('rosters: a known plan or month is read; anything else is refused', () => {
  assert.deepEqual(answer('plan_roster', res(), 'annual').rows.map((m) => m.payer_name), ['Person B']);
  assert.equal(answer('tenure_roster', res(), 1).value, 1);
  assert.equal(answer('plan_roster', res(), 'enterprise').status, 'refused');
  assert.equal(answer('tenure_roster', res(), 6).status, 'refused');
  assert.equal(answer('explorers', res()).value, 2);
});

test('describe gives the figure with its endpoint, field and filter', () => {
  assert.equal(describe(answer('mrr', res())).split('. Source')[0], 'MRR: $1,543.00 a month');
  assert.match(describe(answer('mrr', res())), /Source: GET \/api\/admin\/revenue\/subscriptions, field kpis\.mrr, filter none: all time/);
  assert.match(describe(answer('active_subscribers', res())), /^Active subscribers: 9\./);
  assert.match(describe(answer('net_revenue', res())), /^Net revenue: unavailable\./);
});

test('failure paths: unknown figure, bad responses, no figure name', () => {
  assert.equal(answer('profit', res()).status, 'refused');
  assert.throws(() => answer('mrr', null), RangeError);
  assert.throws(() => answer('mrr', []), RangeError);
  assert.throws(() => answer(undefined, res()), RangeError);
});

test('idempotent and read-only: same answer twice, responses untouched', () => {
  const r = res();
  const before = JSON.stringify(r);
  for (const k of Object.keys(FIGURES)) assert.deepEqual(answer(k, r, PARAM[k]), answer(k, r, PARAM[k]));
  assert.equal(JSON.stringify(r), before);
});
