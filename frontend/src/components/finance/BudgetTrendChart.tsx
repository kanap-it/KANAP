import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { AgChartsReact } from 'ag-charts-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { formatAmount } from '../../i18n/formatters';
import { FinanceModuleConfig } from './config';

type YearTotals = { year: number; budget: number; revision: number; actual: number; landing: number };

// Multi-year vision window: N-3 … N+1 around the current calendar year.
const N = new Date().getFullYear();
const FROM = N - 3;
const TO = N + 1;

export default function BudgetTrendChart({ id, currency, config }: { id: string; currency?: string; config: FinanceModuleConfig }) {
  const { t } = useTranslation(['ops', 'common']);
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';

  const { data } = useQuery({
    queryKey: [`${config.queryKeyPrefix}-yearly-totals`, id, FROM, TO],
    queryFn: async () => {
      const res = await api.get<{ items: YearTotals[] }>(`${config.itemsApi}/${id}/yearly-totals`, { params: { from: FROM, to: TO } });
      return res.data?.items || [];
    },
    staleTime: 30_000,
    enabled: !!id,
  });

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

  const options = React.useMemo(() => ({
    theme: dark ? 'ag-default-dark' : 'ag-default',
    background: { fill: 'transparent' },
    data: data || [],
    series,
    axes: [
      { type: 'category', position: 'bottom' },
      { type: 'number', position: 'left', label: { formatter: (p: { value: number }) => formatAmount(p.value) } },
    ],
    legend: { enabled: true, position: 'bottom' },
    padding: { top: 8, right: 12, bottom: 4, left: 4 },
  }), [dark, data, series]);

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
