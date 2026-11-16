#!/usr/bin/env node
// Read-only scan of the platform repository for price statements, classified by
// capabilities/price-audit/priceInventory.js. It runs `git grep` against a committed ref,
// so it reads no working tree and writes nothing to the platform.
//
//   node scripts/priceInventory.mjs <platform-repo-path> [ref=origin/main] [--json out.json]
//
// Exit 0 with the inventory; exit 2 on bad arguments; exit 1 if the scan found nothing
// (a scan that read nothing is not a clean result).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { scanLines, summarise } from '../capabilities/price-audit/priceInventory.js';

const [repo, refArg, ...rest] = process.argv.slice(2);
if (!repo) {
  console.error('usage: node scripts/priceInventory.mjs <platform-repo-path> [ref] [--json out.json]');
  process.exit(2);
}
const ref = refArg && !refArg.startsWith('--') ? refArg : 'origin/main';
const jsonAt = rest.indexOf('--json') >= 0 ? rest[rest.indexOf('--json') + 1] : (refArg === '--json' ? rest[0] : null);

// Price constants and fallbacks, dollar figures that are plan prices or the retired price,
// and merge tags. Kept broad on purpose: the classifier decides, the grep only collects.
const PATTERNS = [
  '(PRICE|REVENUE_PER|price_per_enrollment)[A-Za-z_]*[[:space:]]*[:=][[:space:]]*[0-9]{3,}',
  '(price|amount|revenue)[A-Za-z_.]*[[:space:]]*(\\|\\||\\?\\?)[[:space:]]*[0-9]{3,}',
  '\\$[[:space:]]?(4,?500|1,?788|149|199|1,?200|950|2,?500|25,?000)([^0-9]|$)',
  '\\{\\{[^}]*price[^}]*\\}\\}',
  'MEMBERSHIP_PRICE\\.|ANNUAL_CHARGE',
];
const TREES = ['backend/src', 'frontend/src', 'frontend/public', 'scripts', 'docs'];

let out = '';
try {
  const commit = execFileSync('git', ['-C', repo, 'rev-parse', '--short', ref], { encoding: 'utf8', timeout: 30000 }).trim();
  const args = ['-C', repo, 'grep', '-n', '-I', '-E'];
  for (const p of PATTERNS) args.push('-e', p);
  args.push(ref, '--', ...TREES);
  out = execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 120000 });
  const lines = out.split('\n').filter(Boolean).map((l) => l.replace(new RegExp(`^${ref.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}:`), ''))
    .filter((l) => !/\.(png|jpe?g|svg|pdf|woff2?|ico|map)(:|$)/i.test(l.split(':')[0]))
    .map((l) => { const [p, n, ...t] = l.split(':'); return `${p}:${n}:${t.join(':').slice(0, 400)}`; });
  const inventory = scanLines(lines);
  if (!inventory.length) { console.error('The scan found nothing: not a clean result.'); process.exit(1); }
  const result = { platform_ref: ref, commit, scanned_trees: TREES, summary: summarise(inventory), inventory };
  if (jsonAt) writeFileSync(jsonAt, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result.summary));
} catch (err) {
  if (err.status === 1 && !out) { console.error('git grep found no matches: not a clean result.'); process.exit(1); }
  console.error(`Scan failed: ${err.message}`);
  process.exit(1);
}
