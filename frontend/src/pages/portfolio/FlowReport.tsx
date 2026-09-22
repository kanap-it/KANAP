import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Box, MenuItem, Stack, TextField, Typography, useTheme } from '@mui/material';
import { AgChartsReact } from 'ag-charts-react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import AgGridBox from '../../components/AgGridBox';
import ReportLayout, {
  ReportFilter,
  reportFilterMenuProps,
  reportFilterSelectSx,
  reportGridHeight,
  useFillViewportHeight,
} from '../../components/reports/ReportLayout';
import { drawerMenuItemSx } from '../../theme/formSx';
import { formatShortDate } from '../../lib/dateFormat';
import { useLocale } from '../../i18n/useLocale';
import {
  BLANK,
  createdBetween,
  FilterModel,
  projectsPath,
  requestsPath,
  TASK_SCOPE,
  tasksPath,
} from './components/portfolioListLinks';

/* ------------------------------------------------------------------ */
/*  Contract                                                          */
/* ------------------------------------------------------------------ */

type FlowWeek = { weekStart: string; weekEnd: string; created: number; closed: number; openAtEnd: number };
type FlowSeries = { weeks: FlowWeek[]; openNow: number };
type AgeBucket = 'upTo7' | 'from8To30' | 'from31To90' | 'over90';
type AgeRow = {
  taskTypeId: string | null;
  taskTypeName: string | null;
  buckets: Record<AgeBucket, number>;
  total: number;
};
type LeadTime = { closedCount: number; medianDays: number | null };
type LeadTimeByType = { taskTypeId: string | null; taskTypeName: string | null } & LeadTime;

type FlowReportResponse = {
  weeks: number;
  startDate: string;
  endDate: string;
  timeZone: string;
  asOf: string;
  flow: { tasks: FlowSeries; requests: FlowSeries; projects: FlowSeries };
  age: { rows: AgeRow[]; total: AgeRow };
  leadTime: { tasks: LeadTime; tasksByType: LeadTimeByType[]; requests: LeadTime; projects: LeadTime };
};

type EntityKey = 'tasks' | 'requests' | 'projects';

const ENTITY_KEYS: EntityKey[] = ['tasks', 'requests', 'projects'];

export const FLOW_PERIODS = [8, 13, 26];
export const FLOW_WEEKS_STORAGE_KEY = 'kanap.portfolioReports.flowWeeks';

/* ------------------------------------------------------------------ */
/*  Charter surfaces                                                  */
/* ------------------------------------------------------------------ */

const SECTION_SX = {
  border: '1px solid',
  borderColor: 'kanap.border.default',
  borderRadius: '8px',
  bgcolor: 'kanap.bg.primary',
  p: 2,
} as const;

const SECTION_TITLE_SX = { fontSize: 16, fontWeight: 500, color: 'kanap.text.primary', mb: 1.5 } as const;

const TILE_SX = {
  flex: 1,
  minWidth: 180,
  bgcolor: 'kanap.bg.drawer',
  border: '1px solid',
  borderColor: 'kanap.border.soft',
  borderRadius: '8px',
  px: 2,
  py: 1.25,
} as const;

const LINK_SX = {
  color: 'inherit',
  textDecoration: 'none',
  '&:hover': { textDecoration: 'underline' },
} as const;

/**
 * Series colours, slots 1 and 2 of the data-viz palette, stepped per mode. They clear the
 * lightness band, the chroma floor, the colour-vision separation and the 3:1 contrast against
 * the chart surface in both modes; the charter's blue/green pair does not in dark mode.
 */
const SERIES_COLORS = {
  light: { created: '#2a78d6', closed: '#eb6834' },
  dark: { created: '#3987e5', closed: '#d95926' },
} as const;

const readStoredWeeks = (): number => {
  try {
    const stored = Number(window.localStorage.getItem(FLOW_WEEKS_STORAGE_KEY));
    if (FLOW_PERIODS.includes(stored)) return stored;
  } catch {
    // A browser that refuses storage still gets the default period.
  }
  return 13;
};

const storeWeeks = (weeks: number) => {
  try {
    window.localStorage.setItem(FLOW_WEEKS_STORAGE_KEY, String(weeks));
  } catch {
    // Remembering the period is a convenience, never a requirement.
  }
};

const viewerTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

/** `day` shifted by a whole number of calendar days, both sides `YYYY-MM-DD`. */
const shiftDay = (day: string, offset: number): string => {
  const shifted = new Date(`${day}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + offset);
  return shifted.toISOString().slice(0, 10);
};

/** The weekly report, narrowed to one week of the window. */
const weeklyPath = (from: string, to: string) =>
  `/portfolio/reports/weekly?startDate=${from}&endDate=${to}`;

const listPathFor = (key: EntityKey): string =>
  key === 'tasks' ? tasksPath() : key === 'requests' ? requestsPath() : projectsPath();

/* ------------------------------------------------------------------ */
/*  Stat tile                                                         */
/* ------------------------------------------------------------------ */

/**
 * The open stock of the last weeks, as a bare 12-point line. It carries the shape of the
 * trend, never a value: the figures live in the tile, the chart and the table below.
 */
function Sparkline({ points, label }: { points: number[]; label: string }) {
  const theme = useTheme();
  const width = 96;
  const height = 22;
  if (points.length < 2) return <Box sx={{ height, width }} />;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = width / (points.length - 1);
  const coords = points.map((value, index) => ({
    x: index * step,
    y: height - 3 - ((value - min) / span) * (height - 6),
  }));
  const path = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1];
  const dark = theme.palette.mode === 'dark';

  return (
    <Box
      component="svg"
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      sx={{ width, height, display: 'block', overflow: 'visible' }}
    >
      <path d={path} fill="none" stroke={theme.palette.kanap.border.default} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={4} fill={dark ? SERIES_COLORS.dark.created : SERIES_COLORS.light.created} stroke={theme.palette.kanap.bg.drawer} strokeWidth={2} />
    </Box>
  );
}

function StatTile({
  label,
  value,
  to,
  caption,
  delta,
  trend,
  trendLabel,
}: {
  label: string;
  value: string;
  to: string | null;
  caption: string;
  delta: string;
  trend: number[];
  trendLabel: string;
}) {
  return (
    <Box sx={TILE_SX}>
      <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.tertiary' }}>{label}</Typography>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="baseline" spacing={0.75}>
            {to ? (
              <Typography component={RouterLink} to={to} sx={{ ...LINK_SX, fontSize: 22, fontWeight: 500, color: 'kanap.text.primary' }}>
                {value}
              </Typography>
            ) : (
              <Typography sx={{ fontSize: 22, fontWeight: 500, color: 'kanap.text.primary' }}>{value}</Typography>
            )}
            <Typography sx={{ fontSize: 12, fontWeight: 400, color: 'kanap.text.secondary' }}>{caption}</Typography>
          </Stack>
          <Typography sx={{ fontSize: 12, fontWeight: 400, color: 'kanap.text.tertiary' }}>{delta}</Typography>
        </Box>
        <Sparkline points={trend} label={trendLabel} />
      </Stack>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function FlowReport() {
  const { t } = useTranslation('portfolio');
  const locale = useLocale();
  const theme = useTheme();
  const navigate = useNavigate();
  const dark = theme.palette.mode === 'dark';

  const [weeks, setWeeks] = useState<number>(readStoredWeeks);
  const [tableOpen, setTableOpen] = useState(false);

  const { data, isError } = useQuery<FlowReportResponse>({
    queryKey: ['portfolio-flow-report', weeks],
    queryFn: async () =>
      (await api.get<FlowReportResponse>('/portfolio/reports/flow', { params: { weeks, tz: viewerTimeZone() } })).data,
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });

  const changePeriod = (next: number) => {
    setWeeks(next);
    storeWeeks(next);
  };

  const day = useCallback((value: string) => formatShortDate(value, locale), [locale]);

  const openWeek = useCallback(
    (week: FlowWeek) => {
      navigate(weeklyPath(week.weekStart, week.weekEnd));
    },
    [navigate],
  );

  /* ---------------------------------------------------------------- */
  /*  Charts                                                          */
  /* ---------------------------------------------------------------- */

  const colors = dark ? SERIES_COLORS.dark : SERIES_COLORS.light;

  const chartFor = useCallback(
    (key: EntityKey, series: FlowSeries) => {
      const rows = series.weeks.map((week) => ({
        label: day(week.weekStart),
        created: week.created,
        closed: week.closed,
        openAtEnd: week.openAtEnd,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
      }));

      const tooltip = {
        renderer: (params: any) => {
          const row = params.datum;
          return {
            title: t('reports.flow.charts.weekRange', { from: day(row.weekStart), to: day(row.weekEnd) }),
            content: [
              `${t('reports.flow.charts.created')}: ${row.created}`,
              `${t('reports.flow.charts.closed')}: ${row.closed}`,
              `${t('reports.flow.charts.openAtEnd')}: ${row.openAtEnd}`,
            ].join('<br/>'),
          };
        },
      };

      const bar = (yKey: 'created' | 'closed', name: string, fill: string) => ({
        type: 'bar' as const,
        xKey: 'label',
        yKey,
        yName: name,
        fill,
        stroke: fill,
        cornerRadius: 4,
        tooltip,
      });

      return {
        key,
        options: {
          theme: dark ? 'ag-default-dark' : 'ag-default',
          background: { fill: 'transparent' },
          data: rows,
          series: [
            bar('created', t('reports.flow.charts.created'), colors.created),
            bar('closed', t('reports.flow.charts.closed'), colors.closed),
          ],
          axes: [
            {
              type: 'category',
              position: 'bottom',
              // Leftover band width is the gutter: the marks stay thin and never touch.
              paddingInner: 0.35,
              groupPaddingInner: 0.15,
              label: { color: theme.palette.kanap.text.tertiary, fontSize: 11 },
              line: { stroke: theme.palette.kanap.border.soft },
              gridLine: { enabled: false },
            },
            {
              type: 'number',
              position: 'left',
              label: { color: theme.palette.kanap.text.tertiary, fontSize: 11 },
              line: { enabled: false },
              gridLine: { style: [{ stroke: theme.palette.kanap.border.soft, lineDash: [] }] },
            },
          ],
          legend: {
            enabled: true,
            position: 'bottom' as const,
            item: { label: { color: theme.palette.kanap.text.secondary, fontSize: 11 } },
          },
          padding: { top: 8, right: 8, bottom: 4, left: 4 },
          animation: { enabled: false },
          listeners: {
            seriesNodeClick: (event: any) => {
              const row = event?.datum;
              if (row?.weekStart && row?.weekEnd) navigate(weeklyPath(row.weekStart, row.weekEnd));
            },
          },
        },
      };
    },
    [colors, dark, day, navigate, t, theme],
  );

  const charts = useMemo(
    () => (data ? ENTITY_KEYS.map((key) => chartFor(key, data.flow[key])) : []),
    [chartFor, data],
  );

  /* ---------------------------------------------------------------- */
  /*  Flow table                                                      */
  /* ---------------------------------------------------------------- */

  type FlowTableRow = FlowWeek & {
    tasks: FlowWeek;
    requests: FlowWeek;
    projects: FlowWeek;
  };

  const flowRows = useMemo<FlowTableRow[]>(() => {
    if (!data) return [];
    return data.flow.tasks.weeks.map((week, index) => ({
      ...week,
      tasks: week,
      requests: data.flow.requests.weeks[index],
      projects: data.flow.projects.weeks[index],
    }));
  }, [data]);

  const flowColumns = useMemo<ColDef<FlowTableRow>[]>(() => {
    const weekCell = (params: ICellRendererParams<FlowTableRow>) =>
      params.data ? day(params.data.weekStart) : '';

    const countCell =
      (key: EntityKey, field: 'created' | 'closed') =>
      (params: ICellRendererParams<FlowTableRow>) => {
        const row = params.data;
        if (!row) return null;
        const value = row[key][field];
        if (value === 0) return <span>0</span>;
        return (
          <RouterLink to={weeklyPath(row.weekStart, row.weekEnd)} style={{ color: 'inherit' }}>
            {value}
          </RouterLink>
        );
      };

    const numeric = (headerName: string, valueGetter: (row: FlowTableRow) => number): ColDef<FlowTableRow> => ({
      headerName,
      width: 116,
      type: 'numericColumn',
      valueGetter: (params) => (params.data ? valueGetter(params.data) : 0),
    });

    const trio = (key: EntityKey): ColDef<FlowTableRow>[] => [
      {
        headerName: t(`reports.flow.columns.${key}Created`),
        width: 132,
        type: 'numericColumn',
        valueGetter: (params) => params.data?.[key].created ?? 0,
        cellRenderer: countCell(key, 'created'),
      },
      {
        headerName: t(`reports.flow.columns.${key}Closed`),
        width: 140,
        type: 'numericColumn',
        valueGetter: (params) => params.data?.[key].closed ?? 0,
        cellRenderer: countCell(key, 'closed'),
      },
      // The stock at the end of a past week is a computed state: no list holds exactly it.
      numeric(t(`reports.flow.columns.${key}Open`), (row) => row[key].openAtEnd),
    ];

    return [
      { headerName: t('reports.flow.columns.week'), width: 120, cellRenderer: weekCell },
      ...ENTITY_KEYS.flatMap(trio),
    ];
  }, [day, t]);

  /* ---------------------------------------------------------------- */
  /*  Age of open tasks                                               */
  /* ---------------------------------------------------------------- */

  type AgeTableRow = AgeRow & { isTotal: boolean };

  const ageRows = useMemo<AgeTableRow[]>(() => {
    if (!data) return [];
    const rows: AgeTableRow[] = data.age.rows.map((row) => ({ ...row, isTotal: false }));
    if (rows.length === 0) return rows;
    return [...rows, { ...data.age.total, isTotal: true }];
  }, [data]);

  const ageColumns = useMemo<ColDef<AgeTableRow>[]>(() => {
    const today = data?.endDate ?? '';

    /** The `created_at` window of a bracket, read against the report's own "today". */
    const bracketFilter = (bucket: AgeBucket): FilterModel => {
      if (bucket === 'upTo7') return { created_at: createdBetween(shiftDay(today, -7), null) };
      if (bucket === 'from8To30') return { created_at: createdBetween(shiftDay(today, -30), shiftDay(today, -8)) };
      if (bucket === 'from31To90') return { created_at: createdBetween(shiftDay(today, -90), shiftDay(today, -31)) };
      return { created_at: createdBetween(null, shiftDay(today, -90)) };
    };

    const typeFilter = (row: AgeTableRow): FilterModel => {
      if (row.isTotal) return {};
      if (!row.taskTypeName) return { task_type_name: BLANK };
      return { task_type_name: { filterType: 'set', values: [row.taskTypeName] } };
    };

    const cell =
      (bucket: AgeBucket | null) =>
      (params: ICellRendererParams<AgeTableRow>) => {
        const row = params.data;
        if (!row) return null;
        const value = bucket ? row.buckets[bucket] : row.total;
        const weight = row.isTotal ? 500 : 400;
        if (value === 0 || !today) return <span style={{ fontWeight: weight }}>{value}</span>;
        const filters = { ...typeFilter(row), ...(bucket ? bracketFilter(bucket) : {}) };
        return (
          <RouterLink to={tasksPath(filters)} style={{ color: 'inherit', fontWeight: weight }}>
            {value}
          </RouterLink>
        );
      };

    const bucketColumn = (bucket: AgeBucket): ColDef<AgeTableRow> => ({
      headerName: t(`reports.flow.columns.${bucket}`),
      width: 120,
      type: 'numericColumn',
      valueGetter: (params) => params.data?.buckets[bucket] ?? 0,
      cellRenderer: cell(bucket),
    });

    return [
      {
        headerName: t('reports.flow.columns.taskType'),
        flex: 1,
        minWidth: 180,
        valueGetter: (params) => {
          if (!params.data) return '';
          if (params.data.isTotal) return t('reports.flow.rows.total');
          return params.data.taskTypeName ?? t('reports.flow.rows.noType');
        },
        cellStyle: (params) => (params.data?.isTotal ? { fontWeight: 500 } : null),
      },
      bucketColumn('upTo7'),
      bucketColumn('from8To30'),
      bucketColumn('from31To90'),
      bucketColumn('over90'),
      {
        headerName: t('reports.flow.columns.total'),
        width: 100,
        type: 'numericColumn',
        valueGetter: (params) => params.data?.total ?? 0,
        cellRenderer: cell(null),
      },
    ];
  }, [data, t]);

  /* ---------------------------------------------------------------- */
  /*  Median time to close                                            */
  /* ---------------------------------------------------------------- */

  const leadColumns = useMemo<ColDef<LeadTimeByType>[]>(
    () => [
      {
        headerName: t('reports.flow.columns.taskType'),
        flex: 1,
        minWidth: 180,
        valueGetter: (params) => params.data?.taskTypeName ?? t('reports.flow.rows.noType'),
      },
      {
        headerName: t('reports.flow.columns.closedCount'),
        width: 120,
        type: 'numericColumn',
        valueGetter: (params) => params.data?.closedCount ?? 0,
      },
      {
        headerName: t('reports.flow.columns.medianDays'),
        width: 140,
        type: 'numericColumn',
        valueGetter: (params) =>
          params.data?.medianDays == null
            ? t('reports.flow.tiles.noValue')
            : t('reports.flow.tiles.days', { count: params.data.medianDays }),
      },
    ],
    [t],
  );

  const { ref: flowTableRef, height: flowTableFill } = useFillViewportHeight();

  const firstWeek = data?.flow.tasks.weeks[0];

  const tiles = ENTITY_KEYS.map((key) => {
    const series = data?.flow[key];
    const openNow = series?.openNow ?? 0;
    const opening = series?.weeks[0]?.openAtEnd ?? 0;
    const delta = openNow - opening;
    const since = firstWeek ? day(firstWeek.weekStart) : '';
    return {
      key,
      label: t(`reports.flow.tiles.${key}`),
      value: String(openNow),
      to: listPathFor(key),
      caption: t('reports.flow.tiles.openToday'),
      delta:
        delta === 0
          ? t('reports.flow.tiles.steady', { date: since })
          : t('reports.flow.tiles.deltaSince', { delta: delta > 0 ? `+${delta}` : String(delta), date: since }),
      trend: (series?.weeks ?? []).slice(-12).map((week) => week.openAtEnd),
    };
  });

  const leadTiles = ENTITY_KEYS.map((key) => {
    const lead = data?.leadTime[key] ?? { closedCount: 0, medianDays: null };
    return { key, label: t(`reports.flow.tiles.${key}`), lead };
  });

  return (
    <ReportLayout
      title={t('reports.flow.title')}
      subtitle={t('reports.flow.subtitle')}
      rootTo="/portfolio/reports"
      rootLabel={t('reports.title')}
      filters={(
        <ReportFilter label={t('reports.flow.filters.period')} width={180}>
          <TextField
            select
            size="small"
            value={weeks}
            onChange={(event) => changePeriod(Number(event.target.value))}
            SelectProps={{ MenuProps: reportFilterMenuProps }}
            sx={reportFilterSelectSx}
          >
            {FLOW_PERIODS.map((option) => (
              <MenuItem key={option} value={option} sx={drawerMenuItemSx}>
                {t('reports.flow.filters.periodOption', { count: option })}
              </MenuItem>
            ))}
          </TextField>
        </ReportFilter>
      )}
    >
      {isError && <Alert severity="error">{t('reports.flow.messages.loadFailed')}</Alert>}

      {/* 1. Weekly flow ------------------------------------------------ */}
      <Box sx={SECTION_SX}>
        <Typography component="h2" sx={SECTION_TITLE_SX}>
          {t('reports.flow.sections.flow')}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          {tiles.map((tile) => (
            <StatTile
              key={tile.key}
              label={tile.label}
              value={tile.value}
              to={tile.to}
              caption={tile.caption}
              delta={tile.delta}
              trend={tile.trend}
              trendLabel={t('reports.flow.tiles.trendLabel')}
            />
          ))}
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          {charts.map((chart) => (
            <Box
              key={chart.key}
              sx={{
                bgcolor: 'kanap.bg.drawer',
                border: '1px solid',
                borderColor: 'kanap.border.soft',
                borderRadius: '8px',
                p: 1.5,
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.tertiary', mb: 0.5 }}>
                {t(`reports.flow.tiles.${chart.key}`)}
              </Typography>
              <Box sx={{ height: 260 }}>
                <AgChartsReact options={chart.options as any} />
              </Box>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 1.5 }}>
          <Typography
            component="button"
            type="button"
            onClick={() => setTableOpen((open) => !open)}
            aria-expanded={tableOpen}
            sx={{
              fontSize: 12,
              fontWeight: 400,
              color: 'kanap.teal',
              border: 0,
              p: 0,
              bgcolor: 'transparent',
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {tableOpen ? t('reports.flow.actions.hideTable') : t('reports.flow.actions.showTable')}
          </Typography>
        </Box>

        {tableOpen && (
          <Box ref={flowTableRef} sx={{ mt: 1 }}>
            <Box
              component={AgGridBox}
              sx={{ width: '100%', height: reportGridHeight(flowTableFill, flowRows.length) }}
            >
              <AgGridReact<FlowTableRow>
                rowData={flowRows}
                columnDefs={flowColumns}
                defaultColDef={{ sortable: false, resizable: true, suppressMenu: true }}
                suppressCellFocus
                getRowId={(params) => params.data.weekStart}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* 2. Age of open tasks ------------------------------------------ */}
      <Box sx={SECTION_SX}>
        <Typography component="h2" sx={SECTION_TITLE_SX}>
          {t('reports.flow.sections.age')}
        </Typography>
        {ageRows.length === 0 ? (
          <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary' }}>
            {t('reports.flow.empty.age')}
          </Typography>
        ) : (
          <Box component={AgGridBox} sx={{ width: '100%' }}>
            <AgGridReact<AgeTableRow>
              rowData={ageRows}
              columnDefs={ageColumns}
              defaultColDef={{ sortable: false, resizable: true, suppressMenu: true }}
              suppressCellFocus
              domLayout="autoHeight"
              getRowId={(params) => (params.data.isTotal ? 'total' : params.data.taskTypeId ?? 'none')}
            />
          </Box>
        )}
      </Box>

      {/* 3. Median time to close --------------------------------------- */}
      <Box sx={SECTION_SX}>
        <Typography component="h2" sx={SECTION_TITLE_SX}>
          {t('reports.flow.sections.leadTime')}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
          {leadTiles.map((tile) => (
            <Box key={tile.key} sx={TILE_SX}>
              <Typography sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.tertiary' }}>{tile.label}</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 500, color: 'kanap.text.primary' }}>
                {tile.lead.medianDays == null
                  ? t('reports.flow.tiles.noValue')
                  : t('reports.flow.tiles.days', { count: tile.lead.medianDays })}
              </Typography>
              {tile.lead.closedCount === 0 || !data ? (
                <Typography sx={{ fontSize: 12, fontWeight: 400, color: 'kanap.text.tertiary' }}>
                  {t('reports.flow.tiles.noClosing')}
                </Typography>
              ) : (
                <Typography
                  component={RouterLink}
                  to={weeklyPath(data.startDate, data.endDate)}
                  sx={{ ...LINK_SX, fontSize: 12, fontWeight: 400, color: 'kanap.text.secondary', display: 'inline-block' }}
                >
                  {t('reports.flow.tiles.closedOver', { count: tile.lead.closedCount })}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>

        {(data?.leadTime.tasksByType ?? []).length === 0 ? (
          <Typography sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary' }}>
            {t('reports.flow.empty.leadTimeByType')}
          </Typography>
        ) : (
          <Box component={AgGridBox} sx={{ width: '100%' }}>
            <AgGridReact<LeadTimeByType>
              rowData={data?.leadTime.tasksByType ?? []}
              columnDefs={leadColumns}
              defaultColDef={{ sortable: false, resizable: true, suppressMenu: true }}
              suppressCellFocus
              domLayout="autoHeight"
              getRowId={(params) => params.data.taskTypeId ?? 'none'}
            />
          </Box>
        )}
      </Box>
    </ReportLayout>
  );
}
