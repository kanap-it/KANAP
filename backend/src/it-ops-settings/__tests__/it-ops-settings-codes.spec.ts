import * as assert from 'node:assert/strict';
import { generateCatalogCode, prepareCatalogListForWrite, slugifyCatalogCode } from '../catalog-codes';
import { exportCatalogLabels, findCatalogOption, resolveCatalogCode } from '../catalog-resolve';

// Generation: accents, punctuation, no usable ASCII, truncation leaves room for the suffix.
assert.equal(slugifyCatalogCode('Élevée — niveau 2'), 'elevee_niveau_2');
assert.equal(slugifyCatalogCode('  Line-of-business '), 'line_of_business');
assert.equal(slugifyCatalogCode('日本語'), '');
assert.equal(generateCatalogCode('日本語', new Set()), 'value');
assert.equal(generateCatalogCode('日本語', new Set(['value'])), 'value_2');
const long = 'a'.repeat(80);
assert.equal(generateCatalogCode(long, new Set()).length, 56);
assert.equal(generateCatalogCode(long, new Set(['a'.repeat(56)])), `${'a'.repeat(56)}_2`);

// Explicit codes are reserved first, whatever the row order.
const prepared = prepareCatalogListForWrite([
  { label: 'Alpha beta' },
  { code: 'alpha_beta', label: 'Original' },
  { label: 'Alpha beta 2' },
], { listName: 'Test' });
assert.deepEqual(prepared.map((row) => row.code), ['alpha_beta_2', 'alpha_beta', 'alpha_beta_2_2']);

// Alias rule: an alias designates one entry; identical aliases on the same entry are fine.
prepareCatalogListForWrite([{ code: 'high', label: 'high' }, { code: 'low', label: 'Low' }], { listName: 'Test' });
assert.throws(() => prepareCatalogListForWrite([{ code: 'a', label: 'Same' }, { code: 'b', label: ' same ' }], { listName: 'Test' }), /clashes with/);
assert.throws(() => prepareCatalogListForWrite([{ code: 'high', label: 'Élevée' }, { code: 'custom', label: 'high' }], { listName: 'Test' }), /clashes with/);
assert.throws(() => prepareCatalogListForWrite([{ code: 'a', label: 'A' }, { code: 'a', label: 'B' }], { listName: 'Test' }), /appears twice/);
assert.throws(() => prepareCatalogListForWrite([{ code: 'a', label: '' }], { listName: 'Test' }), /needs a name/);
assert.throws(() => prepareCatalogListForWrite([{ code: 'a', label: 'Web, mobile' }], { listName: 'Test', commaSeparatedInCsv: true }), /comma/);
prepareCatalogListForWrite([{ code: 'a', label: 'Web, mobile' }], { listName: 'Test' });
assert.throws(() => prepareCatalogListForWrite([{ code: 'Bad Code', label: 'X' }], { listName: 'Test' }), /not a valid code/);
assert.throws(() => prepareCatalogListForWrite('nope', { listName: 'Test' }), /list of values/);
// Server-managed rows (locked lifecycle statuses, system domains) are skipped by the checks.
prepareCatalogListForWrite([{ code: 'active', label: '' }, { code: 'x', label: 'Active' }], { listName: 'Test', skipCodes: new Set(['active']) });

// Resolution: code first, then name, never "the last alias wins"; ambiguity is refused.
const options = [{ code: 'high', label: 'Élevée' }, { code: 'medium', label: 'Moderate' }, { code: 'twin', label: 'Moderate' }];
assert.equal(findCatalogOption('HIGH', options)?.code, 'high');
assert.equal(findCatalogOption(' élevée ', options)?.code, 'high');
assert.equal(findCatalogOption('unknown', options), null);
assert.throws(() => findCatalogOption('moderate', options), /matches several values/);
assert.equal(resolveCatalogCode('unknown', options), 'unknown');
assert.throws(() => resolveCatalogCode('unknown', options, 'strict'), /Unknown value/);
assert.equal(resolveCatalogCode('', options), null);

// Export writes names; unknown codes and arrays are handled.
const row: Record<string, any> = { category: 'high', tags: ['high', 'other'], untouched: 'x', empty: null };
exportCatalogLabels(row, { category: options, tags: options, empty: options });
assert.deepEqual(row, { category: 'Élevée', tags: ['Élevée', 'other'], untouched: 'x', empty: null });
console.log('IT Ops settings codes, aliases, resolution and export passed');
