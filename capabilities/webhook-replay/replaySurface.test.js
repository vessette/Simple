import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const raw = readFileSync(new URL('./replaySurface.json', import.meta.url), 'utf8');
const surface = JSON.parse(raw);
const doc = readFileSync(new URL('./REPLAY_SURFACE_FOR_ROSELEN.md', import.meta.url), 'utf8');

// Acceptance: a written table names all four existing guards and states explicitly which replay
// shapes remain uncovered. This repository is public, so the table here names each gap by its
// effect; the exact shapes and code references are held privately (shared with Kes and Ali).
test('the table names all four existing guards and what each protects', () => {
  assert.deepEqual(surface.guards.map((g) => g.id), ['G1', 'G2', 'G3', 'G4']);
  for (const g of surface.guards) {
    for (const k of ['path', 'covers']) assert.ok(String(g[k] || '').trim(), `${g.id} ${k}`);
    assert.ok(doc.includes(g.path), `the write-up names ${g.id}: ${g.path}`);
  }
});

test('it states explicitly which gaps remain uncovered', () => {
  assert.deepEqual(surface.uncovered.map((u) => u.id), ['U1', 'U2', 'U3', 'U4', 'U5']);
  for (const u of surface.uncovered) {
    assert.ok(String(u.effect || '').trim(), `${u.id} effect`);
    assert.ok(doc.includes(u.effect), `the write-up names ${u.id}: "${u.effect}"`);
  }
});

test('it says plainly that no delivery-level dedup store exists', () => {
  assert.match(surface.no_delivery_store.statement, /no delivery-level dedup store/);
  assert.match(doc, /no delivery-level dedup store/i);
});

test('the watch only reports: nothing here proposes changing a guard as done', () => {
  assert.doesNotMatch(doc, /\b(I|we) (added|changed|fixed) (a|the) guard/i);
  assert.match(doc, /reports only/i);
});

// Failure path: the public files must not regain step-by-step detail before the fixes land.
test('the public files carry no code references or replay mechanics', () => {
  const CODE_REF = /\b[A-Za-z]+\.(ts|js):\d+/;
  for (const [name, text] of [['write-up', doc], ['json', raw]]) {
    assert.doesNotMatch(text, CODE_REF, `${name} has a code reference`);
    assert.doesNotMatch(text, /does_not_cover|"shape"|"why"/, `${name} has replay mechanics`);
  }
  assert.match(doc, /shared with Kes and Ali privately/);
});
