// Pure matching rules for scripts/checkCitations.mjs: no git, no files, no I/O.

/** A citation: `path:line` or `path:start-end`, optionally followed by `(label)`. */
export const CITE = /((?:[\w.-]+\/)*[\w.-]+\.(?:ts|tsx|js|mjs|md|json|sql|yml|sh)):(\d+)(?:-(\d+))?(?:\s*\(([^)]*)\))?/g;

/** Lines either side of the cited range that still count as "in range". */
export const SLACK = 2;

// Text reduced to lower-case words, so case, punctuation, comment markers and line wraps
// do not decide a match ("ROAS" vs 'marketing.roas', a quote that wraps across lines).
export const flat = (s) => ` ${s.toLowerCase().replace(/[^a-z0-9_]+/g, ' ').trim()} `;
export const has = (text, t) => text.includes(` ${flat(t).trim()} `);

// Only code-shaped names count: camelCase, snake_case, ALL_CAPS or a call like foo().
// Plain words ("update", "dates") would match anywhere and prove nothing.
const CODE_NAME = /^(?:[a-z]+[A-Z]\w*|[A-Za-z]+_\w+|[A-Z][A-Z0-9_]{2,}|[A-Za-z_$][\w$]*\(\))$/;

/** Label tokens worth searching for: code names, or the first five words of a quoted phrase. */
export function tokens(label) {
  if (!label) return [];
  const quoted = [...label.matchAll(/['"‘“]([^'"’”]{12,})['"’”]/g)].map((m) => flat(m[1]).trim().split(' ').slice(0, 5).join(' '));
  if (quoted.length) return quoted;
  return label.split(/[\s,;/:]+/).map((t) => t.trim()).filter((t) => CODE_NAME.test(t)).map((t) => t.replace(/\(\)$/, ''));
}

/** Where a name is defined, else where it first appears (0-based), else -1. */
export function locate(src, t) {
  const esc = t.replace(/[$.]/g, '\\$&');
  const def = new RegExp(`(?:function|const|let|class|interface|type|enum)\\s+${esc}\\b|^\\s*${esc}\\s*[:(]`);
  const d = src.findIndex((l) => def.test(l));
  if (d >= 0) return d;
  if (!has(flat(src.join('\n')), t)) return -1;
  return src.findIndex((l, i) => has(flat(src.slice(i, i + 4).join('\n')), t));
}

/** Check one citation against a file's lines (null if the file does not exist). */
export function checkSource(src, start, end, label) {
  if (!src) return { verdict: 'no_file' };
  if (start > src.length) return { verdict: 'out_of_range', detail: `file has ${src.length} lines` };
  const toks = tokens(label);
  if (!toks.length) return { verdict: 'unlabelled' };
  const lo = Math.max(0, start - 1 - SLACK), hi = Math.min(src.length, (end ?? start) + SLACK);
  const window = flat(src.slice(lo, hi).join('\n'));
  if (toks.every((t) => has(window, t))) return { verdict: 'ok' };
  const where = toks.map((t) => {
    const at = locate(src, t);
    return at < 0 ? null : `${t} at :${at + 1}`;
  });
  if (where.includes(null)) return { verdict: 'missing', detail: toks.filter((_, i) => !where[i]).join(', ') + ' not in file' };
  return { verdict: 'moved', detail: where.join('; ') };
}

const BAD = new Set(['moved', 'missing', 'no_file', 'out_of_range']);

/** Combine the verdicts at the research commit and the later commit into one result. */
export function classify(then, now) {
  if (then === 'no_file' && now === 'no_file') return 'not in repo';
  if (then === 'ok' && BAD.has(now)) return 'drifted';
  // The file did not exist when researched, so the citation was written later: no baseline.
  if (then === 'no_file' && BAD.has(now)) return 'wrong now';
  if (BAD.has(then) && BAD.has(now)) return 'never right';
  if (now === 'ok') return 'correct';
  if (now === 'unlabelled') return 'unverifiable';
  return 'other';
}
