import * as assert from 'node:assert/strict';
import { isRecord } from '../object-guards';

/**
 * `isRecord` was redefined in 27 modules in four different spellings before moving here, so
 * its behaviour is pinned: the four spellings (!!value, Boolean(value), value != null,
 * value !== null) all agreed, and this is the accepted contract.
 */
function testAcceptsPlainObjects() {
  assert.equal(isRecord({}), true);
  assert.equal(isRecord({ a: 1 }), true);
  assert.equal(isRecord(Object.create(null)), true);
}

function testRejectsArrays() {
  // Arrays are typeof 'object'; the guard must still reject them.
  assert.equal(isRecord([]), false);
  assert.equal(isRecord([1, 2]), false);
}

function testRejectsNullAndUndefined() {
  assert.equal(isRecord(null), false);
  assert.equal(isRecord(undefined), false);
}

function testRejectsPrimitivesAndFunctions() {
  for (const value of [0, 1, '', 'text', true, false, Number.NaN, Symbol('s'), () => undefined]) {
    assert.equal(isRecord(value), false, `expected false for ${String(value)}`);
  }
}

function run() {
  testAcceptsPlainObjects();
  testRejectsArrays();
  testRejectsNullAndUndefined();
  testRejectsPrimitivesAndFunctions();
}

void run();
