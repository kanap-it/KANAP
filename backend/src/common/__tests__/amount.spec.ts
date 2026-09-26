import * as assert from 'node:assert/strict';
import { addCents, formatAmount, formatCents, toCents } from '../amount';

// Money is parsed from its decimal string and rounded half away from zero,
// never through binary floating point.

function testHalfCentsRoundAwayFromZero() {
  assert.equal(toCents('1.005'), 101n);
  assert.equal(toCents('-1.125'), -113n);
  assert.equal(toCents('0.005'), 1n);
  assert.equal(toCents('-0.005'), -1n);
}

function testPlainValues() {
  assert.equal(toCents('12000'), 1200000n);
  assert.equal(toCents('1333.33'), 133333n);
  assert.equal(toCents('-0.01'), -1n);
  assert.equal(toCents('0'), 0n);
}

function testNumbersAreReadAsDecimals() {
  // 1.005 * 100 is 100.49999999999999 in binary floating point.
  assert.equal(toCents(1.005), 101n);
  assert.equal(toCents(-1.125), -113n);
  assert.equal(toCents(0.005), 1n);
  assert.equal(toCents(-0.005), -1n);
  assert.equal(toCents(1000 / 12), 8333n);
  assert.equal(toCents(12000), 1200000n);
  assert.equal(toCents(-0), 0n);
  assert.equal(toCents(10n), 1000n);
}

function testSanitisingAndNotation() {
  assert.equal(toCents('1,5'), 150n);
  assert.equal(toCents('-0,125'), -13n);
  assert.equal(toCents(' 12 000,50 '), 1200050n);
  assert.equal(toCents('1_000.10'), 100010n);
  assert.equal(toCents('+7'), 700n);
  assert.equal(toCents('.5'), 50n);
  assert.equal(toCents('5.'), 500n);
  assert.equal(toCents('1e-7'), 0n);
  assert.equal(toCents(1e-7), 0n);
  assert.equal(toCents('1.5e+21'), 150000000000000000000000n);
  assert.equal(toCents(1.5e21), 150000000000000000000000n);
  assert.equal(toCents('2.5E-2'), 3n);
  assert.equal(toCents('0.0049999'), 0n);
  assert.equal(toCents('99999999999999999.995'), 10000000000000000000n);
}

function testEmptyAndNonFinite() {
  assert.equal(toCents(''), 0n);
  assert.equal(toCents('   '), 0n);
  assert.equal(toCents(null), 0n);
  assert.equal(toCents(undefined), 0n);
  assert.equal(toCents(Number.NaN), 0n);
  assert.equal(toCents(Number.POSITIVE_INFINITY), 0n);
}

function testInvalidInputThrows() {
  for (const bad of ['abc', '-', '.', '1.2.3', '12-', '1e', 'e5', '0x10', 'Infinity', '1,234.56', '1e99999']) {
    assert.throws(() => toCents(bad), /Invalid amount/, `'${bad}' must be refused`);
  }
}

function testFormattingUnchanged() {
  assert.equal(formatCents(0n), '0');
  assert.equal(formatCents(5n), '0.05');
  assert.equal(formatCents(-5n), '-0.05');
  assert.equal(formatCents(100n), '1');
  assert.equal(formatCents(101n), '1.01');
  assert.equal(formatCents(-113n), '-1.13');
  assert.equal(formatCents(1200050n), '12000.50');
  assert.equal(addCents(100n, '0.005'), 101n);
  assert.equal(formatAmount('1.005'), '1.01');
  assert.equal(formatAmount(null), '0');
}

function main() {
  testHalfCentsRoundAwayFromZero();
  testPlainValues();
  testNumbersAreReadAsDecimals();
  testSanitisingAndNotation();
  testEmptyAndNonFinite();
  testInvalidInputThrows();
  testFormattingUnchanged();
  console.log('amount.spec: ok');
}

main();
