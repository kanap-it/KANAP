import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, Box, Checkbox, ListItemText, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';
import ReportLayout from '../../components/reports/ReportLayout';
import AgGridBox from '../../components/AgGridBox';
import ChartCard, { ChartCardHandle } from '../../components/reports/ChartCard';
import { useOpexSummaryAll, SummaryRow, pickYearSlot } from './useOpexSummary';

function formatNumber(v: any) {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return '';
  const i = Math.round(n);
  return i.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

const METRIC_LABELS: Record<string, string> = {
  budget: 'Budget',
  landing: 'Landing',
  follow_up: 'Follow-up',
  revision: 'Revision',
};

function labelForMetric(metric: string) {
  if (!metric) return '';
  if (METRIC_LABELS[metric]) return METRIC_LABELS[metric];
  return metric
    .split('_')
    .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : segment))
    .join(' ');
}

function inferYearFromVersionKey(key: string, currentYear: number): number | undefined {
  if (key === 'yMinus1') return currentYear - 1;
  if (key === 'y') return currentYear;
  if (key === 'yPlus1') return currentYear + 1;
  const match = /^y(\d{4})$/i.exec(key);
  if (match) return Number(match[1]);
  return undefined;
}

export default function OpexDeltaReport() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const previousYear = currentYear - 1;

  const [sourceYear, setSourceYear] = useState<number | null>(null);
  const [sourceMetric, setSourceMetric] = useState<string>('');
  const [destinationYear, setDestinationYear] = useState<number | null>(null);
  const [destinationMetric, setDestinationMetric] = useState<string>('');
  const [modes, setModes] = useState<Array<'increase' | 'decrease'>>(['increase']);
  const [topCount, setTopCount] = useState<number>(10);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [excludedAccounts, setExcludedAccounts] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('bar');

  const { data: rows, isLoading } = useOpexSummaryAll();

  type ProcessedRow = {
    id: string;
    product_name: string;
    current: number;
    previous: number;
    delta: number;
    pct_increase: number | null;
    direction: 'increase' | 'decrease';
  };

  type RawRow = {
    id: string;
    product_name: string;
    current: number;
    previous: number;
    delta: number;
    pct_increase: number | null;
    account_display: string | null;
  };

  type ItemOption = { id: string; name: string };
  type AccountOption = { id: string; name: string };
  type ColumnOption = { year: number; metric: string };

  const columnOptions = useMemo<ColumnOption[]>(() => {
    const seen = new Set<string>();
    const options: ColumnOption[] = [];
    const fallbackYear = currentYear;
    for (const row of rows ?? []) {
      const versions = row.versions ?? {};
      for (const [key, version] of Object.entries(versions)) {
        const versionEntry = version as { year?: number; totals?: Record<string, number>; reporting?: Record<string, number> } | undefined;
        if (!versionEntry) continue;
        const year = typeof versionEntry.year === 'number' ? versionEntry.year : inferYearFromVersionKey(key, fallbackYear);
        if (!year) continue;
        const totals = versionEntry.reporting ?? versionEntry.totals;
        if (!totals) continue;
        for (const metric of Object.keys(totals)) {
          const id = `${year}:${metric}`;
          if (seen.has(id)) continue;
          seen.add(id);
          options.push({ year, metric });
        }
      }
    }
    options.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.metric.localeCompare(b.metric);
    });
    return options;
  }, [rows, currentYear]);

  const yearOptions = useMemo<number[]>(() => {
    const years = Array.from(new Set(columnOptions.map((option) => option.year)));
    years.sort((a, b) => a - b);
    return years;
  }, [columnOptions]);

  const metricsByYear = useMemo<Map<number, string[]>>(() => {
    const map = new Map<number, string[]>();
    for (const option of columnOptions) {
      const metrics = map.get(option.year) ?? [];
      if (!metrics.includes(option.metric)) {
        metrics.push(option.metric);
      }
      map.set(option.year, metrics);
    }
    for (const [year, metrics] of map.entries()) {
      metrics.sort((a, b) => a.localeCompare(b));
      map.set(year, metrics);
    }
    return map;
  }, [columnOptions]);

  const destinationMetrics = useMemo<string[]>(() => {
    if (destinationYear == null) return [];
    return metricsByYear.get(destinationYear) ?? [];
  }, [destinationYear, metricsByYear]);

  const sourceMetrics = useMemo<string[]>(() => {
    if (sourceYear == null) return [];
    return metricsByYear.get(sourceYear) ?? [];
  }, [sourceYear, metricsByYear]);

  useEffect(() => {
    if (yearOptions.length === 0) return;
    setDestinationYear((prev) => {
      if (prev != null && yearOptions.includes(prev)) return prev;
      const preferred = yearOptions.includes(currentYear)
        ? currentYear
        : yearOptions[yearOptions.length - 1];
      return preferred ?? null;
    });
  }, [yearOptions, currentYear]);

  useEffect(() => {
    if (yearOptions.length === 0) return;
    setSourceYear((prev) => {
      if (prev != null && yearOptions.includes(prev)) return prev;
      const preferred = yearOptions.includes(previousYear)
        ? previousYear
        : yearOptions.includes(currentYear)
          ? currentYear
          : yearOptions[yearOptions.length - 1];
      return preferred ?? null;
    });
  }, [yearOptions, previousYear, currentYear]);

  useEffect(() => {
    if (destinationYear == null) {
      setDestinationMetric('');
      return;
    }
    const metrics = destinationMetrics;
    if (metrics.length === 0) {
      setDestinationMetric('');
      return;
    }
    setDestinationMetric((prev) => {
      if (prev && metrics.includes(prev)) return prev;
      if (metrics.includes('budget')) return 'budget';
      return metrics[0];
    });
  }, [destinationYear, destinationMetrics]);

  useEffect(() => {
    if (sourceYear == null) {
      setSourceMetric('');
      return;
    }
    const metrics = sourceMetrics;
    if (metrics.length === 0) {
      setSourceMetric('');
      return;
    }
    setSourceMetric((prev) => {
      if (prev && metrics.includes(prev)) return prev;
      if (metrics.includes('budget')) return 'budget';
      return metrics[0];
    });
  }, [sourceYear, sourceMetrics]);

  useEffect(() => {
    if (modes.length === 2 && chartType !== 'bar') {
      setChartType('bar');
    }
  }, [modes, chartType]);

  const valueForColumn = (row: SummaryRow, year: number | null, metric: string) => {
    if (year == null || !metric) return 0;
    const slot = pickYearSlot(row, year);
    const totals = (slot?.reporting ?? slot?.totals) as Record<string, number | undefined> | undefined;
    if (!totals) return 0;
    const raw = totals[metric];
    return Number(raw ?? 0);
  };

  const processed = useMemo<ProcessedRow[]>(() => {
    if (
      sourceYear == null
      || !sourceMetric
      || destinationYear == null
      || !destinationMetric
      || modes.length === 0
    ) {
      return [];
    }
    const items: RawRow[] = (rows ?? []).map((r: SummaryRow) => {
      const curr = valueForColumn(r, destinationYear, destinationMetric);
      const prev = valueForColumn(r, sourceYear, sourceMetric);
      const delta = curr - prev;
      const pct = prev > 0 ? (delta / prev) * 100 : null;
      return {
        id: r.id,
        product_name: r.product_name,
        current: curr,
        previous: prev,
        delta,
        pct_increase: pct,
        account_display: r.account_display ?? null,
      };
    });
    const filtered = items.filter((item: RawRow) => {
      if (excludedIds.includes(item.id)) return false;
      if (item.account_display && excludedAccounts.includes(item.account_display)) return false;
      return true;
    });
    const limit = Number.isFinite(topCount) && topCount > 0 ? Math.floor(topCount) : 1;

    const increases = modes.includes('increase')
      ? filtered
        .filter((item) => item.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, limit)
        .map<ProcessedRow>((row) => ({
          ...row,
          direction: 'increase',
        }))
      : [];

    const decreases = modes.includes('decrease')
      ? filtered
        .filter((item) => item.delta < 0)
        .sort((a, b) => a.delta - b.delta)
        .slice(0, limit)
        .map<ProcessedRow>((row) => ({
          ...row,
          direction: 'decrease',
        }))
      : [];

    return [...increases, ...decreases];
  }, [
    rows,
    sourceYear,
    sourceMetric,
    destinationYear,
    destinationMetric,
    modes,
    excludedIds,
    excludedAccounts,
    topCount,
  ]);

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

  const sourceLabel = sourceYear != null && sourceMetric
    ? `${labelForMetric(sourceMetric)} (${sourceYear})`
    : 'Source column';
  const destinationLabel = destinationYear != null && destinationMetric
    ? `${labelForMetric(destinationMetric)} (${destinationYear})`
    : 'Destination column';

  const columns = useMemo<ColDef[]>(() => [
    { field: 'product_name', headerName: 'Product', flex: 1, minWidth: 240 },
    { field: 'previous', headerName: sourceLabel, width: 200, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'current', headerName: destinationLabel, width: 200, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'delta', headerName: 'Δ', width: 140, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { field: 'pct_increase', headerName: '% increase', width: 140, type: 'rightAligned', valueFormatter: (p) => (p.value == null ? '' : `${Number(p.value).toFixed(1)}%`) },
  ], [sourceLabel, destinationLabel]);

  const gridApiRef = useRef<any>(null);
  const chartRef = useRef<ChartCardHandle>(null);

  const chartData = useMemo(() => processed
    .filter((r) => r.delta !== 0)
    .map((r) => ({
      product_name: r.product_name,
      delta: r.delta,
      direction: r.direction,
      magnitude: Math.abs(r.delta),
    })), [processed]);

  const totalMagnitude = useMemo(() => chartData.reduce((acc: number, d) => acc + (Number(d.magnitude) || 0), 0), [chartData]);

  const allTotals = useMemo(() => {
    if (
      sourceYear == null
      || !sourceMetric
      || destinationYear == null
      || !destinationMetric
    ) {
      return { grossIncrease: 0, grossDecrease: 0, net: 0 };
    }
    let grossIncrease = 0;
    let grossDecrease = 0;
    let net = 0;
    for (const r of rows ?? []) {
      if (excludedIds.includes(r.id)) continue;
      const accountName = r.account_display?.trim();
      if (accountName && excludedAccounts.includes(accountName)) continue;
      const curr = valueForColumn(r, destinationYear, destinationMetric);
      const prev = valueForColumn(r, sourceYear, sourceMetric);
      const d = curr - prev;
      net += d;
      if (d > 0) grossIncrease += d; else grossDecrease += -d;
    }
    return { grossIncrease, grossDecrease, net };
  }, [
    rows,
    sourceYear,
    sourceMetric,
    destinationYear,
    destinationMetric,
    excludedIds,
    excludedAccounts,
  ]);

  const topTotals = useMemo(() => processed.reduce((acc, row) => {
    if (row.direction === 'increase') acc.increase += row.delta;
    if (row.direction === 'decrease') acc.decrease += -row.delta;
    return acc;
  }, { increase: 0, decrease: 0 }), [processed]);

  const increaseShare = useMemo(() => (
    allTotals.grossIncrease > 0 ? (topTotals.increase / allTotals.grossIncrease) * 100 : null
  ), [topTotals.increase, allTotals.grossIncrease]);

  const decreaseShare = useMemo(() => (
    allTotals.grossDecrease > 0 ? (topTotals.decrease / allTotals.grossDecrease) * 100 : null
  ), [topTotals.decrease, allTotals.grossDecrease]);

  const netTitle = allTotals.net >= 0 ? 'Net increase (all items)' : 'Net decrease (all items)';
  const topSelectionPrevSum = useMemo(() => processed.reduce((acc: number, r) => acc + (Number(r.previous) || 0), 0), [processed]);
  const topSelectionCurrSum = useMemo(() => processed.reduce((acc: number, r) => acc + (Number(r.current) || 0), 0), [processed]);

  const increaseCount = processed.filter((row) => row.direction === 'increase').length;
  const decreaseCount = processed.filter((row) => row.direction === 'decrease').length;

  const directionLabel = (() => {
    if (modes.length === 2) return 'Changes';
    if (modes[0] === 'increase') return 'Increases';
    return 'Decreases';
  })();

  const countLabel = (() => {
    if (modes.length === 2) {
      return `${increaseCount}+${decreaseCount}`;
    }
    return `${processed.length}`;
  })();

  const countSlug = modes.length === 2 ? `${increaseCount}-${decreaseCount}` : `${processed.length}`;

  const selectionFootnote = (() => {
    if (modes.length === 2) {
      return `Selection totals — Inc: ${formatNumber(topTotals.increase)} · Dec: ${formatNumber(topTotals.decrease)}`;
    }
    if (modes[0] === 'increase') {
      return `Total Increase: ${formatNumber(topTotals.increase)}`;
    }
    return `Total Decrease: ${formatNumber(topTotals.decrease)}`;
  })();

  const chartOptions = useMemo(() => {
    const base = {
      title: { text: `Top ${countLabel} OPEX ${directionLabel} — ${sourceLabel} → ${destinationLabel}` },
      subtitle: { text: 'Share of total change magnitude' },
      footnote: { text: selectionFootnote },
      data: chartData,
      legend: { enabled: false },
      animation: { enabled: true, duration: 800 },
    };
    if (chartType === 'pie' && modes.length === 1) {
      return {
        ...base,
        series: [
          {
            type: 'pie',
            calloutLabelKey: 'product_name',
            sectorLabelKey: 'magnitude',
            angleKey: 'magnitude',
            calloutLabel: { offset: 20 },
            sectorLabel: {
              positionOffset: 30,
              formatter: ({ datum, angleKey }: any) => {
                const value = Number(datum[angleKey] || 0);
                const pct = totalMagnitude > 0 ? (value / totalMagnitude) * 100 : 0;
                const shown = Math.round(pct);
                return shown >= 5 ? `${shown}%` : '';
              },
            },
            strokeWidth: 1,
            tooltip: {
              enabled: true,
              renderer: ({ datum }: any) => {
                const magnitude = Number(datum.magnitude || 0);
                const pct = totalMagnitude > 0 ? (magnitude / totalMagnitude) * 100 : 0;
                const changeLabel = datum.direction === 'increase' ? 'Increase' : 'Decrease';
                return {
                  title: datum.product_name,
                  data: [
                    { label: changeLabel, value: formatNumber(magnitude) },
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
          yKey: 'delta',
          strokeWidth: 0,
          label: {
            formatter: ({ value }: { value: number }) => formatNumber(value),
          },
          tooltip: {
            enabled: true,
            renderer: ({ datum }: any) => {
              const magnitude = Number(datum.magnitude || 0);
              const pct = totalMagnitude > 0 ? (magnitude / totalMagnitude) * 100 : 0;
              const changeLabel = datum.direction === 'increase' ? 'Increase' : 'Decrease';
              return {
                title: datum.product_name,
                data: [
                  { label: changeLabel, value: formatNumber(datum.delta) },
                  { label: 'Share', value: `${pct.toFixed(1)}%` },
                ],
              };
            },
          },
        },
      ],
    };
  }, [chartData, totalMagnitude, directionLabel, countLabel, sourceLabel, destinationLabel, chartType, selectionFootnote, modes.length]);

  useEffect(() => {
    const api = gridApiRef.current;
    if (!api) return;
    const setSort = (model: Array<{ colId: string; sort?: 'asc' | 'desc' }>) => {
      if (typeof (api as any).setSortModel === 'function') {
        (api as any).setSortModel(model);
        return;
      }
      if (typeof (api as any).applyColumnState === 'function') {
        (api as any).applyColumnState({
          defaultState: { sort: null },
          state: model.map((item) => ({
            colId: item.colId,
            sort: item.sort ?? null,
          })),
        });
      }
    };
    if (modes.length === 1) {
      setSort([{ colId: 'delta', sort: modes[0] === 'increase' ? 'desc' : 'asc' }]);
      return;
    }
    setSort([]);
  }, [modes, processed]);

  const columnSelectDisabled = yearOptions.length === 0;

  const coverageLabel = (() => {
    if (modes.length === 2) {
      const pieces: string[] = [];
      if (increaseShare != null) pieces.push(`Inc: ${increaseShare.toFixed(1)}%`);
      if (decreaseShare != null) pieces.push(`Dec: ${decreaseShare.toFixed(1)}%`);
      return pieces.length > 0 ? `Coverage — ${pieces.join(' · ')}` : 'Coverage — n/a';
    }
    if (modes[0] === 'increase') {
      return increaseShare == null ? 'Coverage — n/a' : `Coverage — ${increaseShare.toFixed(1)}% covered`;
    }
    return decreaseShare == null ? 'Coverage — n/a' : `Coverage — ${decreaseShare.toFixed(1)}% covered`;
  })();

  const modeSlug = modes.length === 0 ? 'mode' : modes.slice().sort().join('-');
  const sourceSlug = sourceYear != null && sourceMetric ? `${sourceYear}-${sourceMetric}` : 'source';
  const destinationSlug = destinationYear != null && destinationMetric ? `${destinationYear}-${destinationMetric}` : 'destination';

  return (
    <ReportLayout
      title="Top OPEX Increase / Decrease"
      subtitle="Largest variations vs previous year"
      filters={(
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: { xs: 1, md: 1.5 },
          rowGap: { xs: 1, md: 1.5 },
          alignItems: 'flex-start',
        }}
        >
          <TextField
            select
            size="small"
            label="Source year"
            value={sourceYear ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setSourceYear(value === '' ? null : Number(value));
            }}
            disabled={columnSelectDisabled}
            sx={{ minWidth: 160 }}
          >
            {columnSelectDisabled ? (
              <MenuItem value="" disabled>No years available</MenuItem>
            ) : (
              yearOptions.map((year) => (
                <MenuItem key={`source-year-${year}`} value={year}>{year}</MenuItem>
              ))
            )}
          </TextField>
          <TextField
            select
            size="small"
            label="Source metric"
            value={sourceMetric}
            onChange={(e) => setSourceMetric(e.target.value)}
            disabled={columnSelectDisabled || sourceMetrics.length === 0}
            sx={{ minWidth: 200 }}
          >
            {sourceMetrics.length === 0 ? (
              <MenuItem value="" disabled>No metrics available</MenuItem>
            ) : (
              sourceMetrics.map((metric) => (
                <MenuItem key={`source-metric-${metric}`} value={metric}>{labelForMetric(metric)}</MenuItem>
              ))
            )}
          </TextField>
          <TextField
            select
            size="small"
            label="Destination year"
            value={destinationYear ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setDestinationYear(value === '' ? null : Number(value));
            }}
            disabled={columnSelectDisabled}
            sx={{ minWidth: 160 }}
          >
            {columnSelectDisabled ? (
              <MenuItem value="" disabled>No years available</MenuItem>
            ) : (
              yearOptions.map((year) => (
                <MenuItem key={`dest-year-${year}`} value={year}>{year}</MenuItem>
              ))
            )}
          </TextField>
          <TextField
            select
            size="small"
            label="Destination metric"
            value={destinationMetric}
            onChange={(e) => setDestinationMetric(e.target.value)}
            disabled={columnSelectDisabled || destinationMetrics.length === 0}
            sx={{ minWidth: 200 }}
          >
            {destinationMetrics.length === 0 ? (
              <MenuItem value="" disabled>No metrics available</MenuItem>
            ) : (
              destinationMetrics.map((metric) => (
                <MenuItem key={`dest-metric-${metric}`} value={metric}>{labelForMetric(metric)}</MenuItem>
              ))
            )}
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
          />
          <TextField
            select
            size="small"
            label="Chart type"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'pie' | 'bar')}
            helperText={modes.length === 2 ? 'Pie chart available when a single direction is selected' : undefined}
          >
            <MenuItem value="pie" disabled={modes.length === 2}>Pie chart</MenuItem>
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
          <ToggleButtonGroup
            size="small"
            value={modes}
            onChange={(_, next) => {
              if (!next || next.length === 0) {
                setModes(['increase']);
              } else {
                const unique = Array.from(new Set(next)) as Array<'increase' | 'decrease'>;
                setModes(unique);
              }
            }}
            aria-label="Increase or decrease"
          >
            <ToggleButton value="increase">Increase</ToggleButton>
            <ToggleButton value="decrease">Decrease</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
      onExportTableCsv={() => gridApiRef.current?.exportDataAsCsv?.()}
      onExportChartPng={() => {
        const increaseSlug = `inc${increaseCount}`;
        const decreaseSlug = `dec${decreaseCount}`;
        chartRef.current?.download(`top${countSlug}-opex-delta-${sourceSlug}-to-${destinationSlug}-${modeSlug}-${increaseSlug}-${decreaseSlug}-${chartType}`);
      }}
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
          <Box sx={{ mt: 2, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">
                {modes.length === 2
                  ? `Top ${increaseCount}/${decreaseCount} selection totals`
                  : `Top ${processed.length} total ${modes[0] === 'increase' ? 'increase' : 'decrease'}`}
              </Typography>
              <Typography variant="subtitle2">
                {modes.length === 2
                  ? `Inc: ${formatNumber(topTotals.increase)} · Dec: ${formatNumber(topTotals.decrease)}`
                  : formatNumber(modes[0] === 'increase' ? topTotals.increase : topTotals.decrease)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Source: {formatNumber(topSelectionPrevSum)} · Destination: {formatNumber(topSelectionCurrSum)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">
                {modes.length === 2
                  ? 'Gross changes (all items)'
                  : `Gross ${modes[0] === 'increase' ? 'increase' : 'decrease'} (all items)`}
              </Typography>
              <Typography variant="subtitle2">
                {modes.length === 2
                  ? `Inc: ${formatNumber(allTotals.grossIncrease)} · Dec: ${formatNumber(allTotals.grossDecrease)}`
                  : formatNumber(modes[0] === 'increase' ? allTotals.grossIncrease : allTotals.grossDecrease)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {coverageLabel}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" color="text.secondary">{netTitle}</Typography>
              <Typography variant="subtitle2">{formatNumber(allTotals.net)}</Typography>
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
