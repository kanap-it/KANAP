import type { QueryClient } from '@tanstack/react-query';
import type { FinanceModuleConfig } from './config';

export type YearTotals = {
  year: number;
  budget: number;
  revision: number;
  actual: number;
  landing: number;
};

export type LiveBudgetTotals = {
  planned: number;
  committed: number;
  actual: number;
  expected_landing: number;
};

/** Multi-year vision window: N-3 … N+1 around the current calendar year. */
const N = new Date().getFullYear();
export const YEARLY_TOTALS_FROM = N - 3;
export const YEARLY_TOTALS_TO = N + 1;

export function yearlyTotalsQueryKey(config: FinanceModuleConfig, id: string) {
  return [`${config.queryKeyPrefix}-yearly-totals`, id, YEARLY_TOTALS_FROM, YEARLY_TOTALS_TO] as const;
}

export function toChartYearRow(year: number, live: LiveBudgetTotals): YearTotals {
  return {
    year,
    budget: Number(live.planned) || 0,
    revision: Number(live.committed) || 0,
    actual: Number(live.actual) || 0,
    landing: Number(live.expected_landing) || 0,
  };
}

function sameRow(a: YearTotals, b: YearTotals): boolean {
  return a.year === b.year
    && a.budget === b.budget
    && a.revision === b.revision
    && a.actual === b.actual
    && a.landing === b.landing;
}

/** Overlay live form totals onto the fetched multi-year series for `year`. */
export function overlayYear(
  items: YearTotals[] | undefined,
  year: number,
  live: LiveBudgetTotals | undefined,
): YearTotals[] {
  const base = items ?? [];
  if (!live) return base;
  const row = toChartYearRow(year, live);
  const idx = base.findIndex((entry) => entry.year === year);
  if (idx === -1) {
    return [...base, row].sort((a, b) => a.year - b.year);
  }
  if (sameRow(base[idx], row)) return base;
  const next = base.slice();
  next[idx] = row;
  return next;
}

export function patchYearlyTotalsCache(
  queryClient: QueryClient,
  config: FinanceModuleConfig,
  id: string,
  year: number,
  live: LiveBudgetTotals,
) {
  queryClient.setQueriesData<YearTotals[]>(
    { queryKey: [`${config.queryKeyPrefix}-yearly-totals`, id] },
    (old) => overlayYear(old, year, live),
  );
}
