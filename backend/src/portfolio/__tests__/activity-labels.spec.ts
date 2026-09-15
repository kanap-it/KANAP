import * as assert from 'node:assert/strict';
import {
  formatCriteriaDiff,
  formatItemLabel,
  listChangedCriteria,
} from '../utils/activity-labels';

// Human-readable activity entries. The scoring diff matters most: `numeric`
// columns come back from Postgres as strings, and the stored criterion maps
// used to be unreadable identifiers.

// Numeric columns are compared with detectChanges({ compare: 'number' }) — see
// change-detection.ts — so this module only formats.

// ── changed criteria ────────────────────────────────────────────────────────

const beforeValues = { critA: 'opt1', critB: 'opt2', critC: 'opt3' };
const afterValues = { critA: 'opt1', critB: 'opt4', critC: 'opt3', critD: 'opt5' };

assert.deepEqual(
  listChangedCriteria(beforeValues, afterValues),
  ['critB', 'critD'],
  'only the changed and the added criteria are listed',
);
assert.deepEqual(listChangedCriteria({}, {}), [], 'nothing changed, nothing listed');
assert.deepEqual(
  listChangedCriteria({ critA: 'opt1' }, { critA: null }),
  ['critA'],
  'a cleared criterion counts as changed',
);

// ── readable diff ───────────────────────────────────────────────────────────

const labels = {
  criterionName: new Map([
    ['critA', 'Time estimation IT'],
    ['critB', 'Business value'],
  ]),
  optionLabel: new Map([
    ['opt1', '< 3 months'],
    ['opt2', 'Low'],
    ['opt4', 'High'],
    ['opt5', 'Orphan option without criterion'],
  ]),
};

assert.deepEqual(
  formatCriteriaDiff({ critA: 'opt1', critB: 'opt2' }, { critA: 'opt1', critB: 'opt4' }, labels),
  [['Business value: Low'], ['Business value: High']],
  'only the changed criterion is described, with its name and option',
);
assert.deepEqual(
  formatCriteriaDiff({ critB: 'opt2' }, { critB: null }, labels),
  [['Business value: Low'], []],
  'a cleared criterion has an empty new side',
);
assert.deepEqual(
  formatCriteriaDiff({ critA: 'optX' }, { critA: 'opt1' }, labels),
  [['Time estimation IT'], ['Time estimation IT: < 3 months']],
  'an option that no longer resolves falls back to the criterion name',
);
assert.deepEqual(
  formatCriteriaDiff({ critD: 'opt5' }, { critD: 'opt5' }, labels),
  null,
  'an unchanged criterion produces no entry',
);
assert.deepEqual(
  formatCriteriaDiff({ critZ: 'optZ' }, { critZ: 'optY' }, labels),
  null,
  'nothing readable means no entry rather than a raw identifier',
);
assert.deepEqual(
  formatCriteriaDiff({}, {}, labels),
  null,
  'no criteria at all produces no entry',
);

// ── business references ─────────────────────────────────────────────────────

assert.equal(formatItemLabel('REQ', 8, 'Smart Packaging'), 'REQ-8: Smart Packaging', 'reference and name');
assert.equal(formatItemLabel('PRJ', 3, null), 'PRJ-3', 'reference without a name');
assert.equal(formatItemLabel('REQ', null, 'Smart Packaging'), 'Smart Packaging', 'name without a reference');
assert.equal(formatItemLabel('REQ', null, null), '', 'nothing to show');

console.log('activity-labels: all assertions passed');
