// Recurring reporting duty list: shape and readiness check, autonomy:R0.
// Capability: sales.da_revenue_reporting_transition. Nothing here drafts a report. The duty list
// has to be written by interviewing the people who do the reporting; this module only says
// whether a list meets the story's bar, so the answer is mechanical once it exists.
//
// The bar (the story's acceptance): at least one named report per duty, and a named data source
// or an explicit "unsourced" per report. On top of that, a list only counts once it records who
// was interviewed and every report is confirmed by them; a list of candidates is not a duty list.

const FIVE = Object.freeze(['data_source', 'recipient', 'cadence', 'timezone', 'channel']);

/** Problems that stop this list meeting the bar. An empty array means it does. */
export function readiness(list) {
  if (!list || typeof list !== 'object' || !Array.isArray(list.duties)) throw new RangeError('A duty list with a duties array is required.');
  const problems = [];
  if (!list.interviewed || typeof list.interviewed !== 'object' || !list.interviewed.who || !list.interviewed.on) {
    problems.push('No interview recorded (who and when). Candidates are not a duty list.');
  }
  if (list.duties.length === 0) problems.push('No duties listed.');
  for (const d of list.duties) {
    if (!d || !String(d.duty || '').trim()) { problems.push('A duty has no name.'); continue; }
    const reports = Array.isArray(d.reports) ? d.reports : [];
    if (!reports.length) problems.push(`"${d.duty}" names no report.`);
    for (const r of reports) {
      if (!String(r.name || '').trim()) problems.push(`A report under "${d.duty}" has no name.`);
      const src = String(r.data_source || '').trim();
      if (!src) problems.push(`"${r.name}" has neither a data source nor "unsourced".`);
      if (r.confirmed !== true) problems.push(`"${r.name}" is not confirmed by the interview.`);
    }
  }
  return problems;
}

/** What the interview still has to fill in, per report: the five dimensions plus who does it today. */
export function gaps(list) {
  if (!list || !Array.isArray(list.duties)) throw new RangeError('A duty list with a duties array is required.');
  return list.duties.flatMap((d) => (d.reports || []).map((r) => ({
    report: r.name,
    missing: [...FIVE, 'done_by_today', 'candidate_for_drafting'].filter((k) => r[k] === null || r[k] === undefined || r[k] === ''),
  })));
}

/** The honest scope statement until the list meets the bar. */
export const scope = (list) => (readiness(list).length === 0 ? 'known' : 'unknown');
