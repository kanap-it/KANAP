import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import ReportLayout from '../../components/reports/ReportLayout';
import AgGridBox from '../../components/AgGridBox';
import api from '../../api';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

type WeeklyProjectRow = {
  projectId: string;
  itemPath: string;
  name: string;
  priority: number | null;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  streamId: string | null;
  streamName: string | null;
  progress: number | null;
  status: string;
  lastChangedAt: string | null;
};

type WeeklyTaskRow = {
  taskId: string;
  itemPath: string;
  name: string;
  taskTypeId: string | null;
  taskTypeName: string | null;
  priority: number | null;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  streamId: string | null;
  streamName: string | null;
  status: string;
  lastChangedAt: string | null;
};

type WeeklyRequestRow = {
  requestId: string;
  itemPath: string;
  name: string;
  sourceId: string | null;
  sourceName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  streamId: string | null;
  streamName: string | null;
  status: string;
  lastChangedAt: string | null;
};

type WeeklyReportResponse = {
  projects: WeeklyProjectRow[];
  tasks: WeeklyTaskRow[];
  requests: WeeklyRequestRow[];
};

type FilterValuesResponse = {
  sources: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  streams: Array<{ id: string; name: string; categoryId: string | null }>;
  taskTypes: Array<{ id: string; name: string }>;
};

const TASK_STATUSES = new Set(['open', 'in_progress', 'pending', 'in_testing', 'done', 'cancelled']);
const PROJECT_STATUSES = new Set(['waiting_list', 'planned', 'in_progress', 'in_testing', 'on_hold', 'done', 'cancelled']);
const REQUEST_STATUSES = new Set(['pending_review', 'candidate', 'approved', 'on_hold', 'rejected', 'converted']);

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
  };

  if (args.sourceIds && args.sourceIds.length > 0) params.sourceIds = args.sourceIds.join(',');
  if (args.categoryIds && args.categoryIds.length > 0) params.categoryIds = args.categoryIds.join(',');
  if (args.streamIds && args.streamIds.length > 0) params.streamIds = args.streamIds.join(',');
  if (args.taskTypeIds && args.taskTypeIds.length > 0) params.taskTypeIds = args.taskTypeIds.join(',');

  return params;
};

export default function WeeklyReport() {
  const navigate = useNavigate();
  const { t } = useTranslation(['portfolio', 'errors']);
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

  const projects = reportData?.projects ?? [];
  const tasks = reportData?.tasks ?? [];
  const requests = reportData?.requests ?? [];
  const totalRows = projects.length + tasks.length + requests.length;

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
    for (const row of projects) if (row.sourceId) ids.add(row.sourceId);
    for (const row of tasks) if (row.sourceId) ids.add(row.sourceId);
    for (const row of requests) if (row.sourceId) ids.add(row.sourceId);
    return ids;
  }, [projects, tasks, requests]);

  const presentCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of projects) if (row.categoryId) ids.add(row.categoryId);
    for (const row of tasks) if (row.categoryId) ids.add(row.categoryId);
    for (const row of requests) if (row.categoryId) ids.add(row.categoryId);
    return ids;
  }, [projects, tasks, requests]);

  const presentStreamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of projects) if (row.streamId) ids.add(row.streamId);
    for (const row of tasks) if (row.streamId) ids.add(row.streamId);
    for (const row of requests) if (row.streamId) ids.add(row.streamId);
    return ids;
  }, [projects, tasks, requests]);

  const presentTaskTypeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of tasks) if (row.taskTypeId) ids.add(row.taskTypeId);
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

  const projectColumns = useMemo<ColDef<WeeklyProjectRow>[]>(() => {
    const ClickableNameCell: React.FC<ICellRendererParams<WeeklyProjectRow, string>> = (params) => (
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
    );

    return [
      {
        field: 'name',
        headerName: t('reports.weekly.columns.projectName'),
        flex: 1.4,
        minWidth: 240,
        cellRenderer: ClickableNameCell,
      },
      {
        field: 'priority',
        headerName: t('reports.weekly.columns.priority'),
        width: 110,
        type: 'rightAligned',
        sort: 'desc',
        comparator: (a: number | null, b: number | null) => {
          const left = typeof a === 'number' ? a : Number.NEGATIVE_INFINITY;
          const right = typeof b === 'number' ? b : Number.NEGATIVE_INFINITY;
          return left - right;
        },
        valueFormatter: (params) => (params.value == null ? '' : String(Math.round(Number(params.value)))),
      },
      { field: 'sourceName', headerName: t('reports.weekly.columns.source'), width: 160 },
      { field: 'categoryName', headerName: t('reports.weekly.columns.category'), width: 180 },
      { field: 'streamName', headerName: t('reports.weekly.columns.stream'), width: 180 },
      {
        field: 'progress',
        headerName: t('reports.weekly.columns.progress'),
        width: 120,
        type: 'rightAligned',
        valueFormatter: (params) => {
          if (params.value == null) return '';
          return `${Math.round(Number(params.value))}%`;
        },
      },
      {
        field: 'status',
        headerName: t('reports.weekly.columns.status'),
        width: 150,
        valueFormatter: (params) => getStatusLabel(String(params.value || '')),
      },
    ];
  }, [getStatusLabel, navigate, t]);

  const taskColumns = useMemo<ColDef<WeeklyTaskRow>[]>(() => {
    const ClickableNameCell: React.FC<ICellRendererParams<WeeklyTaskRow, string>> = (params) => (
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
    );

    return [
      {
        field: 'name',
        headerName: t('reports.weekly.columns.taskName'),
        flex: 1.4,
        minWidth: 240,
        cellRenderer: ClickableNameCell,
      },
      {
        field: 'taskTypeName',
        headerName: t('reports.weekly.columns.taskType'),
        width: 170,
        valueFormatter: (params) => String(params.value || ''),
      },
      {
        field: 'priority',
        headerName: t('reports.weekly.columns.priority'),
        width: 110,
        type: 'rightAligned',
        sort: 'desc',
        comparator: (a: number | null, b: number | null) => {
          const left = typeof a === 'number' ? a : Number.NEGATIVE_INFINITY;
          const right = typeof b === 'number' ? b : Number.NEGATIVE_INFINITY;
          return left - right;
        },
        valueFormatter: (params) => (params.value == null ? '' : String(Math.round(Number(params.value)))),
      },
      { field: 'sourceName', headerName: t('reports.weekly.columns.source'), width: 160 },
      { field: 'categoryName', headerName: t('reports.weekly.columns.category'), width: 180 },
      { field: 'streamName', headerName: t('reports.weekly.columns.stream'), width: 180 },
      {
        field: 'status',
        headerName: t('reports.weekly.columns.status'),
        width: 150,
        valueFormatter: (params) => getStatusLabel(String(params.value || '')),
      },
    ];
  }, [getStatusLabel, navigate, t]);

  const requestColumns = useMemo<ColDef<WeeklyRequestRow>[]>(() => {
    const ClickableNameCell: React.FC<ICellRendererParams<WeeklyRequestRow, string>> = (params) => (
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
    );

    return [
      {
        field: 'name',
        headerName: t('reports.weekly.columns.requestName'),
        flex: 1.4,
        minWidth: 240,
        cellRenderer: ClickableNameCell,
      },
      { field: 'sourceName', headerName: t('reports.weekly.columns.source'), width: 170 },
      { field: 'categoryName', headerName: t('reports.weekly.columns.category'), width: 180 },
      { field: 'streamName', headerName: t('reports.weekly.columns.stream'), width: 180 },
      {
        field: 'status',
        headerName: t('reports.weekly.columns.status'),
        width: 160,
        valueFormatter: (params) => getStatusLabel(String(params.value || '')),
      },
    ];
  }, [getStatusLabel, navigate, t]);

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

  return (
    <ReportLayout
      title={t('reports.weekly.title')}
      subtitle={t('reports.weekly.subtitle')}
      rootTo="/portfolio/reports"
      rootLabel={t('reports.title')}
      filters={(
        <>
          <TextField
            label={t('reports.weekly.filters.startDate')}
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('reports.weekly.filters.endDate')}
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            size="small"
            label={t('reports.weekly.filters.source')}
            value={sourceAll ? sourceOptions.map((option) => option.id) : sourceIds}
            SelectProps={{
              multiple: true,
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
            sx={{ minWidth: 220 }}
          >
            {sourceOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                <Checkbox checked={sourceAll || sourceIds.includes(option.id)} />
                <ListItemText primary={option.name} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('reports.weekly.filters.category')}
            value={categoryAll ? categoryOptions.map((option) => option.id) : categoryIds}
            SelectProps={{
              multiple: true,
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
            sx={{ minWidth: 230 }}
          >
            {categoryOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                <Checkbox checked={categoryAll || categoryIds.includes(option.id)} />
                <ListItemText primary={option.name} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('reports.weekly.filters.stream')}
            value={streamAll ? streamOptions.map((option) => option.id) : streamIds}
            disabled={streamOptions.length === 0}
            SelectProps={{
              multiple: true,
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
            sx={{ minWidth: 220 }}
          >
            {streamOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                <Checkbox checked={streamAll || streamIds.includes(option.id)} />
                <ListItemText primary={option.name} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('reports.weekly.filters.taskTypes')}
            value={taskTypeAll ? taskTypeOptions.map((option) => option.id) : taskTypeIds}
            SelectProps={{
              multiple: true,
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
            sx={{ minWidth: 240 }}
          >
            {taskTypeOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                <Checkbox checked={taskTypeAll || taskTypeIds.includes(option.id)} />
                <ListItemText primary={option.name} />
              </MenuItem>
            ))}
          </TextField>
        </>
      )}
      actions={(
        <>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleDownload('csv')}
            disabled={!isValidPeriod || totalRows === 0 || exportingFormat !== null}
          >
            {exportingFormat === 'csv' ? t('reports.weekly.actions.exporting') : t('reports.weekly.actions.exportCsv')}
          </Button>
          <Button
            size="small"
            variant="outlined"
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
          <Typography variant="body2" color="text.secondary">
            {t('reports.weekly.summary.projectUpdates', { count: projects.length })} · {t('reports.weekly.summary.closedTasks', { count: tasks.length })} · {t('reports.weekly.summary.requestUpdates', { count: requests.length })}
          </Typography>
          {(isLoading || isFetching) && <CircularProgress size={18} />}
        </Stack>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{t('reports.weekly.sections.projectUpdates')}</Typography>
          <Box component={AgGridBox} sx={{ width: '100%' }}>
            <AgGridReact<WeeklyProjectRow>
              rowData={projects}
              columnDefs={projectColumns}
              defaultColDef={{
                sortable: true,
                resizable: true,
                suppressMenu: true,
              }}
              animateRows
              suppressCellFocus
              rowSelection="single"
              domLayout="autoHeight"
              getRowId={(params) => params.data.projectId}
            />
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{t('reports.weekly.sections.closedTasks')}</Typography>
          <Box component={AgGridBox} sx={{ width: '100%' }}>
            <AgGridReact<WeeklyTaskRow>
              rowData={tasks}
              columnDefs={taskColumns}
              defaultColDef={{
                sortable: true,
                resizable: true,
                suppressMenu: true,
              }}
              animateRows
              suppressCellFocus
              rowSelection="single"
              domLayout="autoHeight"
              getRowId={(params) => params.data.taskId}
            />
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>{t('reports.weekly.sections.requestUpdates')}</Typography>
          <Box component={AgGridBox} sx={{ width: '100%' }}>
            <AgGridReact<WeeklyRequestRow>
              rowData={requests}
              columnDefs={requestColumns}
              defaultColDef={{
                sortable: true,
                resizable: true,
                suppressMenu: true,
              }}
              animateRows
              suppressCellFocus
              rowSelection="single"
              domLayout="autoHeight"
              getRowId={(params) => params.data.requestId}
            />
          </Box>
        </Paper>
      </Stack>
    </ReportLayout>
  );
}
