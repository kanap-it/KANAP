import React, { useEffect, useMemo, useState } from 'react';
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

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
  pending_review: 'Pending Review',
  candidate: 'Candidate',
  approved: 'Approved',
  on_hold: 'On Hold',
  rejected: 'Rejected',
  converted: 'Converted',
  waiting_list: 'Waiting List',
  planned: 'Planned',
  in_testing: 'In Testing',
};

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
        sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
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
        headerName: 'Project Name',
        flex: 1.4,
        minWidth: 240,
        cellRenderer: ClickableNameCell,
      },
      {
        field: 'priority',
        headerName: 'Priority',
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
      { field: 'sourceName', headerName: 'Source', width: 160 },
      { field: 'categoryName', headerName: 'Category', width: 180 },
      { field: 'streamName', headerName: 'Stream', width: 180 },
      {
        field: 'progress',
        headerName: 'Progress',
        width: 120,
        type: 'rightAligned',
        valueFormatter: (params) => {
          if (params.value == null) return '';
          return `${Math.round(Number(params.value))}%`;
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        valueFormatter: (params) => STATUS_LABELS[String(params.value)] || humanize(String(params.value || '')),
      },
    ];
  }, [navigate]);

  const taskColumns = useMemo<ColDef<WeeklyTaskRow>[]>(() => {
    const ClickableNameCell: React.FC<ICellRendererParams<WeeklyTaskRow, string>> = (params) => (
      <Box
        component="span"
        sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
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
        headerName: 'Task Name',
        flex: 1.4,
        minWidth: 240,
        cellRenderer: ClickableNameCell,
      },
      {
        field: 'taskTypeName',
        headerName: 'Task Type',
        width: 170,
        valueFormatter: (params) => String(params.value || ''),
      },
      {
        field: 'priority',
        headerName: 'Priority',
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
      { field: 'sourceName', headerName: 'Source', width: 160 },
      { field: 'categoryName', headerName: 'Category', width: 180 },
      { field: 'streamName', headerName: 'Stream', width: 180 },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        valueFormatter: (params) => STATUS_LABELS[String(params.value)] || humanize(String(params.value || '')),
      },
    ];
  }, [navigate]);

  const requestColumns = useMemo<ColDef<WeeklyRequestRow>[]>(() => {
    const ClickableNameCell: React.FC<ICellRendererParams<WeeklyRequestRow, string>> = (params) => (
      <Box
        component="span"
        sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
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
        headerName: 'Request Name',
        flex: 1.4,
        minWidth: 240,
        cellRenderer: ClickableNameCell,
      },
      { field: 'sourceName', headerName: 'Source', width: 170 },
      { field: 'categoryName', headerName: 'Category', width: 180 },
      { field: 'streamName', headerName: 'Stream', width: 180 },
      {
        field: 'status',
        headerName: 'Status',
        width: 160,
        valueFormatter: (params) => STATUS_LABELS[String(params.value)] || humanize(String(params.value || '')),
      },
    ];
  }, [navigate]);

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
      setExportError(e?.response?.data?.message || e?.message || 'Export failed');
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <ReportLayout
      title="Weekly Report"
      subtitle="Weekly stakeholder summary across project updates, closed tasks, and request updates."
      rootTo="/portfolio/reports"
      rootLabel="Portfolio Reporting"
      filters={(
        <>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            size="small"
            label="Source"
            value={sourceAll ? sourceOptions.map((option) => option.id) : sourceIds}
            SelectProps={{
              multiple: true,
              renderValue: () => {
                if (sourceAll) return 'All sources';
                return `${sourceIds.length} selected`;
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
            label="Category"
            value={categoryAll ? categoryOptions.map((option) => option.id) : categoryIds}
            SelectProps={{
              multiple: true,
              renderValue: () => {
                if (categoryAll) return 'All categories';
                return `${categoryIds.length} selected`;
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
            label="Stream"
            value={streamAll ? streamOptions.map((option) => option.id) : streamIds}
            disabled={streamOptions.length === 0}
            SelectProps={{
              multiple: true,
              renderValue: () => {
                if (streamAll) return 'All streams';
                return `${streamIds.length} selected`;
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
            label="Task Types"
            value={taskTypeAll ? taskTypeOptions.map((option) => option.id) : taskTypeIds}
            SelectProps={{
              multiple: true,
              renderValue: () => {
                if (taskTypeAll) return 'All task types';
                return `${taskTypeIds.length} selected`;
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
            {exportingFormat === 'csv' ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleDownload('xlsx')}
            disabled={!isValidPeriod || totalRows === 0 || exportingFormat !== null}
          >
            {exportingFormat === 'xlsx' ? 'Exporting…' : 'Export XLSX'}
          </Button>
        </>
      )}
    >
      <Stack spacing={1.5}>
        {!isValidPeriod && (
          <Alert severity="warning">Start Date must be before or equal to End Date.</Alert>
        )}
        {error && (
          <Alert severity="error">
            {(error as any)?.response?.data?.message || (error as Error)?.message || 'Failed to load report data.'}
          </Alert>
        )}
        {exportError && (
          <Alert severity="error">{exportError}</Alert>
        )}

        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            {projects.length} project update{projects.length === 1 ? '' : 's'} · {tasks.length} closed task{tasks.length === 1 ? '' : 's'} · {requests.length} request update{requests.length === 1 ? '' : 's'}
          </Typography>
          {(isLoading || isFetching) && <CircularProgress size={18} />}
        </Stack>

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Project Updates</Typography>
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
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Closed Tasks</Typography>
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
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Request Updates</Typography>
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
