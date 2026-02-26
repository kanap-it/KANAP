import React, { useMemo, useRef, useState } from 'react';
import { Autocomplete, Box, Checkbox, ListItemText, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import ReportLayout from '../../components/reports/ReportLayout';
import AgGridBox from '../../components/AgGridBox';
import ChartCard, { ChartCardHandle } from '../../components/reports/ChartCard';
import { useOpexSummaryAll, SummaryRow, pickYearSlot } from './useOpexSummary';
import { metricLabels, MetricKey } from './reportMetrics';

const METRIC_SELECTION_ORDER: MetricKey[] = ['budget', 'revision', 'follow_up', 'landing'];

function formatNumber(v: any) {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return '';
  const i = Math.round(n);
  return i.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function TopOpexReport() {
  const now = new Date();
  const Y = now.getFullYear();
  const [year, setYear] = useState<number>(Y);
  const [metric, setMetric] = useState<MetricKey>('budget');
  const [topCount, setTopCount] = useState<number>(10);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [excludedAccounts, setExcludedAccounts] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const metricLabel = metricLabels[metric];

  const { data: rows, isLoading } = useOpexSummaryAll();

  type ProcessedRow = {
    id: string;
    product_name: string;
    value: number;
    pct_of_total: number;
  };

  type RawRow = {
    id: string;
    product_name: string;
    value: number;
    account_display: string | null;
  };

  type ItemOption = { id: string; name: string };
  type AccountOption = { id: string; name: string };

  const { processed, totalMetric, topSelectionTotal } = useMemo(() => {
    const all: RawRow[] = (rows ?? []).map((r: SummaryRow) => {
      const slot = pickYearSlot(r, year);
      const totals = (slot?.reporting ?? slot?.totals) as Record<string, number | undefined> | undefined;
      const value = Number(totals?.[metric] ?? 0);
      return { id: r.id, product_name: r.product_name, value, account_display: r.account_display ?? null };
    });
    const filtered = all.filter((item: RawRow) => {
      if (excludedIds.includes(item.id)) return false;
      if (item.account_display && excludedAccounts.includes(item.account_display)) return false;
      return true;
    });
    const totalMetric = filtered.reduce((acc: number, it: RawRow) => acc + (Number(it.value) || 0), 0);
    const sorted = [...filtered].sort((a: RawRow, b: RawRow) => (b.value - a.value));
    const limit = Number.isFinite(topCount) && topCount > 0 ? Math.floor(topCount) : 1;
    const topEntries = sorted.slice(0, limit);
    const topSelectionTotal = topEntries.reduce((acc: number, it: RawRow) => acc + (Number(it.value) || 0), 0);
    const processed = topEntries.map<ProcessedRow>((r) => ({
      id: r.id,
      product_name: r.product_name,
      value: r.value,
      pct_of_total: totalMetric > 0 ? Math.round((r.value / totalMetric) * 100) : 0,
    }));
    return { processed, totalMetric, topSelectionTotal };
  }, [rows, year, excludedIds, excludedAccounts, topCount, metric]);

  const itemOptions = useMemo<ItemOption[]>(() => (rows ?? [])
    .map((r: SummaryRow) => ({ id: r.id, name: r.product_name }))
    .sort((a: { id: string; name: string }, b: { id: string; name: string }) => a.name.localeCompare(b.name)), [rows]);

  const selectedItemOptions = useMemo<ItemOption[]>(() => {
    if (excludedIds.length === 0) return [];
    const lookup = new Map<string, ItemOption>(itemOptions.map((option) => [option.id, option]));
    return excludedIds
      .map((id) => lookup.get(id))
      .filter((option): option is ItemOption => Boolean(option));
  }, [excludedIds, itemOptions]);

  const accountOptions = useMemo<AccountOption[]>(() => {
    const seen = new Set<string>();
    const options: AccountOption[] = [];
    for (const row of rows ?? []) {
      const name = row.account_display?.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      options.push({ id: name, name });
    }
    options.sort((a, b) => a.name.localeCompare(b.name));
    return options;
  }, [rows]);

  const selectedAccountOptions = useMemo<AccountOption[]>(() => {
    if (excludedAccounts.length === 0) return [];
    const lookup = new Map<string, AccountOption>(accountOptions.map((option) => [option.id, option]));
    return excludedAccounts
      .map((id) => lookup.get(id))
      .filter((option): option is AccountOption => Boolean(option));
  }, [excludedAccounts, accountOptions]);

  const columns = useMemo<ColDef[]>(() => [
    { field: 'product_name', headerName: 'Product', flex: 1, minWidth: 220 },
    { field: 'value', headerName: `${metricLabel} (${year})`, width: 160, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'pct_of_total', headerName: 'Share of total', width: 160, type: 'rightAligned', valueFormatter: (p) => (p.value != null ? `${p.value}%` : '') },
  ], [year, metricLabel]);

  const gridApiRef = useRef<any>(null);
  const chartRef = useRef<ChartCardHandle>(null);

  const chartData = useMemo(() => processed.map((r) => ({ product_name: r.product_name, value: r.value })), [processed]);
  const chartOptions = useMemo(() => {
    const base = {
      title: { text: `Top ${chartData.length} OPEX — ${metricLabel} ${year}` },
      subtitle: { text: `Share of total annual ${metricLabel}` },
      footnote: { text: `Total ${metricLabel}: ${formatNumber(totalMetric)}` },
      data: chartData,
      legend: { enabled: false },
      animation: { enabled: true, duration: 800 },
    };
    if (chartType === 'pie') {
      return {
        ...base,
        series: [
          {
            type: 'pie',
            calloutLabelKey: 'product_name',
            sectorLabelKey: 'value',
            angleKey: 'value',
            calloutLabel: { offset: 20 },
            sectorLabel: {
              positionOffset: 30,
              formatter: ({ datum, angleKey }: any) => {
                const value = Number(datum[angleKey] || 0);
                const pct = totalMetric > 0 ? (value / totalMetric) * 100 : 0;
                const shown = Math.round(pct);
                return shown >= 5 ? `${shown}%` : '';
              },
            },
            strokeWidth: 1,
            tooltip: {
              enabled: true,
              renderer: (params: any) => {
                const { datum, angleKey } = params;
                const value = Number(datum[angleKey] || 0);
                const pct = totalMetric > 0 ? (value / totalMetric) * 100 : 0;
                return {
                  title: datum.product_name,
                  data: [
                    { label: metricLabel, value: formatNumber(value) },
                    { label: 'Share', value: `${pct.toFixed(1)}%` },
                  ],
                };
              },
            },
          },
        ],
      };
    }
    return {
      ...base,
      axes: [
        { type: 'category', position: 'left', label: { padding: 8 } },
        {
          type: 'number',
          position: 'bottom',
          label: {
            formatter: ({ value }: { value: number }) => formatNumber(value),
          },
        },
      ],
      series: [
        {
          type: 'bar',
          direction: 'horizontal',
          xKey: 'product_name',
          yKey: 'value',
          strokeWidth: 0,
          label: {
            formatter: ({ value }: { value: number }) => formatNumber(value),
          },
          tooltip: {
            enabled: true,
            renderer: ({ datum }: any) => {
              const value = Number(datum.value || 0);
              const pct = totalMetric > 0 ? (value / totalMetric) * 100 : 0;
              return {
                title: datum.product_name,
                data: [
                  { label: metricLabel, value: formatNumber(value) },
                  { label: 'Share', value: `${pct.toFixed(1)}%` },
                ],
              };
            },
          },
        },
      ],
    };
  }, [chartData, totalMetric, year, chartType, metricLabel]);

  const selectionSharePct = useMemo(() => (
    totalMetric > 0 ? Math.round((topSelectionTotal / totalMetric) * 100) : null
  ), [topSelectionTotal, totalMetric]);

  return (
    <ReportLayout
      title="Top OPEX"
      subtitle={`Largest OPEX items by selected year (${metricLabel})`}
      filters={(
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: { xs: 1, md: 1.5 },
          rowGap: { xs: 1, md: 1.5 },
          alignItems: 'flex-start',
        }}
        >
          <TextField select size="small" label="Year" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} sx={{ minWidth: 140 }}>
            <MenuItem value={Y - 1}>{Y - 1}</MenuItem>
            <MenuItem value={Y}>{Y}</MenuItem>
            <MenuItem value={Y + 1}>{Y + 1}</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="Metric"
            value={metric}
            onChange={(e) => setMetric(e.target.value as MetricKey)}
            sx={{ minWidth: 180 }}
          >
            {METRIC_SELECTION_ORDER.map((key) => (
              <MenuItem key={key} value={key}>{metricLabels[key]}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label="Top count"
            value={topCount}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10);
              setTopCount(Number.isNaN(next) ? 1 : Math.max(1, next));
            }}
            inputProps={{ min: 1, step: 1 }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            select
            size="small"
            label="Chart type"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'pie' | 'bar')}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="pie">Pie chart</MenuItem>
            <MenuItem value="bar">Horizontal bar chart</MenuItem>
          </TextField>
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            options={itemOptions}
            value={selectedItemOptions}
            onChange={(_, next) => {
              setExcludedIds(next.map((option) => option.id));
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                <ListItemText primary={option.name} />
              </li>
            )}
            renderTags={() => []}
            renderInput={(params) => {
              const count = excludedIds.length;
              return (
                <TextField
                  {...params}
                  label="Exclude items"
                  placeholder={count === 0 ? 'Select items to exclude' : ''}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: count > 0 ? (
                      <>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ ml: 0.5, mr: 1, whiteSpace: 'nowrap' }}
                        >
                          {count === 1 ? '1 item selected' : `${count} items selected`}
                        </Typography>
                        {params.InputProps.startAdornment}
                      </>
                    ) : params.InputProps.startAdornment,
                  }}
                />
              );
            }}
            sx={{ minWidth: 260 }}
            noOptionsText="No matching items"
          />
          <Autocomplete
            multiple
            size="small"
            disableCloseOnSelect
            options={accountOptions}
            value={selectedAccountOptions}
            onChange={(_, next) => {
              setExcludedAccounts(next.map((option) => option.id));
            }}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                <ListItemText primary={option.name} />
              </li>
            )}
            renderTags={() => []}
            renderInput={(params) => {
              const count = excludedAccounts.length;
              return (
                <TextField
                  {...params}
                  label="Exclude accounts"
                  placeholder={count === 0 ? 'Select accounts to exclude' : ''}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: count > 0 ? (
                      <>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ ml: 0.5, mr: 1, whiteSpace: 'nowrap' }}
                        >
                          {count === 1 ? '1 account selected' : `${count} accounts selected`}
                        </Typography>
                        {params.InputProps.startAdornment}
                      </>
                    ) : params.InputProps.startAdornment,
                  }}
                />
              );
            }}
            sx={{ minWidth: 260 }}
            noOptionsText="No matching accounts"
          />
        </Box>
      )}
      onExportTableCsv={() => gridApiRef.current?.exportDataAsCsv?.()}
      onExportChartPng={() => chartRef.current?.download(`top${processed.length}-opex-${year}-${metric}-${chartType}`)}
    >
      <Stack direction="column" spacing={2} alignItems="stretch">
        <Box sx={{ minWidth: 0 }}>
          <ChartCard ref={chartRef} title="Chart" options={chartOptions} height={520} />
        </Box>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Key Table</Typography>
          <Box component={AgGridBox}>
            <AgGridReact
              rowData={processed}
              columnDefs={columns}
              defaultColDef={{ sortable: true, resizable: true }}
              onGridReady={(e) => { gridApiRef.current = e.api; }}
              domLayout="autoHeight"
            />
          </Box>
          <Box sx={{ mt: 2, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{`Top ${processed.length} total`}</Typography>
              <Typography variant="subtitle2">{formatNumber(topSelectionTotal)}</Typography>
              <Typography variant="caption" color="text.secondary">
                {selectionSharePct == null ? '—' : `${selectionSharePct}% of filtered ${metricLabel.toLowerCase()}`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{`Total ${metricLabel.toLowerCase()}`}</Typography>
              <Typography variant="subtitle2">{formatNumber(totalMetric)}</Typography>
            </Box>
          </Box>
        </Paper>
      </Stack>
      {isLoading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Loading data…</Typography>
      )}
    </ReportLayout>
  );
}
