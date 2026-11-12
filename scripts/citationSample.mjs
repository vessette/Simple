// Pure sampling and ranking rules for scripts/checkCitations.mjs: no git, no files, no I/O.
//
// Two different jobs, kept apart on purpose:
//   sample()  a seeded random draw, spread across capabilities in proportion to their size,
//             used to ESTIMATE how many unlabelled citations are wrong.
//   rank()    an ordering by consequence, used to decide what to FIX first. A ranked list
//             over-represents the risky citations, so it must never be reported as an estimate.

/** Seeded PRNG (mulberry32): the same seed always draws the same sample. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many to take from each group: proportional, largest remainder, totals exactly n. */
export function allocate(sizes, n) {
  const total = Object.values(sizes).reduce((a, b) => a + b, 0);
  if (n >= total) return { ...sizes };
  const keys = Object.keys(sizes).sort();
  const exact = keys.map((k) => (sizes[k] * n) / total);
  const take = Object.fromEntries(keys.map((k, i) => [k, Math.floor(exact[i])]));
  let left = n - Object.values(take).reduce((a, b) => a + b, 0);
  const byRemainder = keys.map((k, i) => [k, exact[i] - Math.floor(exact[i])]).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
  for (const [k] of byRemainder) { if (left-- <= 0) break; take[k]++; }
  return take;
}

/** A stratified seeded sample of n rows, grouped by `key`. Input order does not matter. */
export function sample(rows, n, seed, key = (r) => r.cap) {
  const groups = {};
  for (const r of [...rows].sort((a, b) => `${key(a)}|${a.text}`.localeCompare(`${key(b)}|${b.text}`))) {
    (groups[key(r)] ??= []).push(r);
  }
  const take = allocate(Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])), n);
  const next = rng(seed);
  const out = [];
  for (const k of Object.keys(groups).sort()) {
    const pool = [...groups[k]];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    out.push(...pool.slice(0, take[k] ?? 0));
  }
  return out;
}

const MONEY = { moves_money: 3, reports_only: 1, none: 0 };
const FIELD = { blocked_by: 2, release_behaviour: 2, supporting_evidence: 1 };

/** Consequence score: what the capability touches, where the citation is used, and whether its file has already drifted. */
export function score(r, cap, driftedFiles) {
  return (MONEY[cap.financial_consequence] ?? 0) + (cap.human_decision ? 1 : 0) + (FIELD[r.field] ?? 0) + (driftedFiles.has(r.path) ? 2 : 0);
}

/** Rows ordered by consequence, highest first; ties broken by capability then citation. */
export function rank(rows, capsById, driftedFiles) {
  return rows.map((r) => ({ ...r, score: score(r, capsById[r.cap], driftedFiles) }))
    .sort((a, b) => b.score - a.score || a.cap.localeCompare(b.cap) || a.text.localeCompare(b.text));
}

/** Wilson 95% interval for k wrong out of n, as whole percentages. */
export function wilson(k, n) {
  if (n === 0) return null;
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d, h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.round((c - h) * 100), Math.round((c + h) * 100)];
}
