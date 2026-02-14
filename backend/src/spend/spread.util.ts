import * as dayjs from 'dayjs';
import { formatCents, toCents } from '../common/amount';

export type AnnualTotals = {
  year: number;
  totals: Partial<Record<'planned' | 'forecast' | 'committed' | 'actual' | 'expected_landing', number>>;
  profileWeights: number[]; // 12 numbers sum to 1
};

export type QuarterlyTotals = {
  year: number;
  quarters: Partial<Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number>>;
  measure: 'planned' | 'forecast' | 'committed' | 'actual' | 'expected_landing';
  distribution: 'equal' | '445';
};

export function spreadAnnualToMonths(input: AnnualTotals) {
  const months = Array.from({ length: 12 }, (_, i) => dayjs(`${input.year}-${String(i + 1).padStart(2, '0')}-01`).format('YYYY-MM-01'));
  const weights = input.profileWeights;
  if (!weights || weights.length !== 12) throw new Error('Invalid profile weights');

  const rows = months.map((period, idx) => ({
    period,
    planned: 0,
    forecast: 0,
    committed: 0,
    actual: 0,
    expected_landing: 0,
  }));

  for (const key of ['planned', 'forecast', 'committed', 'actual', 'expected_landing'] as const) {
    const totalRaw = input.totals[key];
    if (totalRaw == null) continue;
    const totalCents = toCents(totalRaw);
    if (totalCents === 0n) continue;
    let acc = 0n;
    for (let i = 0; i < 12; i++) {
      const weight = weights[i] ?? 0;
      const portion = Number(totalRaw) * weight;
      const portionCents = toCents(portion);
      rows[i][key] = Number(formatCents(portionCents));
      acc += portionCents;
    }
    const delta = totalCents - acc;
    if (delta !== 0n) {
      const current = toCents(rows[11][key]);
      rows[11][key] = Number(formatCents(current + delta));
    }
  }
  return rows;
}

export function spreadQuarterlyToMonths(input: QuarterlyTotals) {
  const months = Array.from({ length: 12 }, (_, i) => dayjs(`${input.year}-${String(i + 1).padStart(2, '0')}-01`).format('YYYY-MM-01'));
  const rows = months.map((period) => ({
    period,
    planned: 0,
    forecast: 0,
    committed: 0,
    actual: 0,
    expected_landing: 0,
  }));

  const measure = input.measure;
  const qWeights = input.distribution === '445' ? [4 / 13, 4 / 13, 5 / 13] : [1 / 3, 1 / 3, 1 / 3];

  const quarters = [input.quarters.Q1 ?? 0, input.quarters.Q2 ?? 0, input.quarters.Q3 ?? 0, input.quarters.Q4 ?? 0];
  for (let q = 0; q < 4; q++) {
    const qTotalRaw = quarters[q] ?? 0;
    const qTotalCents = toCents(qTotalRaw);
    if (qTotalCents === 0n) continue;
    let acc = 0n;
    for (let m = 0; m < 3; m++) {
      const monthIndex = q * 3 + m;
      const weight = qWeights[m] ?? 0;
      const portion = Number(qTotalRaw) * weight;
      const portionCents = toCents(portion);
      rows[monthIndex][measure] = Number(formatCents(portionCents));
      acc += portionCents;
    }
    const delta = qTotalCents - acc;
    if (delta !== 0n) {
      const current = toCents(rows[q * 3 + 2][measure]);
      rows[q * 3 + 2][measure] = Number(formatCents(current + delta));
    }
  }

  return rows;
}
