import { divRoundHalfAway, parseDecimalLiteral } from '../common/decimal';

/**
 * Spreading a total over months, in integer cents.
 *
 * Weights are integers (or decimals converted exactly to a common integer
 * scale), so no step goes through binary floating point. Each month gets
 * round-half-away-from-zero(total × weightᵢ / Σweights); what rounding leaves
 * over (positive or negative) goes to the last month of the year, or of the
 * quarter. So 0.30 over twelve equal months is 0.03 × 11 and −0.03 in
 * December: every month is the nearest cent, the total is exact.
 */

export type SpreadMeasure = 'planned' | 'forecast' | 'committed' | 'actual' | 'expected_landing';
export type SpreadRow = { period: string } & Partial<Record<SpreadMeasure, bigint>>;

const SPREAD_MEASURES: readonly SpreadMeasure[] = ['planned', 'forecast', 'committed', 'actual', 'expected_landing'];

export const FLAT_WEIGHTS: readonly bigint[] = Array.from({ length: 12 }, () => 1n);
const QUARTER_WEIGHTS = { equal: [1n, 1n, 1n], '445': [4n, 4n, 5n] } as const;

function monthPeriods(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}-01`);
}

/** Split `total` cents by `weights` (Σ > 0); the rounding remainder goes to the last share. */
function split(total: bigint, weights: readonly bigint[]): bigint[] {
  const sum = weights.reduce((acc, w) => acc + w, 0n);
  if (sum <= 0n) throw new Error('Spread weights must add up to more than zero');
  const shares = weights.map((w) => divRoundHalfAway(total * w, sum));
  const allocated = shares.reduce((acc, s) => acc + s, 0n);
  shares[shares.length - 1] += total - allocated;
  return shares;
}

/**
 * Twelve stored profile weights as exact integers on a common scale, or null
 * when the profile cannot be used (not twelve entries, or not adding up to
 * more than zero). A value that is not a number counts as zero.
 */
export function profileWeights(raw: unknown): bigint[] | null {
  if (!Array.isArray(raw) || raw.length !== 12) return null;
  const parsed = raw.map((w) => {
    if ((typeof w !== 'number' || !Number.isFinite(w)) && typeof w !== 'string') return null;
    try {
      return parseDecimalLiteral(w);
    } catch {
      return null;
    }
  });
  const scale = Math.max(0, ...parsed.map((p) => (p ? p.scale : 0)));
  const weights = parsed.map((p) => (p ? p.mantissa * 10n ** BigInt(scale - p.scale) : 0n));
  return weights.reduce((acc, w) => acc + w, 0n) > 0n ? weights : null;
}

/** Yearly totals (cents) over the twelve months; the rows carry only the measures given. */
export function spreadAnnualToMonths(
  year: number,
  totals: Partial<Record<SpreadMeasure, bigint>>,
  weights: readonly bigint[] = FLAT_WEIGHTS,
): SpreadRow[] {
  if (weights.length !== 12) throw new Error('A yearly spread needs twelve weights');
  const rows: SpreadRow[] = monthPeriods(year).map((period) => ({ period }));
  for (const measure of SPREAD_MEASURES) {
    const total = totals[measure];
    if (total === undefined) continue;
    split(total, weights).forEach((share, i) => { rows[i][measure] = share; });
  }
  return rows;
}

/** Quarter totals (cents, an omitted quarter is zero) of one measure over the twelve months. */
export function spreadQuarterlyToMonths(
  year: number,
  measure: SpreadMeasure,
  quarters: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', bigint>>,
  distribution: 'equal' | '445',
): SpreadRow[] {
  const weights = QUARTER_WEIGHTS[distribution];
  const shares = (['Q1', 'Q2', 'Q3', 'Q4'] as const).flatMap((q) => split(quarters[q] ?? 0n, weights));
  return monthPeriods(year).map((period, i) => ({ period, [measure]: shares[i] }));
}
