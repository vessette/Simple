// Price-statement inventory, autonomy:R0.
// Capability: sales.price_statement_consistency_audit. Read-only: it lists every place the
// platform states or derives a price and says whether each agrees with the price of record.
// It never edits a price; a person decides which number is right.
//
// classify() is pure: one scanned line in, one verdict out. scanLines() takes grep-style lines
// ("path:line:text") so the scan itself (scripts/priceInventory.mjs) stays a thin, read-only
// wrapper around `git grep` on the platform repository.
//
// Platform price of record:
//   membership   backend/src/services/membershipPrice.ts:44-58 ($149/mo annual = $1,788/yr; $199 monthly)
//   team seats   frontend/src/config/claimsRegistry.ts:486-506 ($1,200 Team, $950 Department)

export const RECORD = Object.freeze({
  membership: Object.freeze([149, 199, 1788]),
  team: Object.freeze([1200, 950]),
  tooling: Object.freeze([10, 20]), // student-paid Anthropic and API costs, not our price
});
export const STALE = Object.freeze([4500]); // retired 13 Jul 2026; nobody was ever charged it
export const SOURCES_OF_TRUTH = Object.freeze(['backend/src/services/membershipPrice.ts', 'frontend/src/config/claimsRegistry.ts']);

/**
 * The live-versus-archive rule (PROPOSED, for the sales manager and program lead to confirm).
 * A location is LIVE if production runs it or serves it to a person:
 *   backend/src/** (not tests, not one-off scripts), frontend/src/** (not tests, not docs),
 *   frontend/public/** (served as static files).
 * Everything else is NOT LIVE and cannot quote a price to a prospect:
 *   tests; docs/ and any .md under frontend/src/docs (not imported by any page);
 *   repo-root scripts/ and backend/src/scripts/ (operator tools); the agent-domain spec files,
 *   which describe code rather than state prices.
 */
export function isLive(path) {
  const p = String(path);
  if (/(^|\/)(__tests__|tests?)\//.test(p) || /\.(test|spec)\.[jt]sx?$/.test(p)) return { live: false, why: 'test file' };
  if (p.startsWith('docs/') || p.startsWith('frontend/src/docs/')) return { live: false, why: 'documentation, not served' };
  if (p.startsWith('scripts/') || p.startsWith('backend/src/scripts/')) return { live: false, why: 'operator script' };
  if (p.startsWith('backend/src/services/agentDomain/capabilities/')) return { live: false, why: 'capability spec text' };
  if (p.startsWith('backend/src/') || p.startsWith('frontend/src/') || p.startsWith('frontend/public/')) return { live: true, why: 'runs or is served in production' };
  return { live: false, why: 'outside the served and executed trees' };
}

const CONSTANT = /\b(PRICE|REVENUE_PER|price_per_enrollment)[A-Za-z_]*\s*[:=]\s*(\d{3,})/;
const FALLBACK = /(price|amount|revenue)[\w.]*\s*(\|\||\?\?)\s*(\d{3,})\b/i;
const MERGE_TAG = /\{\{\s*[\w.]*price[\w.]*\s*\}\}|\$\{\s*MEMBERSHIP_PRICE|\bMEMBERSHIP_PRICE\.|\bANNUAL_CHARGE\b/;
// "price" alone is not enough: the design kit lists other programs' prices (Data Science is
// really $4,500), so a bare `price: '$4,500'` is left for a person rather than called stale.
const MEMBERSHIP_CONTEXT = /membership|founding|annual|monthly|month|\/\s?mo\b|billed|enrol|enroll|per (seat|participant|leader|person)|tuition|cost|investment|program|accelerator|pay-in-full|one-time/i;
// A line that names the retired price in order to reject it or explain its history.
const RETIRED_MENTION = /retired|retire|used to|no longer|never (been )?charged|nobody (was|has)|must never|quotes a retired|old \$|stale|hardcoded|fabricat/i;
const CODE_FILE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const COMMENT_LINE = /^\s*(\*|\/\/|\/\*)/;
const OTHER_PRODUCT = /data analytics|data science|bootcamp|proposal|consult|anthropic|api usage|claude code/i;
const dollars = (t) => [...String(t).matchAll(/\$\s?(\d{1,3}(?:,\d{3})+|\d{2,})(?:\.\d+)?/g)].map((m) => Number(m[1].replace(/,/g, '')));

/**
 * One verdict for one line. kind: source_of_truth | reference | stale | assumed_price |
 * agrees | other_or_unclear. A location that is not live keeps its verdict but is marked
 * live: false, so archives are reported, never counted as drift.
 */
export function classify(path, line, text) {
  if (typeof path !== 'string' || !path || !Number.isInteger(line) || line < 1 || typeof text !== 'string') {
    throw new RangeError('classify needs a path, a line number and the line text.');
  }
  const where = `${path}:${line}`;
  const live = isLive(path);
  const base = { location: where, path, line, text: text.trim().slice(0, 200), live: live.live, live_why: live.why };
  if (SOURCES_OF_TRUTH.includes(path)) return { ...base, kind: 'source_of_truth', figures: dollars(text) };
  if (CODE_FILE.test(path) && COMMENT_LINE.test(text)) return { ...base, live: false, live_why: 'code comment, never shown to anyone', kind: 'comment', figures: dollars(text) };
  const c = text.match(CONSTANT) || text.match(FALLBACK);
  if (c) {
    const n = Number(c[c.length - 1]);
    if (STALE.includes(n)) return { ...base, kind: 'stale', figures: [n], why: `A price constant or fallback of ${n}: the retired $4,500, which nobody was ever charged.` };
    if (!RECORD.membership.includes(n) && !RECORD.team.includes(n)) return { ...base, kind: 'assumed_price', figures: [n], why: `A private per-enrolment figure of ${n} that matches no price of record.` };
  }
  if (MERGE_TAG.test(text)) return { ...base, kind: 'reference', figures: [], why: 'Reads the price of record (merge tag or import), so it cannot drift.' };
  const figs = dollars(text);
  if (!figs.length) return { ...base, kind: 'other_or_unclear', figures: [], why: 'No dollar figure on the line.' };
  if (figs.some((f) => STALE.includes(f)) && RETIRED_MENTION.test(text)) return { ...base, kind: 'mentions_retired', figures: figs, why: 'Names $4,500 in order to reject it or explain it is retired; not a price statement.' };
  if (figs.some((f) => STALE.includes(f)) && MEMBERSHIP_CONTEXT.test(text) && !OTHER_PRODUCT.test(text)) {
    return { ...base, kind: 'stale', figures: figs, why: 'States $4,500 in a membership or enrolment context.' };
  }
  const record = [...RECORD.membership, ...RECORD.team, ...RECORD.tooling];
  if (MEMBERSHIP_CONTEXT.test(text) && figs.every((f) => record.includes(f))) return { ...base, kind: 'agrees', figures: figs, why: 'Every figure on the line is a price of record.' };
  return { ...base, kind: 'other_or_unclear', figures: figs, why: OTHER_PRODUCT.test(text) ? 'Another product or a third-party cost.' : 'A dollar figure Vick cannot place; a person should look.' };
}

/** Parse "path:line:text" grep output and classify every line. Unparseable lines are refused. */
export function scanLines(lines) {
  if (!Array.isArray(lines)) throw new RangeError('scanLines takes an array of grep lines.');
  return lines.filter((l) => l.trim()).map((l) => {
    const m = /^([^:]+):(\d+):(.*)$/.exec(l);
    if (!m) throw new RangeError(`Not a grep line: ${l.slice(0, 80)}`);
    return classify(m[1], Number(m[2]), m[3]);
  });
}

/** Does the inventory name this location? A fabricated one must return no match. */
export function lookup(inventory, location) {
  const hit = inventory.find((x) => x.location === location);
  return hit ? { match: true, entry: hit } : { match: false, entry: null };
}

/** Counts per kind, live only, for the summary. */
export function summarise(inventory) {
  const live = inventory.filter((x) => x.live);
  const by = (k) => live.filter((x) => x.kind === k).length;
  return { scanned: inventory.length, live: live.length, not_live: inventory.length - live.length, stale: by('stale'), assumed_price: by('assumed_price'), agrees: by('agrees'), reference: by('reference'), source_of_truth: by('source_of_truth'), mentions_retired: by('mentions_retired'), unclear: by('other_or_unclear') };
}
