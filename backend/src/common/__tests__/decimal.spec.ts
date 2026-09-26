import * as assert from 'node:assert/strict';
import { Decimal, DECIMAL_SCALE_DIGITS } from '../decimal';

// Scaled-integer arithmetic: exact products, one rounding to cents at the end.

function testProducts() {
  // quantity × rate × price
  const cost = Decimal.from(163).mul(Decimal.from(1)).mul(Decimal.from('400.00'));
  assert.equal(cost.toString(), '65200');
  assert.equal(cost.toCents(), 6520000n);

  const fte = Decimal.from('1.5').mul('408.0000');
  assert.equal(fte.toString(), '612');
  assert.equal(fte.toCents(), 61200n);

  assert.equal(Decimal.from(0.1).add(0.2).toString(), '0.3');
  assert.equal(Decimal.from('10').sub('0.01').toString(), '9.99');
}

function testIndex() {
  assert.equal(Decimal.from(400).withPct(2).toString(), '408');
  assert.equal(Decimal.from('400.00').withPct('2').toCents(), 40800n);
  assert.equal(Decimal.from(400).withPct(-2.5).toString(), '390');
  assert.equal(Decimal.from('408.0000').withPct(0).toString(), '408');
}

function testRoundsOnceAtTheEnd() {
  // 3 × 0.335 = 1.005 → 101 cents. Rounding 0.335 first would give 3 × 0.34 = 1.02.
  const total = Decimal.from('0.335').mul(3);
  assert.equal(total.toString(), '1.005');
  assert.equal(total.toCents(), 101n);
  assert.equal(Decimal.from('0.0049').mul(1).toCents(), 0n);
  assert.equal(Decimal.from('0.005').toCents(), 1n);
}

function testNegativeValues() {
  assert.equal(Decimal.from('-1.5').mul('408').toString(), '-612');
  assert.equal(Decimal.from('-0.0025').mul(2).toCents(), -1n);
  assert.equal(Decimal.from('-1.125').toCents(), -113n);
  assert.equal(Decimal.from(-400).withPct(2).toString(), '-408');
  assert.equal(Decimal.from('-0.00000001').toString(), '-0.00000001');
}

function testProductsAreExact() {
  // 0.00999999 × 0.50000001 = 0.0049999950999999: below half a cent, so 0.
  const tiny = Decimal.from('0.00999999').mul('0.50000001');
  assert.equal(tiny.toString(), '0.0049999950999999');
  assert.equal(tiny.toCents(), 0n);

  // Step D shape: days × quantity × unit price × (1 + index / 100).
  // 21.5 × 1.5 = 32.25; × 400 = 12 900; × 1.02125 = 13 174.125 → 13 174.13.
  const cost = Decimal.from('21.5').mul('1.500').mul('400.0000').withPct('2.1250');
  assert.equal(cost.toString(), '13174.125');
  assert.equal(cost.toCents(), 1317413n);

  // 12.3 × 0.333 × 1234.5678 × (1 − 3.3333 / 100), 17 decimals, exact
  // (checked with an arbitrary-precision decimal calculator).
  const indexed = Decimal.from('12.3').mul('0.333').mul('1234.5678').withPct('-3.3333');
  assert.equal(indexed.toString(), '4888.11239584141734');
  assert.equal(indexed.toCents(), 488811n);
}

function testRescaleBeyondTheScaleIsHalfAwayFromZero() {
  // 10^-20 × 0.5 needs 21 digits: rescaled half away from zero.
  const unit = `0.${'0'.repeat(19)}1`;
  assert.equal(Decimal.from(unit).mul('0.5').toString(), unit);
  assert.equal(Decimal.from(`-${unit}`).mul('0.5').toString(), `-${unit}`);
  assert.equal(Decimal.from(unit).mul('0.4').toString(), '0');
}

function testParsing() {
  assert.equal(DECIMAL_SCALE_DIGITS, 20);
  assert.equal(Decimal.from('1,5').toString(), '1.5');
  assert.equal(Decimal.from(' 12 000 ').toString(), '12000');
  assert.equal(Decimal.from('1e-7').toString(), '0.0000001');
  assert.equal(Decimal.from('1.5e+3').toString(), '1500');
  assert.equal(Decimal.from(10n).toString(), '10');
  assert.equal(Decimal.fromCents(-113n).toString(), '-1.13');
  // Trailing zeros beyond the scale lose nothing.
  assert.equal(Decimal.from(`2.1${'0'.repeat(25)}`).toString(), '2.1');
  assert.equal(Decimal.from(`0.${'0'.repeat(19)}1`).toString(), `0.${'0'.repeat(19)}1`);
}

function testRefusals() {
  assert.throws(() => Decimal.from(`0.${'0'.repeat(20)}1`), /more than 20 decimals/);
  assert.throws(() => Decimal.from(1e-21), /more than 20 decimals/);
  assert.throws(() => Decimal.from('abc'), /Invalid amount/);
  assert.throws(() => Decimal.from(''), /Invalid amount/);
  assert.throws(() => Decimal.from(Number.NaN), /Invalid amount/);
  assert.throws(() => Decimal.from(Number.POSITIVE_INFINITY), /Invalid amount/);
}

function main() {
  testProducts();
  testIndex();
  testRoundsOnceAtTheEnd();
  testNegativeValues();
  testProductsAreExact();
  testRescaleBeyondTheScaleIsHalfAwayFromZero();
  testParsing();
  testRefusals();
  console.log('decimal.spec: ok');
}

main();
