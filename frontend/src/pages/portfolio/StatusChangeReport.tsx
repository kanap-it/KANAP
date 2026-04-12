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
  const { t } = useTranslation(['portfolio', 'errors']);
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

  const itemTypeOptions = useMemo<ItemTypeOption[]>(() => [
    { value: 'task', label: t('reports.itemTypes.tasks') },
    { value: 'request', label: t('reports.itemTypes.requests') },
    { value: 'project', label: t('reports.itemTypes.projects') },
  ], [t]);

  const itemTypeLabelMap = useMemo<Record<StatusChangeItemType, string>>(() => ({
    task: t('reports.itemTypes.task'),
    request: t('reports.itemTypes.request'),
    project: t('reports.itemTypes.project'),
  }), [t]);

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
    () => new Map(itemTypeOptions.map((option) => [option.value, option])),
    [itemTypeOptions],
  );

  const columns = useMemo<ColDef<StatusChangeRow>[]>(() => {
    const ClickableNameCell: React.FC<ICellRendererParams<StatusChangeRow, string>> = (params) => (
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
        headerName: t('reports.statusChange.columns.name'),
        flex: 1.4,
        minWidth: 220,
        cellRenderer: ClickableNameCell,
      },
      {
        field: 'itemType',
        headerName: t('reports.statusChange.columns.itemType'),
        width: 130,
        valueFormatter: (params) => {
          const value = params.value as StatusChangeItemType;
          return itemTypeLabelMap[value] || String(value || '');
        },
      },
      {
        field: 'priority',
        headerName: t('reports.statusChange.columns.priority'),
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
        headerName: t('reports.statusChange.columns.status'),
        width: 150,
        valueFormatter: (params) => getStatusLabel(String(params.value || '')),
      },
      { field: 'sourceName', headerName: t('reports.statusChange.columns.source'), width: 150 },
      { field: 'categoryName', headerName: t('reports.statusChange.columns.category'), width: 170 },
      { field: 'streamName', headerName: t('reports.statusChange.columns.stream'), width: 170 },
      { field: 'companyName', headerName: t('reports.statusChange.columns.company'), width: 170 },
      {
        field: 'lastChangedAt',
        headerName: t('reports.statusChange.columns.lastChanged'),
        width: 130,
        valueFormatter: (params) => formatDate(params.value || null),
      },
    ];
  }, [getStatusLabel, itemTypeLabelMap, navigate, t]);

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
      setExportError(getApiErrorMessage(e, t, t('reports.statusChange.messages.exportFailed')));
    } finally {
      setExportingFormat(null);
    }
  };

  const reportErrorMessage = error
    ? getApiErrorMessage(error, t, t('reports.statusChange.messages.loadFailed'))
    : null;

  return (
    <ReportLayout
      title={t('reports.statusChange.title')}
      subtitle={t('reports.statusChange.subtitle')}
      rootTo="/portfolio/reports"
      rootLabel={t('reports.title')}
      filters={(
        <>
          <TextField
            label={t('reports.statusChange.filters.startDate')}
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t('reports.statusChange.filters.endDate')}
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            size="small"
            label={t('reports.statusChange.filters.status')}
            value={statuses}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as string[];
                if (values.length === 0) return t('reports.statusChange.filters.allStatuses');
                return values.map((status) => getStatusLabel(status)).join(', ');
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
                <ListItemText primary={getStatusLabel(status)} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('reports.statusChange.filters.itemType')}
            value={itemTypes}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as StatusChangeItemType[];
                if (values.length === 0) return t('reports.statusChange.filters.allItemTypes');
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
            {itemTypeOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={itemTypes.includes(option.value)} />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t('reports.statusChange.filters.source')}
            value={sourceIds}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as string[];
                if (values.length === 0) return t('reports.statusChange.filters.allSources');
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
            label={t('reports.statusChange.filters.category')}
            value={categoryIds}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as string[];
                if (values.length === 0) return t('reports.statusChange.filters.allCategories');
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
            label={t('reports.statusChange.filters.stream')}
            value={streamIds}
            disabled={categoryIds.length === 0}
            SelectProps={{
              multiple: true,
              renderValue: (selected) => {
                const values = selected as string[];
                if (values.length === 0) return t('reports.statusChange.filters.allStreams');
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
            {exportingFormat === 'csv' ? t('reports.statusChange.actions.exporting') : t('reports.statusChange.actions.exportCsv')}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleDownload('xlsx')}
            disabled={!isValidPeriod || rows.length === 0 || exportingFormat !== null}
          >
            {exportingFormat === 'xlsx' ? t('reports.statusChange.actions.exporting') : t('reports.statusChange.actions.exportXlsx')}
          </Button>
        </>
      )}
    >
      <Stack spacing={1.5}>
        {!isValidPeriod && (
          <Alert severity="warning">{t('reports.statusChange.messages.invalidPeriod')}</Alert>
        )}
        {reportErrorMessage && (
          <Alert severity="error">
            {reportErrorMessage}
          </Alert>
        )}
        {exportError && (
          <Alert severity="error">{exportError}</Alert>
        )}

        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('reports.statusChange.itemCount', { count: rows.length })}
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
