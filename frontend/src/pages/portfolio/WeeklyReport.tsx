import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, ValueGetterParams } from 'ag-grid-community';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ReportLayout, {
  ReportFilter,
  reportFilterMenuProps,
  reportFilterSelectSx,
} from '../../components/reports/ReportLayout';
import AgGridBox from '../../components/AgGridBox';
import DateEUField from '../../components/fields/DateEUField';
import { drawerDatePickerSx, drawerMenuItemSx } from '../../theme/formSx';
import api from '../../api';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../../i18n/useLocale';
import { formatShortDate } from '../../lib/dateFormat';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import {
  PROJECT_STATUS_COLORS,
  REQUEST_STATUS_COLORS,
  TASK_STATUS_COLORS,
  getDotColor,
} from '../../utils/statusColors';
import {
  getWeeklyFieldLabels,
  type WeeklyReportEntity,
} from './components/WeeklyReportChangeLabels';

type WeeklyChangeSummary = {
  statusFrom: string | null;
  statusTo: string | null;
  changedFields: string[];
};

type WeeklyProjectOrigin = {
  ref: string;
  name: string;
  itemPath: string;
};

type WeeklyRowCommon = {
  ref: string;
  itemPath: string;
  name: string;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  streamId: string | null;
  streamName: string | null;
  status: string;
  createdAt: string | null;
  eventAt: string | null;
  changes: WeeklyChangeSummary | null;
};

type WeeklyProjectRow = WeeklyRowCommon & {
  projectId: string;
  priority: number | null;
  progress: number | null;
  origin: WeeklyProjectOrigin | null;
  originValue: string | null;
};

type WeeklyTaskRow = WeeklyRowCommon & {
  taskId: string;
  taskTypeId: string | null;
  taskTypeName: string | null;
  priority: number | null;
};

type WeeklyRequestRow = WeeklyRowCommon & {
  requestId: string;
};

type WeeklyLists<TRow> = {
  created: TRow[];
  modified: TRow[];
  closed: TRow[];
};

type WeeklyListKey = 'created' | 'modified' | 'closed';

type WeeklyReportResponse = {
  requests: WeeklyLists<WeeklyRequestRow>;
  projects: WeeklyLists<WeeklyProjectRow>;
  tasks: WeeklyLists<WeeklyTaskRow>;
};

type FilterValuesResponse = {
  sources: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  streams: Array<{ id: string; name: string; categoryId: string | null }>;
  taskTypes: Array<{ id: string; name: string }>;
};

const LIST_KEYS: WeeklyListKey[] = ['created', 'modified', 'closed'];

type WeeklySectionKey = 'requests' | 'projects' | 'tasks';

const collapsedStorageKey = (section: WeeklySectionKey) =>
  `kanap.portfolioReports.weekly.collapsed.${section}`;

const readCollapsed = (section: WeeklySectionKey): boolean => {
  try {
    return window.localStorage.getItem(collapsedStorageKey(section)) === '1';
  } catch {
    return false;
  }
};

const writeCollapsed = (section: WeeklySectionKey, collapsed: boolean) => {
  try {
    window.localStorage.setItem(collapsedStorageKey(section), collapsed ? '1' : '0');
  } catch {
    /* private mode or blocked storage: the group simply stays open on the next visit. */
  }
};

const EMPTY_REQUESTS: WeeklyLists<WeeklyRequestRow> = { created: [], modified: [], closed: [] };
const EMPTY_PROJECTS: WeeklyLists<WeeklyProjectRow> = { created: [], modified: [], closed: [] };
const EMPTY_TASKS: WeeklyLists<WeeklyTaskRow> = { created: [], modified: [], closed: [] };

const TASK_STATUSES = new Set(['open', 'in_progress', 'pending', 'in_testing', 'done', 'cancelled']);
const PROJECT_STATUSES = new Set(['waiting_list', 'planned', 'in_progress', 'in_testing', 'on_hold', 'done', 'cancelled']);
const REQUEST_STATUSES = new Set(['pending_review', 'candidate', 'approved', 'on_hold', 'rejected', 'converted']);

/** Charter card: 8px radius, hairline border, no shadow. */
const SECTION_SX = {
  border: '1px solid',
  borderColor: 'kanap.border.default',
  borderRadius: '8px',
  bgcolor: 'kanap.bg.primary',
  p: 2,
} as const;

const SECTION_TITLE_SX = {
  fontSize: 16,
  fontWeight: 500,
  color: 'kanap.text.primary',
  mb: 1.5,
} as const;

/**
 * AG Grid reserves 150px for an auto-height grid so its "no rows" overlay fits. The report
 * never shows an empty grid, so that floor only adds dead space under short lists.
 */
const AUTO_HEIGHT_GRID_SX = {
  width: '100%',
  '& .ag-layout-auto-height .ag-center-cols-viewport': { minHeight: 'unset' },
} as const;

const MONO_CELL_STYLE = {
  fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
  fontSize: '12px',
  color: 'var(--kanap-text-secondary)',
  fontVariantNumeric: 'tabular-nums',
} as const;

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultStartDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return toIsoDate(date);
};

const humanize = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const parseFilename = (contentDisposition: string | undefined, fallback: string): string => {
  if (!contentDisposition) return fallback;
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }

  const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (asciiMatch?.[1]) return asciiMatch[1];
  return fallback;
};

const buildParams = (args: {
  startDate: string;
  endDate: string;
  sourceIds?: string[];
  categoryIds?: string[];
  streamIds?: string[];
  taskTypeIds?: string[];
}) => {
  const params: Record<string, string> = {
    startDate: args.startDate,
    endDate: args.endDate,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  if (args.sourceIds && args.sourceIds.length > 0) params.sourceIds = args.sourceIds.join(',');
  if (args.categoryIds && args.categoryIds.length > 0) params.categoryIds = args.categoryIds.join(',');
  if (args.streamIds && args.streamIds.length > 0) params.streamIds = args.streamIds.join(',');
  if (args.taskTypeIds && args.taskTypeIds.length > 0) params.taskTypeIds = args.taskTypeIds.join(',');

  return params;
};

type SubSectionProps<TRow> = {
  heading: string;
  emptyLabel: string;
  rows: TRow[];
  columns: ColDef<TRow>[];
};

/** One list inside a section: a counted sub-heading, then a grid or a single line. */
function WeeklyReportSubSection<TRow extends { ref: string }>({
  heading,
  emptyLabel,
  rows,
  columns,
}: SubSectionProps<TRow>) {
  return (
    <Box>
      <Typography
        component="div"
        sx={{ fontSize: 12, fontWeight: 500, color: 'kanap.text.secondary', mb: 0.75 }}
      >
        {heading}
      </Typography>
      {rows.length === 0 ? (
        <Typography component="div" sx={{ fontSize: 13, fontWeight: 400, color: 'kanap.text.secondary' }}>
          {emptyLabel}
        </Typography>
      ) : (
        <Box component={AgGridBox} sx={AUTO_HEIGHT_GRID_SX}>
          <AgGridReact<TRow>
            rowData={rows}
            columnDefs={columns}
            defaultColDef={{ sortable: true, resizable: true, suppressMenu: true }}
            animateRows
            suppressCellFocus
            domLayout="autoHeight"
            getRowId={(params) => params.data.ref}
          />
        </Box>
      )}
    </Box>
  );
}

type SectionProps = {
  title: string;
  counts: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

/**
 * One entity group: a title row that folds the group away, then its three lists. The
 * counts follow the title while the group is folded, so navigation stays informative.
 * Print keeps every group open: a folded group is a reading convenience, not a filter.
 */
function WeeklyReportSection({ title, counts, collapsed, onToggle, children }: SectionProps) {
  const contentId = useId();

  return (
    <Box sx={SECTION_SX}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        onClick={onToggle}
        sx={{ cursor: 'pointer', userSelect: 'none', mb: collapsed ? 0 : 1.5 }}
      >
        <Typography component="h2" sx={{ ...SECTION_TITLE_SX, mb: 0 }}>
          <Box
            component="button"
            type="button"
            aria-expanded={!collapsed}
            aria-controls={contentId}
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              onToggle();
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              p: 0,
              border: 0,
              bgcolor: 'transparent',
              color: 'inherit',
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            <ExpandMoreIcon
              sx={{
                fontSize: 18,
                color: 'kanap.text.secondary',
                transform: collapsed ? 'rotate(-90deg)' : 'none',
                transition: 'transform 160ms ease',
              }}
            />
            {title}
          </Box>
        </Typography>
        {collapsed && (
          <Typography sx={{ fontSize: 12, fontWeight: 400, color: 'kanap.text.secondary' }}>
            {counts}
          </Typography>
        )}
      </Stack>
      <Collapse
        in={!collapsed}
        timeout={160}
        id={contentId}
        sx={{
          '@media print': {
            height: 'auto !important',
            overflow: 'visible !important',
            visibility: 'visible !important',
          },
        }}
      >
        <Stack spacing={1.5}>{children}</Stack>
      </Collapse>
    </Box>
  );
}

export default function WeeklyReport() {
  const navigate = useNavigate();
  const { t } = useTranslation(['portfolio', 'errors']);
  const locale = useLocale();
  const theme = useTheme();
  const mode = theme.palette.mode;
  const today = useMemo(() => toIsoDate(new Date()), []);

  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(today);

  const [sourceAll, setSourceAll] = useState(true);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [categoryAll, setCategoryAll] = useState(true);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [streamAll, setStreamAll] = useState(true);
  const [streamIds, setStreamIds] = useState<string[]>([]);
  const [taskTypeAll, setTaskTypeAll] = useState(true);
  const [taskTypeIds, setTaskTypeIds] = useState<string[]>([]);

  const [collapsedSections, setCollapsedSections] = useState<Record<WeeklySectionKey, boolean>>(() => ({
    requests: readCollapsed('requests'),
    projects: readCollapsed('projects'),
    tasks: readCollapsed('tasks'),
  }));

  const toggleSection = useCallback((section: WeeklySectionKey) => {
    setCollapsedSections((previous) => {
      const next = !previous[section];
      writeCollapsed(section, next);
      return { ...previous, [section]: next };
    });
  }, []);

  const [exportError, setExportError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | null>(null);

  const isValidPeriod = Boolean(startDate && endDate && startDate <= endDate);

  const { data: filterValuesData } = useQuery<FilterValuesResponse>({
    queryKey: ['portfolio-weekly-report-filter-values'],
    queryFn: async () => {
      const res = await api.get('/portfolio/reports/weekly/filter-values');
      return res.data as FilterValuesResponse;
    },
  });

  const effectiveSourceIds = sourceAll ? [] : sourceIds;
  const effectiveCategoryIds = categoryAll ? [] : categoryIds;
  const effectiveStreamIds = streamAll ? [] : streamIds;
  const effectiveTaskTypeIds = taskTypeAll ? [] : taskTypeIds;

  const {
    data: reportData,
    isLoading,
    isFetching,
    error,
  } = useQuery<WeeklyReportResponse>({
    queryKey: [
      'portfolio-weekly-report',
      startDate,
      endDate,
      sourceAll,
      sourceIds,
      categoryAll,
      categoryIds,
      streamAll,
      streamIds,
      taskTypeAll,
      taskTypeIds,
    ],
    queryFn: async () => {
      const params = buildParams({
        startDate,
        endDate,
        sourceIds: effectiveSourceIds,
        categoryIds: effectiveCategoryIds,
        streamIds: effectiveStreamIds,
        taskTypeIds: effectiveTaskTypeIds,
      });
      const res = await api.get('/portfolio/reports/weekly', { params });
      return res.data as WeeklyReportResponse;
    },
    enabled: isValidPeriod,
    placeholderData: keepPreviousData,
  });

  const sourceBaseOptions = filterValuesData?.sources ?? [];
  const categoryBaseOptions = filterValuesData?.categories ?? [];
  const streamBaseOptions = filterValuesData?.streams ?? [];
  const taskTypeBaseOptions = filterValuesData?.taskTypes ?? [];

  const requests = reportData?.requests ?? EMPTY_REQUESTS;
  const projects = reportData?.projects ?? EMPTY_PROJECTS;
  const tasks = reportData?.tasks ?? EMPTY_TASKS;

  const allRows = useMemo<WeeklyRowCommon[]>(
    () =>
      LIST_KEYS.flatMap((key) => [
        ...(requests[key] as WeeklyRowCommon[]),
        ...(projects[key] as WeeklyRowCommon[]),
        ...(tasks[key] as WeeklyRowCommon[]),
      ]),
    [requests, projects, tasks],
  );

  const totalRows = allRows.length;

  const getStatusLabel = useCallback((status: string) => {
    if (TASK_STATUSES.has(status)) {
      return t(`statuses.task.${status}`, { defaultValue: humanize(status) });
    }
    if (PROJECT_STATUSES.has(status)) {
      return t(`statuses.project.${status}`, { defaultValue: humanize(status) });
    }
    if (REQUEST_STATUSES.has(status)) {
      return t(`statuses.request.${status}`, { defaultValue: humanize(status) });
    }
    return humanize(status);
  }, [t]);

  const presentSourceIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of allRows) if (row.sourceId) ids.add(row.sourceId);
    return ids;
  }, [allRows]);

  const presentCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of allRows) if (row.categoryId) ids.add(row.categoryId);
    return ids;
  }, [allRows]);

  const presentStreamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of allRows) if (row.streamId) ids.add(row.streamId);
    return ids;
  }, [allRows]);

  const presentTaskTypeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const key of LIST_KEYS) {
      for (const row of tasks[key]) if (row.taskTypeId) ids.add(row.taskTypeId);
    }
    return ids;
  }, [tasks]);

  const sourceOptions = useMemo(() => {
    const selectedSet = new Set(sourceIds);
    if (sourceAll) {
      return sourceBaseOptions.filter((option) => presentSourceIds.has(option.id));
    }
    return sourceBaseOptions.filter((option) => presentSourceIds.has(option.id) || selectedSet.has(option.id));
  }, [sourceAll, sourceIds, sourceBaseOptions, presentSourceIds]);

  const categoryOptions = useMemo(() => {
    const selectedSet = new Set(categoryIds);
    if (categoryAll) {
      return categoryBaseOptions.filter((option) => presentCategoryIds.has(option.id));
    }
    return categoryBaseOptions.filter((option) => presentCategoryIds.has(option.id) || selectedSet.has(option.id));
  }, [categoryAll, categoryIds, categoryBaseOptions, presentCategoryIds]);

  const streamsByCategory = useMemo(() => {
    if (categoryAll) return streamBaseOptions;
    const selectedCategorySet = new Set(categoryIds);
    return streamBaseOptions.filter((stream) => {
      if (!stream.categoryId) return false;
      return selectedCategorySet.has(stream.categoryId);
    });
  }, [categoryAll, categoryIds, streamBaseOptions]);

  const streamOptions = useMemo(() => {
    const selectedSet = new Set(streamIds);
    if (streamAll) {
      return streamsByCategory.filter((option) => presentStreamIds.has(option.id));
    }
    return streamsByCategory.filter((option) => presentStreamIds.has(option.id) || selectedSet.has(option.id));
  }, [streamAll, streamIds, streamsByCategory, presentStreamIds]);

  const taskTypeOptions = useMemo(() => {
    const selectedSet = new Set(taskTypeIds);
    if (taskTypeAll) {
      return taskTypeBaseOptions.filter((option) => presentTaskTypeIds.has(option.id));
    }
    return taskTypeBaseOptions.filter((option) => presentTaskTypeIds.has(option.id) || selectedSet.has(option.id));
  }, [taskTypeAll, taskTypeIds, taskTypeBaseOptions, presentTaskTypeIds]);

  useEffect(() => {
    if (sourceAll) return;
    const allowed = new Set(sourceOptions.map((option) => option.id));
    const next = sourceIds.filter((id) => allowed.has(id));
    if (next.length === 0) {
      setSourceAll(true);
      setSourceIds([]);
      return;
    }
    if (next.length !== sourceIds.length) {
      setSourceIds(next);
    }
  }, [sourceAll, sourceIds, sourceOptions]);

  useEffect(() => {
    if (categoryAll) return;
    const allowed = new Set(categoryOptions.map((option) => option.id));
    const next = categoryIds.filter((id) => allowed.has(id));
    if (next.length === 0) {
      setCategoryAll(true);
      setCategoryIds([]);
      return;
    }
    if (next.length !== categoryIds.length) {
      setCategoryIds(next);
    }
  }, [categoryAll, categoryIds, categoryOptions]);

  useEffect(() => {
    if (streamAll) return;
    const allowed = new Set(streamOptions.map((option) => option.id));
    const next = streamIds.filter((id) => allowed.has(id));
    if (next.length === 0) {
      setStreamAll(true);
      setStreamIds([]);
      return;
    }
    if (next.length !== streamIds.length) {
      setStreamIds(next);
    }
  }, [streamAll, streamIds, streamOptions]);

  useEffect(() => {
    if (taskTypeAll) return;
    const allowed = new Set(taskTypeOptions.map((option) => option.id));
    const next = taskTypeIds.filter((id) => allowed.has(id));
    if (next.length === 0) {
      setTaskTypeAll(true);
      setTaskTypeIds([]);
      return;
    }
    if (next.length !== taskTypeIds.length) {
      setTaskTypeIds(next);
    }
  }, [taskTypeAll, taskTypeIds, taskTypeOptions]);

  /* -------------------------------------------------------------- */
  /*  Shared cell renderers and columns                             */
  /* -------------------------------------------------------------- */

  const NameCell = useCallback(
    (params: ICellRendererParams<WeeklyRowCommon, string>) => (
      <Box
        component="span"
        sx={{ cursor: 'pointer' }}
        onClick={() => {
          if (!params.data?.itemPath) return;
          navigate(params.data.itemPath);
        }}
      >
        {params.value ?? ''}
      </Box>
    ),
    [navigate],
  );

  const StatusCell = useCallback(
    (params: ICellRendererParams<WeeklyRowCommon, string>) => {
      const status = String(params.value || '');
      if (!status) return null;
      const colorKey =
        TASK_STATUS_COLORS[status] ?? PROJECT_STATUS_COLORS[status] ?? REQUEST_STATUS_COLORS[status];
      return (
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              flexShrink: 0,
              bgcolor: getDotColor(colorKey, mode),
            }}
          />
          <Box component="span" sx={{ color: getDotColor(colorKey, mode), fontWeight: 500 }}>
            {getStatusLabel(status)}
          </Box>
        </Box>
      );
    },
    [getStatusLabel, mode],
  );

  const refColumn = useCallback(
    <TRow extends WeeklyRowCommon>(): ColDef<TRow> => ({
      field: 'ref' as any,
      headerName: t('reports.weekly.columns.reference'),
      width: 100,
      cellStyle: MONO_CELL_STYLE as any,
    }),
    [t],
  );

  const nameColumn = useCallback(
    <TRow extends WeeklyRowCommon>(headerName: string): ColDef<TRow> => ({
      field: 'name' as any,
      headerName,
      flex: 1.4,
      minWidth: 220,
      cellRenderer: NameCell,
    }),
    [NameCell],
  );

  const statusColumn = useCallback(
    <TRow extends WeeklyRowCommon>(): ColDef<TRow> => ({
      field: 'status' as any,
      headerName: t('reports.weekly.columns.status'),
      width: 150,
      cellRenderer: StatusCell,
    }),
    [StatusCell, t],
  );

  const dateColumn = useCallback(
    <TRow extends WeeklyRowCommon>(listKey: WeeklyListKey): ColDef<TRow> => ({
      field: 'eventAt' as any,
      headerName: t(`reports.weekly.columns.date.${listKey}`),
      width: 130,
      valueFormatter: (params) => formatShortDate(params.value || null, locale),
    }),
    [locale, t],
  );

  /** Creation day of the item, shown next to the closing day in the closed lists. */
  const createdOnColumn = useCallback(
    <TRow extends WeeklyRowCommon>(): ColDef<TRow> => ({
      field: 'createdAt' as any,
      headerName: t('reports.weekly.columns.date.created'),
      width: 130,
      valueFormatter: (params) => formatShortDate(params.value || null, locale),
    }),
    [locale, t],
  );

  const priorityColumn = useCallback(
    <TRow extends WeeklyRowCommon & { priority: number | null }>(): ColDef<TRow> => ({
      field: 'priority' as any,
      headerName: t('reports.weekly.columns.priority'),
      width: 100,
      type: 'rightAligned',
      sort: 'desc',
      comparator: (a: number | null, b: number | null) => {
        const left = typeof a === 'number' ? a : Number.NEGATIVE_INFINITY;
        const right = typeof b === 'number' ? b : Number.NEGATIVE_INFINITY;
        return left - right;
      },
      valueFormatter: (params) => (params.value == null ? '' : String(Math.round(Number(params.value)))),
    }),
    [t],
  );

  const changesColumn = useCallback(
    <TRow extends WeeklyRowCommon>(entity: WeeklyReportEntity): ColDef<TRow> => ({
      colId: 'changes',
      headerName: t('reports.weekly.columns.changes'),
      flex: 1.2,
      minWidth: 220,
      valueGetter: (params: ValueGetterParams<TRow>) => {
        const changes = params.data?.changes;
        if (!changes) return '';
        const parts: string[] = [];
        if (changes.statusFrom && changes.statusTo) {
          parts.push(`${getStatusLabel(changes.statusFrom)} → ${getStatusLabel(changes.statusTo)}`);
        }
        parts.push(...getWeeklyFieldLabels(t, entity, changes.changedFields));
        return parts.join(', ');
      },
      tooltipValueGetter: (params) => String(params.value ?? ''),
    }),
    [getStatusLabel, t],
  );

  const classificationColumns = useCallback(
    <TRow extends WeeklyRowCommon>(): ColDef<TRow>[] => [
      { field: 'sourceName' as any, headerName: t('reports.weekly.columns.source'), width: 150 },
      { field: 'categoryName' as any, headerName: t('reports.weekly.columns.category'), width: 160 },
      { field: 'streamName' as any, headerName: t('reports.weekly.columns.stream'), width: 160 },
    ],
    [t],
  );

  /** The request a project was converted from, or the KANAP label of its own origin. */
  const originLabel = useCallback(
    (row?: WeeklyProjectRow | null): string => {
      if (!row) return '';
      if (row.origin) return `${row.origin.ref} ${row.origin.name}`.trim();
      if (!row.originValue) return '';
      return t(`origin.${row.originValue}`, { defaultValue: humanize(row.originValue) });
    },
    [t],
  );

  const OriginCell = useCallback(
    (params: ICellRendererParams<WeeklyProjectRow, unknown>) => {
      const origin = params.data?.origin ?? null;
      if (!origin) {
        return (
          <Box component="span" sx={{ color: 'kanap.text.tertiary' }}>
            {originLabel(params.data)}
          </Box>
        );
      }
      return (
        <Box
          component="span"
          sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={() => navigate(origin.itemPath)}
        >
          <Box component="span" sx={MONO_CELL_STYLE}>
            {origin.ref}
          </Box>
          <Box component="span">{origin.name}</Box>
        </Box>
      );
    },
    [navigate, originLabel],
  );

  /* -------------------------------------------------------------- */
  /*  Column sets                                                   */
  /* -------------------------------------------------------------- */

  const requestColumns = useMemo<Record<WeeklyListKey, ColDef<WeeklyRequestRow>[]>>(() => {
    const build = (listKey: WeeklyListKey): ColDef<WeeklyRequestRow>[] => [
      refColumn<WeeklyRequestRow>(),
      nameColumn<WeeklyRequestRow>(t('reports.weekly.columns.requestName')),
      ...classificationColumns<WeeklyRequestRow>(),
      statusColumn<WeeklyRequestRow>(),
      ...(listKey === 'closed' ? [createdOnColumn<WeeklyRequestRow>()] : []),
      dateColumn<WeeklyRequestRow>(listKey),
      ...(listKey === 'modified' ? [changesColumn<WeeklyRequestRow>('request')] : []),
    ];
    return { created: build('created'), modified: build('modified'), closed: build('closed') };
  }, [
    changesColumn,
    classificationColumns,
    createdOnColumn,
    dateColumn,
    nameColumn,
    refColumn,
    statusColumn,
    t,
  ]);

  const projectColumns = useMemo<Record<WeeklyListKey, ColDef<WeeklyProjectRow>[]>>(() => {
    const build = (listKey: WeeklyListKey): ColDef<WeeklyProjectRow>[] => [
      refColumn<WeeklyProjectRow>(),
      nameColumn<WeeklyProjectRow>(t('reports.weekly.columns.projectName')),
      ...(listKey === 'created'
        ? [{
            colId: 'origin',
            headerName: t('reports.weekly.columns.origin'),
            flex: 1,
            minWidth: 200,
            valueGetter: (params: ValueGetterParams<WeeklyProjectRow>) => originLabel(params.data),
            cellRenderer: OriginCell,
          } as ColDef<WeeklyProjectRow>]
        : []),
      priorityColumn<WeeklyProjectRow>(),
      ...classificationColumns<WeeklyProjectRow>(),
      {
        field: 'progress',
        headerName: t('reports.weekly.columns.progress'),
        width: 110,
        type: 'rightAligned',
        valueFormatter: (params) => (params.value == null ? '' : `${Math.round(Number(params.value))}%`),
      },
      statusColumn<WeeklyProjectRow>(),
      ...(listKey === 'closed' ? [createdOnColumn<WeeklyProjectRow>()] : []),
      dateColumn<WeeklyProjectRow>(listKey),
      ...(listKey === 'modified' ? [changesColumn<WeeklyProjectRow>('project')] : []),
    ];
    return { created: build('created'), modified: build('modified'), closed: build('closed') };
  }, [
    OriginCell,
    changesColumn,
    classificationColumns,
    createdOnColumn,
    dateColumn,
    originLabel,
    nameColumn,
    priorityColumn,
    refColumn,
    statusColumn,
    t,
  ]);

  const taskColumns = useMemo<Record<WeeklyListKey, ColDef<WeeklyTaskRow>[]>>(() => {
    const build = (listKey: WeeklyListKey): ColDef<WeeklyTaskRow>[] => [
      refColumn<WeeklyTaskRow>(),
      nameColumn<WeeklyTaskRow>(t('reports.weekly.columns.taskName')),
      {
        field: 'taskTypeName',
        headerName: t('reports.weekly.columns.taskType'),
        width: 150,
        valueFormatter: (params) => String(params.value || ''),
      },
      priorityColumn<WeeklyTaskRow>(),
      ...classificationColumns<WeeklyTaskRow>(),
      statusColumn<WeeklyTaskRow>(),
      ...(listKey === 'closed' ? [createdOnColumn<WeeklyTaskRow>()] : []),
      dateColumn<WeeklyTaskRow>(listKey),
      ...(listKey === 'modified' ? [changesColumn<WeeklyTaskRow>('task')] : []),
    ];
    return { created: build('created'), modified: build('modified'), closed: build('closed') };
  }, [
    changesColumn,
    classificationColumns,
    createdOnColumn,
    dateColumn,
    nameColumn,
    priorityColumn,
    refColumn,
    statusColumn,
    t,
  ]);

  const handleDownload = async (format: 'csv' | 'xlsx') => {
    if (!isValidPeriod) return;

    try {
      setExportError(null);
      setExportingFormat(format);

      const params = buildParams({
        startDate,
        endDate,
        sourceIds: effectiveSourceIds,
        categoryIds: effectiveCategoryIds,
        streamIds: effectiveStreamIds,
        taskTypeIds: effectiveTaskTypeIds,
      }) as Record<string, string>;
      params.format = format;

      const res = await api.get('/portfolio/reports/weekly/export', {
        params,
        responseType: 'blob',
      });

      const fallbackName = `weekly-report.${format}`;
      const filename = parseFilename(res.headers?.['content-disposition'], fallbackName);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportError(getApiErrorMessage(e, t, t('reports.weekly.messages.exportFailed')));
    } finally {
      setExportingFormat(null);
    }
  };

  const reportErrorMessage = error
    ? getApiErrorMessage(error, t, t('reports.weekly.messages.loadFailed'))
    : null;

  const countsFor = useCallback(
    (lists: WeeklyLists<unknown>) =>
      [
        t('reports.weekly.summary.created', { count: lists.created.length }),
        t('reports.weekly.summary.modified', { count: lists.modified.length }),
        t('reports.weekly.summary.closed', { count: lists.closed.length }),
      ].join(' · '),
    [t],
  );

  const summaryFor = useCallback(
    (entityLabel: string, lists: WeeklyLists<unknown>) => `${entityLabel} ${countsFor(lists)}`,
    [countsFor],
  );

  const subHeading = useCallback(
    (listKey: WeeklyListKey, count: number) => `${t(`reports.weekly.lists.${listKey}`)} (${count})`,
    [t],
  );

  return (
    <ReportLayout
      title={t('reports.weekly.title')}
      subtitle={t('reports.weekly.subtitle')}
      rootTo="/portfolio/reports"
      rootLabel={t('reports.title')}
      filters={(
        <>
          <DateEUField
            label={t('reports.weekly.filters.startDate')}
            valueYmd={startDate}
            onChangeYmd={setStartDate}
            sx={{ width: 160 }}
            textFieldSx={drawerDatePickerSx}
          />
          <DateEUField
            label={t('reports.weekly.filters.endDate')}
            valueYmd={endDate}
            onChangeYmd={setEndDate}
            sx={{ width: 160 }}
            textFieldSx={drawerDatePickerSx}
          />
          <ReportFilter label={t('reports.weekly.filters.source')}>
            <TextField
              select
              size="small"
              value={sourceAll ? sourceOptions.map((option) => option.id) : sourceIds}
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                MenuProps: reportFilterMenuProps,
                renderValue: () => {
                  if (sourceAll) return t('reports.weekly.filters.allSources');
                  return t('reports.weekly.filters.selectedCount', { count: sourceIds.length });
                },
              }}
              onChange={(e) => {
                const next = e.target.value as unknown as string[];
                const values = Array.isArray(next) ? next : [next];
                if (values.length === 0 || values.length === sourceOptions.length) {
                  setSourceAll(true);
                  setSourceIds([]);
                  return;
                }
                setSourceAll(false);
                setSourceIds(values);
              }}
              sx={reportFilterSelectSx}
            >
              {sourceOptions.map((option) => (
                <MenuItem key={option.id} value={option.id} sx={drawerMenuItemSx}>
                  <Checkbox size="small" checked={sourceAll || sourceIds.includes(option.id)} />
                  <ListItemText primary={option.name} primaryTypographyProps={{ fontSize: 13 }} />
                </MenuItem>
              ))}
            </TextField>
          </ReportFilter>
          <ReportFilter label={t('reports.weekly.filters.category')} width={230}>
            <TextField
              select
              size="small"
              value={categoryAll ? categoryOptions.map((option) => option.id) : categoryIds}
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                MenuProps: reportFilterMenuProps,
                renderValue: () => {
                  if (categoryAll) return t('reports.weekly.filters.allCategories');
                  return t('reports.weekly.filters.selectedCount', { count: categoryIds.length });
                },
              }}
              onChange={(e) => {
                const next = e.target.value as unknown as string[];
                const values = Array.isArray(next) ? next : [next];
                if (values.length === 0 || values.length === categoryOptions.length) {
                  setCategoryAll(true);
                  setCategoryIds([]);
                  return;
                }
                setCategoryAll(false);
                setCategoryIds(values);
              }}
              sx={reportFilterSelectSx}
            >
              {categoryOptions.map((option) => (
                <MenuItem key={option.id} value={option.id} sx={drawerMenuItemSx}>
                  <Checkbox size="small" checked={categoryAll || categoryIds.includes(option.id)} />
                  <ListItemText primary={option.name} primaryTypographyProps={{ fontSize: 13 }} />
                </MenuItem>
              ))}
            </TextField>
          </ReportFilter>
          <ReportFilter label={t('reports.weekly.filters.stream')}>
            <TextField
              select
              size="small"
              value={streamAll ? streamOptions.map((option) => option.id) : streamIds}
              disabled={streamOptions.length === 0}
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                MenuProps: reportFilterMenuProps,
                renderValue: () => {
                  if (streamAll) return t('reports.weekly.filters.allStreams');
                  return t('reports.weekly.filters.selectedCount', { count: streamIds.length });
                },
              }}
              onChange={(e) => {
                const next = e.target.value as unknown as string[];
                const values = Array.isArray(next) ? next : [next];
                if (values.length === 0 || values.length === streamOptions.length) {
                  setStreamAll(true);
                  setStreamIds([]);
                  return;
                }
                setStreamAll(false);
                setStreamIds(values);
              }}
              sx={reportFilterSelectSx}
            >
              {streamOptions.map((option) => (
                <MenuItem key={option.id} value={option.id} sx={drawerMenuItemSx}>
                  <Checkbox size="small" checked={streamAll || streamIds.includes(option.id)} />
                  <ListItemText primary={option.name} primaryTypographyProps={{ fontSize: 13 }} />
                </MenuItem>
              ))}
            </TextField>
          </ReportFilter>
          <ReportFilter label={t('reports.weekly.filters.taskTypes')} width={240}>
            <TextField
              select
              size="small"
              value={taskTypeAll ? taskTypeOptions.map((option) => option.id) : taskTypeIds}
              SelectProps={{
                multiple: true,
                displayEmpty: true,
                MenuProps: reportFilterMenuProps,
                renderValue: () => {
                  if (taskTypeAll) return t('reports.weekly.filters.allTaskTypes');
                  return t('reports.weekly.filters.selectedCount', { count: taskTypeIds.length });
                },
              }}
              onChange={(e) => {
                const next = e.target.value as unknown as string[];
                const values = Array.isArray(next) ? next : [next];
                if (values.length === 0 || values.length === taskTypeOptions.length) {
                  setTaskTypeAll(true);
                  setTaskTypeIds([]);
                  return;
                }
                setTaskTypeAll(false);
                setTaskTypeIds(values);
              }}
              sx={reportFilterSelectSx}
            >
              {taskTypeOptions.map((option) => (
                <MenuItem key={option.id} value={option.id} sx={drawerMenuItemSx}>
                  <Checkbox size="small" checked={taskTypeAll || taskTypeIds.includes(option.id)} />
                  <ListItemText primary={option.name} primaryTypographyProps={{ fontSize: 13 }} />
                </MenuItem>
              ))}
            </TextField>
          </ReportFilter>
        </>
      )}
      actions={(
        <>
          <Button
            size="small"
            variant="action"
            onClick={() => handleDownload('csv')}
            disabled={!isValidPeriod || totalRows === 0 || exportingFormat !== null}
          >
            {exportingFormat === 'csv' ? t('reports.weekly.actions.exporting') : t('reports.weekly.actions.exportCsv')}
          </Button>
          <Button
            size="small"
            variant="action"
            onClick={() => handleDownload('xlsx')}
            disabled={!isValidPeriod || totalRows === 0 || exportingFormat !== null}
          >
            {exportingFormat === 'xlsx' ? t('reports.weekly.actions.exporting') : t('reports.weekly.actions.exportXlsx')}
          </Button>
        </>
      )}
    >
      <Stack spacing={1.5}>
        {!isValidPeriod && (
          <Alert severity="warning">{t('reports.weekly.messages.invalidPeriod')}</Alert>
        )}
        {reportErrorMessage && (
          <Alert severity="error">
            {reportErrorMessage}
          </Alert>
        )}
        {exportError && (
          <Alert severity="error">{exportError}</Alert>
        )}

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontSize: 12, fontWeight: 400, color: 'kanap.text.secondary' }}>
            {[
              summaryFor(t('reports.weekly.sections.requests'), requests),
              summaryFor(t('reports.weekly.sections.projects'), projects),
              summaryFor(t('reports.weekly.sections.tasks'), tasks),
            ].join('  |  ')}
          </Typography>
          {(isLoading || isFetching) && <CircularProgress size={14} />}
        </Stack>

        <WeeklyReportSection
          title={t('reports.weekly.sections.requests')}
          counts={countsFor(requests)}
          collapsed={collapsedSections.requests}
          onToggle={() => toggleSection('requests')}
        >
          {LIST_KEYS.map((listKey) => (
            <WeeklyReportSubSection<WeeklyRequestRow>
              key={listKey}
              heading={subHeading(listKey, requests[listKey].length)}
              emptyLabel={t(`reports.weekly.empty.requests.${listKey}`)}
              rows={requests[listKey]}
              columns={requestColumns[listKey]}
            />
          ))}
        </WeeklyReportSection>

        <WeeklyReportSection
          title={t('reports.weekly.sections.projects')}
          counts={countsFor(projects)}
          collapsed={collapsedSections.projects}
          onToggle={() => toggleSection('projects')}
        >
          {LIST_KEYS.map((listKey) => (
            <WeeklyReportSubSection<WeeklyProjectRow>
              key={listKey}
              heading={subHeading(listKey, projects[listKey].length)}
              emptyLabel={t(`reports.weekly.empty.projects.${listKey}`)}
              rows={projects[listKey]}
              columns={projectColumns[listKey]}
            />
          ))}
        </WeeklyReportSection>

        <WeeklyReportSection
          title={t('reports.weekly.sections.tasks')}
          counts={countsFor(tasks)}
          collapsed={collapsedSections.tasks}
          onToggle={() => toggleSection('tasks')}
        >
          {LIST_KEYS.map((listKey) => (
            <WeeklyReportSubSection<WeeklyTaskRow>
              key={listKey}
              heading={subHeading(listKey, tasks[listKey].length)}
              emptyLabel={t(`reports.weekly.empty.tasks.${listKey}`)}
              rows={tasks[listKey]}
              columns={taskColumns[listKey]}
            />
          ))}
        </WeeklyReportSection>
      </Stack>
    </ReportLayout>
  );
}
