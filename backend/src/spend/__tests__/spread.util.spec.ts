import * as assert from 'node:assert/strict';
import { FLAT_WEIGHTS, profileWeights, spreadAnnualToMonths, spreadQuarterlyToMonths } from '../spread.util';

// Spreads in integer cents: each month is round-half-away-from-zero of its
// exact share, the remainder goes to the last month (of the year or quarter).

const YEAR = 2031;

function planned(total: bigint, weights: readonly bigint[] = FLAT_WEIGHTS) {
  const rows = spreadAnnualToMonths(YEAR, { planned: total }, weights);
  assert.equal(rows.reduce((sum, r) => sum + (r.planned as bigint), 0n), total, 'the months add up to the total');
  return rows.map((r) => r.planned);
}

const elevenThen = (month: bigint, last: bigint) => [...Array.from({ length: 11 }, () => month), last];

function testFlatSpread() {
  // 558 / 12 = 46.5 → 47; 558 − 11 × 47 = 41.
  assert.deepEqual(planned(558n), elevenThen(47n, 41n));
  assert.deepEqual(planned(1_200_000n), Array.from({ length: 12 }, () => 100_000n));
  assert.deepEqual(planned(10_000n), elevenThen(833n, 837n));
  assert.deepEqual(planned(-558n), elevenThen(-47n, -41n));
  // 30 / 12 = 2.5 → 3 each; the remainder (−6) makes December −3.
  assert.deepEqual(planned(30n), elevenThen(3n, -3n));
  assert.deepEqual(planned(0n), Array.from({ length: 12 }, () => 0n));
}

function testRowsCarryOnlyTheMeasuresGiven() {
  const rows = spreadAnnualToMonths(YEAR, { committed: 1200n, expected_landing: 0n });
  assert.equal(rows.length, 12);
  assert.deepEqual(rows[0], { period: `${YEAR}-01-01`, committed: 100n, expected_landing: 0n });
  assert.deepEqual(rows[11], { period: `${YEAR}-12-01`, committed: 100n, expected_landing: 0n });
  assert.deepEqual(spreadAnnualToMonths(YEAR, {})[5], { period: `${YEAR}-06-01` });
}

function testQuarterlySpread() {
  const equal = spreadQuarterlyToMonths(YEAR, 'committed', { Q1: 30_000n, Q3: 100n }, 'equal');
  assert.deepEqual(equal.map((r) => r.committed), [10_000n, 10_000n, 10_000n, 0n, 0n, 0n, 33n, 33n, 34n, 0n, 0n, 0n]);
  assert.deepEqual(Object.keys(equal[0]), ['period', 'committed']);

  const fourFourFive = spreadQuarterlyToMonths(YEAR, 'planned', { Q2: 130_000n }, '445');
  assert.deepEqual(fourFourFive.slice(3, 6).map((r) => r.planned), [40_000n, 40_000n, 50_000n]);
  assert.deepEqual(fourFourFive.map((r) => r.period).slice(0, 2), [`${YEAR}-01-01`, `${YEAR}-02-01`]);

  // −1.00 in thirds: −33, −33, −34.
  const negative = spreadQuarterlyToMonths(YEAR, 'actual', { Q4: -100n }, 'equal');
  assert.deepEqual(negative.slice(9).map((r) => r.actual), [-33n, -33n, -34n]);
}

function testNamedProfile() {
  // Stored weights need not add up to 1: they are normalised by their sum.
  const weights = profileWeights([2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(weights, [2n, 2n, 2n, 2n, 2n, 2n, 1n, 1n, 1n, 1n, 1n, 1n]);
  assert.deepEqual(planned(180_000n, weights!), [20_000n, 20_000n, 20_000n, 20_000n, 20_000n, 20_000n, 10_000n, 10_000n, 10_000n, 10_000n, 10_000n, 10_000n]);

  // Decimal weights are converted exactly to one integer scale.
  const decimals = profileWeights([0.05, 0.05, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.05, '0.05']);
  assert.deepEqual(decimals, [5n, 5n, 10n, 10n, 10n, 10n, 10n, 10n, 10n, 10n, 5n, 5n]);
  assert.deepEqual(planned(100_000n, decimals!).slice(0, 3), [5_000n, 5_000n, 10_000n]);

  // Unusable profiles fall back to flat at the caller.
  assert.equal(profileWeights(undefined), null);
  assert.equal(profileWeights([1, 2, 3]), null);
  assert.equal(profileWeights(Array.from({ length: 12 }, () => 0)), null);
  // A value that is not a number counts as zero.
  assert.deepEqual(profileWeights([1, null, 'x', 1, 1, 1, 1, 1, 1, 1, 1, 1]), [1n, 0n, 0n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n]);
}

function testRefusesUnusableWeights() {
  assert.throws(() => spreadAnnualToMonths(YEAR, { planned: 100n }, [1n, 1n]), /twelve weights/);
  assert.throws(() => spreadAnnualToMonths(YEAR, { planned: 100n }, Array.from({ length: 12 }, () => 0n)), /more than zero/);
}

function main() {
  testFlatSpread();
  testRowsCarryOnlyTheMeasuresGiven();
  testQuarterlySpread();
  testNamedProfile();
  testRefusesUnusableWeights();
  console.log('spread.util.spec: ok');
}

main();
