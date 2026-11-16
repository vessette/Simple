import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classify, scanLines, lookup, summarise, isLive } from './priceInventory.js';

const scan = JSON.parse(readFileSync(new URL('./fixtures/inventory-ffc1f0932.json', import.meta.url), 'utf8'));

// Acceptance: the inventory names every known location including the two stale 4500
// constants; a positive control confirms a fabricated location returns no match.
test('the inventory names the two stale $4,500 constants, live', () => {
  for (const loc of ['backend/src/services/opportunityScoringService.ts:18', 'backend/src/services/strategic-intelligence/scenarioSimulationEngine.ts:25']) {
    const hit = lookup(scan.live, loc);
    assert.equal(hit.match, true, `${loc} missing`);
    assert.deepEqual([hit.entry.kind, hit.entry.figures], ['stale', [4500]], loc);
  }
});

test('every location the brief names is in the inventory, with its status today', () => {
  const expect = {
    'backend/src/controllers/salesHubCoryController.ts:28': 'agrees',
    'backend/src/seeds/seedKbData.ts:221': 'reference',
    'backend/src/services/subscriptionService.ts:79': 'reference',
    'frontend/src/pages/PricingPage.tsx:122': 'agrees',
    'backend/src/services/settingsService.ts:9': 'stale',
    'backend/src/services/reporting/coryStrategicSimulationEngine.ts:105': 'assumed_price',
  };
  for (const [loc, kind] of Object.entries(expect)) assert.equal(lookup(scan.live, loc).entry?.kind, kind, loc);
  // The brief's two invoice and dashboard constants are now comments explaining their removal.
  assert.equal(classify('backend/src/services/paysimpleService.ts', 399, ' * It used to be optional, falling back to `params.amount || 4500`. The only').kind, 'comment');
  assert.equal(lookup(scan.live, 'backend/src/services/revenueDashboardService.ts:11').match, false);
});

test('positive control: a fabricated location returns no match, and a planted constant is caught', () => {
  assert.deepEqual(lookup(scan.live, 'frontend/src/pages/NoSuchPricingPage.tsx:42'), { match: false, entry: null });
  assert.deepEqual(lookup(scan.live, 'backend/src/services/opportunityScoringService.ts:19'), { match: false, entry: null });
  const planted = scanLines(['backend/src/services/plantedService.ts:7:const PRICE_PER_ENROLLMENT = 4500;']);
  assert.deepEqual([planted[0].kind, planted[0].live], ['stale', true]);
  assert.equal(lookup(planted, 'backend/src/services/plantedService.ts:7').match, true);
});

test('classification of each kind of line', () => {
  const k = (p, t) => classify(p, 1, t).kind;
  assert.equal(k('backend/src/services/membershipPrice.ts', '  annualPerMonth: 149,'), 'source_of_truth');
  assert.equal(k('backend/src/services/x.ts', 'const REVENUE_PER_ENROLLMENT = 2500;'), 'assumed_price');
  assert.equal(k('frontend/src/pages/Admin.tsx', 'value={settings.price_per_enrollment ?? 4500}'), 'stale');
  assert.equal(k('backend/src/seeds/s.ts', '- Program cost: $4,500 per participant'), 'stale');
  assert.equal(k('backend/src/seeds/s.ts', 'answer: `{{price_annual}} a month`'), 'reference');
  assert.equal(k('frontend/src/x.tsx', "'Join yourself for $149/month'"), 'agrees');
  assert.equal(k('backend/src/services/g.ts', "  `quotes a retired fact (the $4,500 offer)`"), 'mentions_retired');
  assert.equal(k('frontend/public/design/kit.jsx', "{ name: 'Data Science', price: '$4,500' }"), 'other_or_unclear');
  assert.equal(k('backend/src/services/x.ts', '  // used to be $4,500 per seat'), 'comment');
});

test('the live-versus-archive rule', () => {
  const live = (p) => isLive(p).live;
  assert.equal(live('backend/src/services/x.ts'), true);
  assert.equal(live('frontend/public/knowledge/sales/kb-data.js'), true);
  for (const p of ['backend/src/__tests__/a.test.ts', 'frontend/src/x.spec.tsx', 'docs/a.md', 'frontend/src/docs/Kit.md', 'scripts/a.js', 'backend/src/scripts/b.js', 'backend/src/services/agentDomain/capabilities/sales.json', 'nginx/x.conf']) assert.equal(live(p), false, p);
  const planted = scanLines(['docs/archive/old-pricing.md:3:Program cost: $4,500 per participant']);
  assert.deepEqual([planted[0].kind, planted[0].live], ['stale', false], 'an archived $4,500 is reported, never counted as live drift');
});

test('the recorded scan is internally consistent', () => {
  // The fixture lists live entries only, so every entry counts toward the live summary.
  const s = summarise(scan.live.map((x) => ({ ...x, live: true })));
  assert.equal(s.live, scan.summary.live);
  assert.equal(s.stale, scan.summary.stale);
  assert.equal(s.assumed_price, scan.summary.assumed_price);
  assert.equal(s.agrees, scan.summary.agrees);
  assert.ok(scan.live.every((x) => /^[^:]+:\d+$/.test(x.location) && !('text' in x)), 'locations only, no platform code text');
});

test('malformed input is refused; scanning is deterministic', () => {
  assert.throws(() => classify('', 1, 'x'), RangeError);
  assert.throws(() => classify('a.ts', 0, 'x'), RangeError);
  assert.throws(() => scanLines('x'), RangeError);
  assert.throws(() => scanLines(['no colon here']), RangeError);
  const lines = ['backend/src/a.ts:1:const PRICE_X = 4500;', 'frontend/src/b.tsx:2:$149/month'];
  assert.deepEqual(scanLines(lines), scanLines(lines));
});
