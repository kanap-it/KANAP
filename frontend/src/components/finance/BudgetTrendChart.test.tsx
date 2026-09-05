import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppTheme } from '../../config/ThemeContext';
import { OPEX_FINANCE_CONFIG } from './config';
import {
  YEARLY_TOTALS_FROM,
  yearlyTotalsQueryKey,
  type LiveBudgetTotals,
  type YearTotals,
} from './yearlyTotals';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../api', () => ({
  default: { get: vi.fn() },
}));

const chartState = {
  mounts: 0,
  lastOptions: null as { data?: YearTotals[] } | null,
};

vi.mock('ag-charts-react', () => ({
  AgChartsReact: ({ options }: { options: { data?: YearTotals[] } }) => {
    React.useEffect(() => {
      chartState.mounts += 1;
    }, []);
    chartState.lastOptions = options;
    return <div data-testid="budget-trend-chart" />;
  },
}));

import BudgetTrendChart from './BudgetTrendChart';

const theme = createAppTheme('light');
const year = YEARLY_TOTALS_FROM + 3;
const seeded: YearTotals[] = Array.from({ length: 5 }, (_, i) => ({
  year: YEARLY_TOTALS_FROM + i,
  budget: 1,
  revision: 2,
  actual: 3,
  landing: 4,
}));

function renderChart(liveTotals?: LiveBudgetTotals) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(yearlyTotalsQueryKey(OPEX_FINANCE_CONFIG, 'item-1'), seeded);

  const ui = (totals?: LiveBudgetTotals) => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <BudgetTrendChart
          id="item-1"
          year={year}
          liveTotals={totals}
          currency="EUR"
          config={OPEX_FINANCE_CONFIG}
        />
      </ThemeProvider>
    </QueryClientProvider>
  );

  const view = render(ui(liveTotals));
  return { ...view, rerenderWith: (totals?: LiveBudgetTotals) => view.rerender(ui(totals)) };
}

describe('BudgetTrendChart', () => {
  beforeEach(() => {
    chartState.mounts = 0;
    chartState.lastOptions = null;
  });

  it('overlays live totals onto the selected year and leaves other years unchanged', () => {
    renderChart({
      planned: 10,
      committed: 20,
      actual: 30,
      expected_landing: 40,
    });

    expect(chartState.lastOptions?.data?.find((row) => row.year === year)).toEqual({
      year,
      budget: 10,
      revision: 20,
      actual: 30,
      landing: 40,
    });
    expect(chartState.lastOptions?.data?.find((row) => row.year === year - 1)).toEqual({
      year: year - 1,
      budget: 1,
      revision: 2,
      actual: 3,
      landing: 4,
    });
  });

  it('updates series data in place when live totals change', () => {
    const { rerenderWith } = renderChart({
      planned: 10,
      committed: 20,
      actual: 30,
      expected_landing: 40,
    });
    expect(chartState.mounts).toBe(1);
    expect(chartState.lastOptions?.data?.find((row) => row.year === year)?.budget).toBe(10);

    rerenderWith({ planned: 250000, committed: 20, actual: 30, expected_landing: 40 });
    expect(chartState.mounts).toBe(1);
    expect(chartState.lastOptions?.data?.find((row) => row.year === year)?.budget).toBe(250000);
    expect(chartState.lastOptions?.data).not.toEqual([]);
  });

  it('keeps fetched yearly totals when live overlay is not ready', () => {
    renderChart(undefined);
    expect(chartState.lastOptions?.data).toEqual(seeded);
  });
});
