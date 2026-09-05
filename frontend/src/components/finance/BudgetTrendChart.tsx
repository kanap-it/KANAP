import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { AgChartsReact } from 'ag-charts-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { formatAmount } from '../../i18n/formatters';
import { FinanceModuleConfig } from './config';
import {
  overlayYear,
  YEARLY_TOTALS_FROM,
  YEARLY_TOTALS_TO,
  yearlyTotalsQueryKey,
  type LiveBudgetTotals,
  type YearTotals,
} from './yearlyTotals';

export default function BudgetTrendChart({
  id,
  year,
  liveTotals,
  currency,
  config,
}: {
  id: string;
  year: number;
  liveTotals?: LiveBudgetTotals;
  currency?: string;
  config: FinanceModuleConfig;
}) {
  const { t } = useTranslation(['ops', 'common']);
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const { data } = useQuery({
    queryKey: yearlyTotalsQueryKey(config, id),
    queryFn: async () => {
      const res = await api.get<{ items: YearTotals[] }>(`${config.itemsApi}/${id}/yearly-totals`, {
        params: { from: YEARLY_TOTALS_FROM, to: YEARLY_TOTALS_TO },
      });
      return res.data?.items || [];
    },
    staleTime: 30_000,
    enabled: !!id,
  });

  // Keep the last payload across refetches so the canvas is never fed [].
  const itemsRef = React.useRef<YearTotals[]>([]);
  if (data) itemsRef.current = data;
  const items = data ?? itemsRef.current;

  const merged = React.useMemo(
    () => overlayYear(items, year, liveTotals),
    [items, year, liveTotals],
  );

  const series = React.useMemo(() => {
    const colors = {
      budget: dark ? '#60A5FA' : '#3B82F6',
      revision: dark ? '#9CA3AF' : '#6B7280',
      actual: dark ? '#34D399' : '#10B981',
      landing: theme.palette.kanap.orange,
    };
    const line = (yKey: string, yName: string, color: string) => ({
      type: 'line' as const,
      xKey: 'year',
      yKey,
      yName,
      stroke: color,
      strokeWidth: 2,
      marker: { enabled: true, size: 6, fill: color, stroke: color },
    });
    return [
      line('budget', t('operations.budgetColumns.budget'), colors.budget),
      line('revision', t('operations.budgetColumns.revision'), colors.revision),
      line('actual', t('operations.budgetColumns.followUp'), colors.actual),
      line('landing', t('operations.budgetColumns.landing'), colors.landing),
    ];
  }, [dark, theme, t]);

  // Theme / series stay on a data-independent object so AG Charts can delta-update
  // the series data without re-applying the theme (canvas flash).
  const chartMeta = React.useMemo(() => ({
    theme: dark ? 'ag-default-dark' : 'ag-default',
    background: { fill: 'transparent' },
    series,
    axes: [
      { type: 'category', position: 'bottom' },
      { type: 'number', position: 'left', label: { formatter: (p: { value: number }) => formatAmount(p.value) } },
    ],
    legend: { enabled: true, position: 'bottom' },
    padding: { top: 8, right: 12, bottom: 4, left: 4 },
    animation: { enabled: false },
  }), [dark, series]);

  const options = React.useMemo(
    () => ({ ...chartMeta, data: merged }),
    [chartMeta, merged],
  );

  return (
    <Box sx={{ bgcolor: 'kanap.bg.drawer', border: '1px solid', borderColor: 'kanap.border.soft', borderRadius: '8px', p: 2 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.tertiary', mb: 1 }}>
        {t(`${config.i18nPrefix}.budget.multiYearTitle`)}{currency ? ` · ${currency.toUpperCase()}` : ''}
      </Typography>
      <Box sx={{ height: 260 }}>
        <AgChartsReact options={options as any} />
      </Box>
    </Box>
  );
}
