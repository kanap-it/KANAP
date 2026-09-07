import * as assert from 'node:assert/strict';
import { catalogAliases, generateCatalogCode, normalizeTranslations, prepareCatalogListForWrite, slugifyCatalogCode } from '../catalog-codes';
import { resolveClassificationOption } from '../classification-catalog';
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

// Translations: known locales, trimmed, empty fields dropped; translated names are aliases too.
assert.deepEqual(normalizeTranslations({ fr: { label: ' Élevée ', description: '' }, de: { label: '' }, xx: { label: 'nope' }, es: { description: 'Solo descripción' } }), { fr: { label: 'Élevée' }, es: { description: 'Solo descripción' } });
assert.equal(normalizeTranslations({ fr: { label: '' } }), undefined);
assert.equal(normalizeTranslations('bad'), undefined);
assert.throws(() => normalizeTranslations({ fr: { label: 'x'.repeat(201) } }), /too long/);
assert.deepEqual(catalogAliases({ code: 'high', label: 'High', translations: { fr: { label: 'Élevée' }, de: { description: 'nur Beschreibung' } } }), ['high', 'élevée']);
const translated = prepareCatalogListForWrite([{ code: 'high', label: 'High', translations: { fr: { label: 'Élevée' } } }, { code: 'low', label: 'Low' }], { listName: 'Test' });
assert.deepEqual(translated[0].translations, { fr: { label: 'Élevée' } });
assert.throws(() => prepareCatalogListForWrite([{ code: 'high', label: 'High', translations: { fr: { label: 'Basse' } } }, { code: 'low', label: 'Basse' }], { listName: 'Test' }), /clashes with/);
assert.throws(() => prepareCatalogListForWrite([{ code: 'web', label: 'Web', translations: { fr: { label: 'Web, mobile' } } }], { listName: 'Test', commaSeparatedInCsv: true }), /comma/);
const translatedOptions = [{ code: 'high', label: 'High', translations: { fr: { label: 'Élevée' } } }, { code: 'low', label: 'Low' }];
assert.equal(findCatalogOption('élevée', translatedOptions)?.code, 'high');
assert.equal(resolveClassificationOption('Élevée', translatedOptions), 'high');
assert.throws(() => resolveClassificationOption('Moyenne', translatedOptions), /Unknown or ambiguous/);
console.log('IT Ops settings codes, aliases, translations, resolution and export passed');
