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

type StatusChangeItemType = 'task' | 'request' | 'project';

type StatusChangeRow = {
  itemType: StatusChangeItemType;
  itemId: string;
  itemPath: string;
  name: string;
  priority: number | null;
  status: string;
  sourceName: string | null;
  categoryName: string | null;
  streamName: string | null;
  companyName: string | null;
  lastChangedAt: string | null;
};

type FilterValuesResponse = {
  statuses: string[];
  itemTypes: StatusChangeItemType[];
  sources: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  streams: Array<{ id: string; name: string; categoryId: string | null }>;
};

type ItemTypeOption = {
  value: StatusChangeItemType;
  label: string;
};

const ITEM_TYPE_OPTIONS: ItemTypeOption[] = [
  { value: 'task', label: 'Tasks' },
  { value: 'request', label: 'Requests' },
  { value: 'project', label: 'Projects' },
];

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

const ITEM_TYPE_LABELS: Record<StatusChangeItemType, string> = {
  task: 'Task',
  request: 'Request',
  project: 'Project',
};

const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultStartDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return toIsoDate(date);
};

const humanize = (value: string): string =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const formatDate = (value: string | null): string => {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return String(value);
  return `${day}-${month}-${year.slice(-2)}`;
};

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
  statuses?: string[];
  itemTypes?: StatusChangeItemType[];
  sourceIds?: string[];
  categoryIds?: string[];
  streamIds?: string[];
}) => {
  const params: Record<string, string> = {
    startDate: args.startDate,
    endDate: args.endDate,
  };

  if (args.statuses && args.statuses.length > 0) params.statuses = args.statuses.join(',');
  if (args.itemTypes && args.itemTypes.length > 0) params.itemTypes = args.itemTypes.join(',');
  if (args.sourceIds && args.sourceIds.length > 0) params.sourceIds = args.sourceIds.join(',');
  if (args.categoryIds && args.categoryIds.length > 0) params.categoryIds = args.categoryIds.join(',');
  if (args.streamIds && args.streamIds.length > 0) params.streamIds = args.streamIds.join(',');
  return params;
};

export default function StatusChangeReport() {
  const navigate = useNavigate();
  const today = useMemo(() => toIsoDate(new Date()), []);

  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(today);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [itemTypes, setItemTypes] = useState<StatusChangeItemType[]>(['task', 'request', 'project']);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [streamIds, setStreamIds] = useState<string[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | null>(null);

  const isValidPeriod = Boolean(startDate && endDate && startDate <= endDate);

  const { data: filterValuesData } = useQuery<FilterValuesResponse>({
    queryKey: ['portfolio-status-change-filter-values', startDate, endDate, itemTypes],
    queryFn: async () => {
      const params = buildParams({ startDate, endDate, itemTypes });
      const res = await api.get('/portfolio/reports/status-change/filter-values', { params });
      return res.data as FilterValuesResponse;
    },
    enabled: isValidPeriod,
    placeholderData: keepPreviousData,
  });

  const {
    data: rowsData,
    isLoading,
    isFetching,
    error,
  } = useQuery<{ items: StatusChangeRow[] }>({
    queryKey: [
      'portfolio-status-change-report',
      startDate,
      endDate,
      statuses,
      itemTypes,
      sourceIds,
      categoryIds,
      streamIds,
    ],
    queryFn: async () => {
      const params = buildParams({
        startDate,
        endDate,
        statuses,
        itemTypes,
        sourceIds,
        categoryIds,
        streamIds,
      });
      const res = await api.get('/portfolio/reports/status-change', { params });
      return res.data as { items: StatusChangeRow[] };
    },
    enabled: isValidPeriod,
    placeholderData: keepPreviousData,
  });

  const rows = rowsData?.items ?? [];
  const statusOptions = filterValuesData?.statuses ?? [];
  const sourceOptions = filterValuesData?.sources ?? [];
  const categoryOptions = filterValuesData?.categories ?? [];
  const streamOptions = filterValuesData?.streams ?? [];

  const scopedStreamOptions = useMemo(() => {
    if (categoryIds.length === 0) return [];
    const allowedCategories = new Set(categoryIds);
    return streamOptions.filter((stream) => {
      if (!stream.categoryId) return false;
      return allowedCategories.has(stream.categoryId);
    });
  }, [categoryIds, streamOptions]);

  useEffect(() => {
    if (categoryIds.length === 0) {
      setStreamIds((prev) => (prev.length > 0 ? [] : prev));
      return;
    }
    const allowed = new Set(scopedStreamOptions.map((stream) => stream.id));
    setStreamIds((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [categoryIds, scopedStreamOptions]);

  const sourceOptionById = useMemo(() => new Map(sourceOptions.map((option) => [option.id, option])), [sourceOptions]);
  const categoryOptionById = useMemo(() => new Map(categoryOptions.map((option) => [option.id, option])), [categoryOptions]);
  const streamOptionById = useMemo(() => new Map(scopedStreamOptions.map((option) => [option.id, option])), [scopedStreamOptions]);

  const itemTypeOptionByValue = useMemo(
    () => new Map(ITEM_TYPE_OPTIONS.map((option) => [option.value, option])),
    [],
  );

  const columns = useMemo<ColDef<StatusChangeRow>[]>(() => {
    const ClickableNameCell: React.FC<ICellRendererParams<StatusChangeRow, string>> = (params) => (
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
        headerName: 'Name',
        flex: 1.4,
        minWidth: 220,
        cellRenderer: ClickableNameCell,
      },
      {
        field: 'itemType',
        headerName: 'Item Type',
        width: 130,
        valueFormatter: (params) => {
          const value = params.value as StatusChangeItemType;
          return ITEM_TYPE_LABELS[value] || String(value || '');
        },
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
        valueFormatter: (params) => (params.value == null ? '' : String(Math.round(params.value))),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        valueFormatter: (params) => STATUS_LABELS[String(params.value)] || humanize(String(params.value || '')),
      },
      { field: 'sourceName', headerName: 'Source', width: 150 },
      { field: 'categoryName', headerName: 'Category', width: 170 },
      { field: 'streamName', headerName: 'Stream', width: 170 },
      { field: 'companyName', headerName: 'Company', width: 170 },
      {
        field: 'lastChangedAt',
        headerName: 'Last Changed',
        width: 130,
        valueFormatter: (params) => formatDate(params.value || null),
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
        statuses,
        itemTypes,
        sourceIds,
        categoryIds,
        streamIds,
      }) as Record<string, string>;
      params.format = format;

      const res = await api.get('/portfolio/reports/status-change/export', {
        params,
        responseType: 'blob',
      });

      const fallbackName = `status-change-report.${format}`;
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
      title="Status Change Report"
      subtitle="Items whose status changed during a selected period (latest status change per item in period)."
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
            label="Status"
            value={statuses}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as string[];
                if (values.length === 0) return 'All statuses';
                return values.map((status) => STATUS_LABELS[status] || humanize(status)).join(', ');
              },
            }}
            onChange={(e) => {
              const next = e.target.value as unknown as string[];
              setStatuses(Array.isArray(next) ? next : [next]);
            }}
            sx={{ minWidth: 220 }}
          >
            {statusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                <Checkbox checked={statuses.includes(status)} />
                <ListItemText primary={STATUS_LABELS[status] || humanize(status)} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Item Type"
            value={itemTypes}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as StatusChangeItemType[];
                if (values.length === 0) return 'All item types';
                return values
                  .map((value) => itemTypeOptionByValue.get(value)?.label || value)
                  .join(', ');
              },
            }}
            onChange={(e) => {
              const next = e.target.value as unknown as StatusChangeItemType[];
              setItemTypes(Array.isArray(next) ? next : [next]);
            }}
            sx={{ minWidth: 220 }}
          >
            {ITEM_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={itemTypes.includes(option.value)} />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Source"
            value={sourceIds}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as string[];
                if (values.length === 0) return 'All sources';
                return values
                  .map((id) => sourceOptionById.get(id)?.name || id)
                  .join(', ');
              },
            }}
            onChange={(e) => {
              const next = e.target.value as unknown as string[];
              setSourceIds(Array.isArray(next) ? next : [next]);
            }}
            sx={{ minWidth: 220 }}
          >
            {sourceOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                <Checkbox checked={sourceIds.includes(option.id)} />
                <ListItemText primary={option.name} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Category"
            value={categoryIds}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as string[];
                if (values.length === 0) return 'All categories';
                return values
                  .map((id) => categoryOptionById.get(id)?.name || id)
                  .join(', ');
              },
            }}
            onChange={(e) => {
              const next = e.target.value as unknown as string[];
              setCategoryIds(Array.isArray(next) ? next : [next]);
            }}
            sx={{ minWidth: 230 }}
          >
            {categoryOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                <Checkbox checked={categoryIds.includes(option.id)} />
                <ListItemText primary={option.name} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Stream"
            value={streamIds}
            disabled={categoryIds.length === 0}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as string[];
                if (values.length === 0) return 'All streams';
                return values
                  .map((id) => streamOptionById.get(id)?.name || id)
                  .join(', ');
              },
            }}
            onChange={(e) => {
              const next = e.target.value as unknown as string[];
              setStreamIds(Array.isArray(next) ? next : [next]);
            }}
            sx={{ minWidth: 220 }}
          >
            {scopedStreamOptions.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                <Checkbox checked={streamIds.includes(option.id)} />
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
            disabled={!isValidPeriod || rows.length === 0 || exportingFormat !== null}
          >
            {exportingFormat === 'csv' ? 'Exporting…' : 'Export CSV'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleDownload('xlsx')}
            disabled={!isValidPeriod || rows.length === 0 || exportingFormat !== null}
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

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {rows.length} item{rows.length === 1 ? '' : 's'}
            </Typography>
            {(isLoading || isFetching) && <CircularProgress size={18} />}
          </Stack>
          <Box component={AgGridBox} sx={{ width: '100%', height: 560 }}>
            <AgGridReact<StatusChangeRow>
              rowData={rows}
              columnDefs={columns}
              defaultColDef={{
                sortable: true,
                resizable: true,
                suppressMenu: true,
              }}
              animateRows
              suppressCellFocus
              rowSelection="single"
              getRowId={(params) => `${params.data.itemType}:${params.data.itemId}`}
            />
          </Box>
        </Paper>
      </Stack>
    </ReportLayout>
  );
}
