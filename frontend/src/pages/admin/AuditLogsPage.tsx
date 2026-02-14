import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import ServerDataGrid, { EnhancedColDef } from '../../components/ServerDataGrid';
import ForbiddenPage from '../ForbiddenPage';
import { useAuth } from '../../auth/AuthContext';
import api from '../../api';
import CheckboxSetFilter from '../../components/CheckboxSetFilter';
import CheckboxSetFloatingFilter from '../../components/CheckboxSetFloatingFilter';

type AuditLogItem = {
  id: string;
  tenant_id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  before_json: any | null;
  after_json: any | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  source: string;
  source_ref: string | null;
  created_at: string;
};

const ACTION_COLOR: Record<string, 'success' | 'info' | 'error' | 'warning' | 'default'> = {
  create: 'success',
  update: 'info',
  delete: 'error',
  disable: 'warning',
};

const SOURCE_COLOR: Record<string, 'success' | 'warning' | 'default'> = {
  user: 'success',
  webhook: 'warning',
  system: 'default',
};

function formatJson(value: any): string {
  if (value == null) return 'null';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getChangedKeys(beforeValue: any, afterValue: any): string[] {
  if (!beforeValue && !afterValue) return [];
  const beforeObj = beforeValue && typeof beforeValue === 'object' ? beforeValue : {};
  const afterObj = afterValue && typeof afterValue === 'object' ? afterValue : {};
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  return Array.from(keys).filter((key) => {
    return JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key]);
  });
}

export default function AuditLogsPage() {
  const { hasLevel } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedRow, setSelectedRow] = React.useState<AuditLogItem | null>(null);

  const detailQuery = useQuery({
    queryKey: ['audit-log-entry', selectedId],
    queryFn: async () => {
      if (!selectedId) throw new Error('Missing audit log id');
      const res = await api.get<AuditLogItem>(`/audit-logs/${selectedId}`);
      return res.data;
    },
    enabled: open && !!selectedId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const detail = detailQuery.data ?? selectedRow;
  const changedKeys = React.useMemo(() => {
    if (!detail) return [];
    return getChangedKeys(detail.before_json, detail.after_json);
  }, [detail]);

  const getFilterValues = React.useCallback((field: 'table_name' | 'action' | 'source') => {
    return async ({ context }: any) => {
      const queryState = context?.getQueryState?.() ?? {};
      const filters = { ...(queryState.filters || {}) };
      delete filters[field];
      const params: Record<string, any> = {
        fields: field,
      };
      if (queryState.q) params.q = queryState.q;
      if (Object.keys(filters).length > 0) {
        params.filters = JSON.stringify(filters);
      }
      const res = await api.get(`/audit-logs/filter-values`, { params });
      const values = (res.data?.[field] || []) as Array<string | null>;
      return values.map((value) => ({ value }));
    };
  }, []);

  const columns = React.useMemo<EnhancedColDef<AuditLogItem>[]>(() => {
    return [
      {
        field: 'created_at',
        headerName: 'Date',
        width: 180,
        filter: 'agDateColumnFilter',
        valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString() : ''),
      },
      {
        field: 'table_name',
        headerName: 'Table',
        width: 160,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: {
          getValues: getFilterValues('table_name'),
        },
      },
      {
        field: 'action',
        headerName: 'Action',
        width: 130,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: {
          getValues: getFilterValues('action'),
          searchable: false,
        },
        cellRenderer: (p: any) => {
          const value = String(p.value || '').toLowerCase();
          return (
            <Chip
              size="small"
              label={value || '-'}
              color={ACTION_COLOR[value] ?? 'default'}
              variant="outlined"
            />
          );
        },
      },
      {
        field: 'source',
        headerName: 'Source',
        width: 130,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: {
          getValues: getFilterValues('source'),
          searchable: false,
        },
        cellRenderer: (p: any) => {
          const value = String(p.value || 'system').toLowerCase();
          return (
            <Chip
              size="small"
              label={value}
              color={SOURCE_COLOR[value] ?? 'default'}
              variant="outlined"
            />
          );
        },
      },
      {
        field: 'record_id',
        headerName: 'Record ID',
        width: 170,
        defaultHidden: true,
        valueFormatter: (p: any) => {
          const value = String(p.value || '');
          if (!value) return '';
          return value.length > 12 ? `${value.slice(0, 8)}...` : value;
        },
      },
      {
        field: 'user_email',
        headerName: 'User',
        width: 220,
        valueGetter: (p: any) => {
          const email = p.data?.user_email;
          const userId = p.data?.user_id;
          const source = String(p.data?.source || '').toLowerCase();
          if (email) return email;
          if (userId) return `Unknown (${String(userId).slice(0, 8)}...)`;
          if (source === 'webhook') return 'Webhook';
          return 'System';
        },
      },
      {
        field: 'user_id',
        headerName: 'User ID',
        width: 220,
        defaultHidden: true,
      },
      {
        field: 'user_name',
        headerName: 'User Name',
        width: 180,
        defaultHidden: true,
      },
      {
        field: 'source_ref',
        headerName: 'Source Ref',
        width: 220,
        defaultHidden: true,
      },
      {
        field: 'tenant_id',
        headerName: 'Tenant ID',
        width: 220,
        defaultHidden: true,
      },
    ];
  }, [getFilterValues]);

  if (!hasLevel('users', 'admin')) {
    return <ForbiddenPage />;
  }

  return (
    <>
      <PageHeader title="Audit Log" />
      <ServerDataGrid<AuditLogItem>
        columns={columns}
        endpoint="/audit-logs"
        queryKey="audit-logs"
        getRowId={(row) => row.id}
        cacheBlockSize={100}
        enablePagination
        paginationPageSize={100}
        enableSearch
        defaultSort={{ field: 'created_at', direction: 'DESC' }}
        columnPreferencesKey="admin-audit-logs"
        enableColumnChooser={true}
        defaultHiddenColumns={['record_id', 'user_id', 'user_name', 'source_ref', 'tenant_id']}
        initialState={{
          sort: { sortModel: [{ colId: 'created_at', sort: 'desc' }] },
        }}
        onCellClicked={(e: any) => {
          if (!e?.data?.id) return;
          setSelectedRow(e.data as AuditLogItem);
          setSelectedId(String(e.data.id));
          setOpen(true);
        }}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xl">
        <DialogTitle>Audit Entry Details</DialogTitle>
        <DialogContent dividers>
          {detailQuery.isLoading && (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {detailQuery.isError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Failed to load audit entry details.
            </Alert>
          )}

          {detail && !detailQuery.isLoading && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`Date: ${new Date(detail.created_at).toLocaleString()}`} variant="outlined" />
                <Chip size="small" label={`Table: ${detail.table_name}`} variant="outlined" />
                <Chip size="small" label={`Action: ${detail.action}`} color={ACTION_COLOR[String(detail.action).toLowerCase()] ?? 'default'} variant="outlined" />
                <Chip size="small" label={`Source: ${detail.source || 'system'}`} color={SOURCE_COLOR[String(detail.source || 'system').toLowerCase()] ?? 'default'} variant="outlined" />
                {detail.source_ref && <Chip size="small" label={`Source Ref: ${detail.source_ref}`} variant="outlined" />}
                <Chip size="small" label={`Tenant: ${detail.tenant_id}`} variant="outlined" />
                {detail.record_id && <Chip size="small" label={`Record ID: ${detail.record_id}`} variant="outlined" />}
                <Chip size="small" label={`User: ${detail.user_email || detail.user_id || (detail.source === 'webhook' ? 'webhook' : 'system')}`} variant="outlined" />
              </Stack>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Changed Fields</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {changedKeys.length === 0 && <Chip size="small" label="No key-level changes" variant="outlined" />}
                  {changedKeys.map((key) => (
                    <Chip key={key} size="small" label={key} color="warning" variant="outlined" />
                  ))}
                </Stack>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Before</Typography>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2,
                      borderRadius: 1,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      backgroundColor: 'background.default',
                      overflow: 'auto',
                      maxHeight: 420,
                      fontSize: 12,
                    }}
                  >
                    {formatJson(detail.before_json)}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>After</Typography>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      p: 2,
                      borderRadius: 1,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      backgroundColor: 'background.default',
                      overflow: 'auto',
                      maxHeight: 420,
                      fontSize: 12,
                    }}
                  >
                    {formatJson(detail.after_json)}
                  </Box>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
