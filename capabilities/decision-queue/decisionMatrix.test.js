import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const matrix = JSON.parse(readFileSync(new URL('./decisionMatrix.json', import.meta.url), 'utf8'));
const plan = JSON.parse(readFileSync(new URL('.colaberry/plan.json', root), 'utf8'));
const caps = (plan.stories || []).filter((s) => /^sales\.CAP\.[a-z_]+$/.test(s.id)).map((s) => s.id.replace('sales.CAP.', ''));
const TYPES = ['rule', 'owner', 'threshold', 'wording', 'policy', 'access'];

// Acceptance: every capability in this matrix names the decision it needs from Roselyn, and no
// capability claims a confirmed requirement.
test('every capability in the plan names the decision it needs from the sales manager', () => {
  assert.equal(caps.length, 32);
  const rows = new Map(matrix.decisions.map((d) => [d.capability, d]));
  for (const c of caps) {
    const r = rows.get(c);
    assert.ok(r, `${c} has no row`);
    assert.ok(typeof r.decision === 'string' && r.decision.trim().length > 20, `${c}: no real decision named`);
    assert.ok(TYPES.includes(r.type), `${c}: type ${r.type}`);
  }
  assert.equal(matrix.decisions.length, caps.length, 'no extra rows for capabilities the plan does not have');
  assert.equal(new Set(matrix.decisions.map((d) => d.capability)).size, matrix.decisions.length, 'one row per capability');
});

test('no capability claims a confirmed requirement', () => {
  for (const r of matrix.decisions) {
    assert.equal(r.status, 'awaiting', `${r.capability} claims ${r.status}`);
    assert.doesNotMatch(r.decision, /\bconfirmed by\b|\bapproved by\b|\bsigned off by\b/i, `${r.capability} reads as already decided`);
  }
  const doc = readFileSync(new URL('./DECISION_QUEUE_FOR_ROSELEN.md', import.meta.url), 'utf8');
  assert.doesNotMatch(doc, /\|\s*confirmed\s*\|/i, 'the write-up shows no row as confirmed');
});

test('every decision points at evidence that exists', () => {
  for (const r of matrix.decisions) {
    if (r.evidence.startsWith('the capability brief')) continue;
    const path = r.evidence.split(' and ')[0];
    assert.ok(existsSync(new URL(path, root)), `${r.capability}: ${path} does not exist`);
  }
});
