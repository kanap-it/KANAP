import React from 'react';
import { act, render } from '@testing-library/react';
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

type LegendEvent = { itemId: string; enabled: boolean };
type ChartOptions = {
  data?: YearTotals[];
  series?: { yKey: string; visible: boolean }[];
  legend?: {
    listeners?: {
      legendItemClick?: (e: LegendEvent) => void;
      legendItemDoubleClick?: (e: LegendEvent) => void;
    };
  };
};

const chartState = {
  mounts: 0,
  lastOptions: null as ChartOptions | null,
};

vi.mock('ag-charts-react', () => ({
  AgChartsReact: ({ options }: { options: ChartOptions }) => {
    React.useEffect(() => {
      chartState.mounts += 1;
    }, []);
    chartState.lastOptions = options;
    return <div data-testid="budget-trend-chart" />;
  },
}));

import BudgetTrendChart from './BudgetTrendChart';

// jsdom here ships without localStorage; the chart persists its legend choice there.
if (!window.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() { return store.size; },
    },
  });
}

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
    window.localStorage.clear();
  });

  const visibleKeys = () =>
    (chartState.lastOptions?.series ?? []).filter((s) => s.visible).map((s) => s.yKey);

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

  it('remembers hidden legend series across remounts', () => {
    const first = renderChart(undefined);
    expect(visibleKeys()).toEqual(['budget', 'revision', 'actual', 'landing']);

    act(() => {
      chartState.lastOptions?.legend?.listeners?.legendItemClick?.({ itemId: 'revision', enabled: false });
    });
    expect(visibleKeys()).toEqual(['budget', 'actual', 'landing']);

    first.unmount();
    renderChart(undefined);
    expect(visibleKeys()).toEqual(['budget', 'actual', 'landing']);

    act(() => {
      chartState.lastOptions?.legend?.listeners?.legendItemClick?.({ itemId: 'revision', enabled: true });
    });
    expect(visibleKeys()).toEqual(['budget', 'revision', 'actual', 'landing']);
  });

  it('double-click isolates a series, and shows all again when it is already alone', () => {
    renderChart(undefined);
    const dblclick = (itemId: string) =>
      act(() => {
        chartState.lastOptions?.legend?.listeners?.legendItemDoubleClick?.({ itemId, enabled: true });
      });

    dblclick('actual');
    expect(visibleKeys()).toEqual(['actual']);
    dblclick('actual');
    expect(visibleKeys()).toEqual(['budget', 'revision', 'actual', 'landing']);
  });
});
