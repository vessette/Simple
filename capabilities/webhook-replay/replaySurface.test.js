import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const surface = JSON.parse(readFileSync(new URL('./replaySurface.json', import.meta.url), 'utf8'));
const doc = readFileSync(new URL('./REPLAY_SURFACE_FOR_ROSELEN.md', import.meta.url), 'utf8');
const CITE = /^[A-Za-z]+\.ts:\d+/;

// Acceptance: a written table names all four existing guards and states explicitly which replay
// shapes remain uncovered.
test('the table names all four existing guards, each with its key and the code that holds it', () => {
  assert.deepEqual(surface.guards.map((g) => g.id), ['G1', 'G2', 'G3', 'G4']);
  for (const g of surface.guards) {
    for (const k of ['path', 'entry', 'key', 'cite', 'covers']) assert.ok(String(g[k] || '').trim(), `${g.id} ${k}`);
    assert.match(g.cite, CITE, g.id);
    assert.match(g.entry, CITE, g.id);
  }
  for (const g of surface.guards) assert.ok(doc.includes(g.cite), `the write-up's table cites ${g.cite}`);
});

test('it states explicitly which replay shapes remain uncovered, and each guard says which it misses', () => {
  const ids = surface.uncovered.map((u) => u.id);
  assert.ok(ids.length >= 1);
  for (const u of surface.uncovered) for (const k of ['shape', 'effect', 'why']) assert.ok(String(u[k] || '').trim(), `${u.id} ${k}`);
  for (const g of [...surface.guards, ...surface.also_checked]) for (const u of g.does_not_cover) assert.ok(ids.includes(u), `${g.id || g.path}: unknown shape ${u}`);
  for (const u of surface.uncovered) assert.ok(doc.includes(u.shape), `the write-up names "${u.shape}"`);
  // The brief's named gap: a replay with a different payment id on the recurring path.
  assert.ok(surface.guards.find((g) => g.id === 'G3').does_not_cover.includes('U1'));
});

test('it says plainly that no delivery-level dedup store exists', () => {
  assert.match(surface.no_delivery_store.statement, /no delivery-level dedup store/);
  assert.match(doc, /no delivery-level dedup store/i);
});

test('the watch only reports: nothing here proposes changing a guard as done', () => {
  assert.doesNotMatch(doc, /\b(I|we) (added|changed|fixed) (a|the) guard/i);
  assert.match(doc, /reports only/i);
});
