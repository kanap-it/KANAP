import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Chip, Button, Stack, Box, RadioGroup, FormControlLabel, Radio, Tooltip, Typography } from '@mui/material';
import type { EnhancedColDef } from '../components/ServerDataGrid';
import ServerDataGrid from '../components/ServerDataGrid';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../auth/AuthContext';
import type { ICellRendererParams } from 'ag-grid-community';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import { CsvExportDialogV2, CsvImportDialogV2 } from '../components/csv';
import ForbiddenPage from './ForbiddenPage';
import api from '../api';
import CheckboxSetFilter from '../components/CheckboxSetFilter';
import CheckboxSetFloatingFilter from '../components/CheckboxSetFloatingFilter';
import { useGridScopePreference } from '../hooks/useGridScopePreference';
import { ACTIVE_TASK_STATUSES, TASK_STATUS_COLORS, TASK_STATUS_LABELS } from './tasks/task.constants';

type TaskRow = {
  id: string;
  tenant_id: string;
  title: string | null;
  description: string;
  status: string;
  task_type_id: string | null;
  task_type_name: string | null;
  priority_level: string;
  priority_score: number;
  due_date: string | null;
  start_date: string | null;
  created_at: string;
  assignee_user_id: string | null;
  assignee_name: string | null;
  related_object_type: string | null;
  related_object_id: string | null;
  related_object_name: string | null;
  phase_id: string | null;
  phase_name: string | null;
  item_number: number;
  // Classification fields
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  company_id: string | null;
  company_name: string | null;
};

const STATUS_LABEL_MAP: Record<string, string> = TASK_STATUS_LABELS as Record<string, string>;

const STATUS_COLOR_MAP: Record<string, 'default' | 'warning' | 'info' | 'secondary' | 'success' | 'error'> = TASK_STATUS_COLORS as Record<string, 'default' | 'warning' | 'info' | 'secondary' | 'success' | 'error'>;

const CONTEXT_LABEL_MAP: Record<string, string> = {
  project: 'Project',
  spend_item: 'OPEX',
  contract: 'Contract',
  capex_item: 'CAPEX',
};

function StatusCellRenderer(props: any) {
  const status = props.value;

  return (
    <Chip
      label={STATUS_LABEL_MAP[status] || status}
      color={STATUS_COLOR_MAP[status] || 'default'}
      size="small"
    />
  );
}

function PriorityCellRenderer(props: any) {
  const priority = props.value;
  const colorMap: Record<string, 'error' | 'warning' | 'default' | 'info' | 'success'> = {
    blocker: 'error',
    high: 'warning',
    normal: 'default',
    low: 'info',
    optional: 'success',
  };

  const labelMap: Record<string, string> = {
    blocker: 'Blocker',
    high: 'High',
    normal: 'Normal',
    low: 'Low',
    optional: 'Optional',
  };

  return (
    <Chip
      label={labelMap[priority] || priority || 'Normal'}
      color={colorMap[priority] || 'default'}
      size="small"
      variant="outlined"
    />
  );
}

function TaskTypeCellRenderer(props: any) {
  const typeName = props.value;

  if (!typeName) {
    return <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>;
  }

  // Simple color mapping based on common task type names
  const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning'> = {
    Task: 'primary',
    Bug: 'error',
    Problem: 'warning',
    Incident: 'secondary',
  };

  return (
    <Chip
      label={typeName}
      color={colorMap[typeName] || 'default'}
      size="small"
      variant="outlined"
    />
  );
}

function ScoreCellRenderer(props: any) {
  const score = props.value;

  if (score === null || score === undefined) {
    return <Box component="span" sx={{ color: 'text.disabled' }}>-</Box>;
  }

  return (
    <Chip
      label={Math.round(score)}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 'bold', minWidth: 40 }}
    />
  );
}

function TypeCellRenderer(props: any) {
  const type = props.value;

  if (!type) {
    return (
      <Chip
        label="Standalone"
        size="small"
        variant="outlined"
        color="info"
        sx={{ fontSize: '0.7rem' }}
      />
    );
  }

  return (
    <Chip
      label={CONTEXT_LABEL_MAP[type] || type}
      size="small"
      variant="outlined"
      sx={{ fontSize: '0.7rem' }}
    />
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export default function TasksPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasLevel, profile } = useAuth();

  if (!hasLevel('tasks', 'reader')) {
    return <ForbiddenPage />;
  }

  // Read filters from URL to restore state when returning from workspace
  const urlFilters = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const filtersParam = params.get('filters');
    if (filtersParam) {
      try {
        return JSON.parse(filtersParam);
      } catch {
        return null;
      }
    }
    return null;
  }, [location.search]);

  // Use URL filters if present (backend already excludes done/cancelled by default)
  const defaultFilterModel = useMemo(() => ({
    status: { filterType: 'set', values: ACTIVE_TASK_STATUSES },
  }), []);

  const initialFilterModel = useMemo(() => {
    if (urlFilters && typeof urlFilters === 'object') {
      if (Object.prototype.hasOwnProperty.call(urlFilters, 'status')) {
        return urlFilters;
      }
      return { ...defaultFilterModel, ...urlFilters };
    }
    return defaultFilterModel;
  }, [urlFilters, defaultFilterModel]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRows, setSelectedRows] = useState<TaskRow[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const gridApiRef = useRef<any>(null);

  // Read taskScope from URL to restore state when returning from workspace
  const urlTaskScope = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const scope = params.get('taskScope');
    if (scope === 'my' || scope === 'team' || scope === 'all') {
      return scope;
    }
    return null;
  }, [location.search]);

  const [taskScope, setTaskScope] = useGridScopePreference('tasks', urlTaskScope);

  const canCreate = hasLevel('tasks', 'member');
  const canAdmin = hasLevel('tasks', 'admin');

  // Fetch current user's team config
  const { data: myTeamConfig, isFetched: isTeamConfigFetched } = useQuery({
    queryKey: ['my-team-config', profile?.id],
    queryFn: async () => {
      const res = await api.get<{ id: string; team_id?: string | null }>(`/portfolio/team-members/by-user/${profile?.id}`);
      return res.data;
    },
    enabled: !!profile?.id,
  });

  const hasTeam = !!myTeamConfig?.team_id;

  useEffect(() => {
    if (taskScope === 'team' && isTeamConfigFetched && !hasTeam) {
      setTaskScope('my');
    }
  }, [taskScope, isTeamConfigFetched, hasTeam, setTaskScope]);

  // Filter extraParams based on scope selection
  const extraParams = useMemo(() => {
    if (taskScope === 'my') return { assigneeUserId: profile?.id };
    if (taskScope === 'team' && hasTeam) return { teamId: myTeamConfig?.team_id };
    return {};
  }, [taskScope, profile?.id, hasTeam, myTeamConfig?.team_id]);

  // Task scope filter toolbar
  const taskScopeToolbar = (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="body2">Show:</Typography>
      <RadioGroup
        row
        value={taskScope}
        onChange={(e) => setTaskScope(e.target.value as 'my' | 'team' | 'all')}
        sx={{ '& .MuiFormControlLabel-root': { mr: 1 } }}
      >
        <FormControlLabel value="my" control={<Radio size="small" />} label="My tasks" />
        <Tooltip title={hasTeam ? '' : 'You are not assigned to a team'}>
          <span>
            <FormControlLabel
              value="team"
              control={<Radio size="small" />}
              label="My team's tasks"
              disabled={!hasTeam}
            />
          </span>
        </Tooltip>
        <FormControlLabel value="all" control={<Radio size="small" />} label="All tasks" />
      </RadioGroup>
    </Stack>
  );

  // Preserve list query context for workspace
  const lastQueryRef = useRef<{ sort: string; q: string; filters: any } | null>(null);
  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'priority_score:DESC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    // Include task scope and derived params for workspace navigation
    sp.set('taskScope', taskScope);
    if (taskScope === 'my' && profile?.id) {
      sp.set('assigneeUserId', profile.id);
    } else if (taskScope === 'team' && myTeamConfig?.team_id) {
      sp.set('teamId', myTeamConfig.team_id);
    }
    return sp;
  }, [taskScope, profile?.id, myTeamConfig?.team_id]);

  const getTaskFilterValues = useCallback((field: string, opts?: { labelMap?: Record<string, string>; order?: Array<string | null>; emptyLabel?: string; searchable?: boolean }) => {
    const labelMap = opts?.labelMap;
    const order = opts?.order;
    const emptyLabel = opts?.emptyLabel ?? '(Blank)';
    return async ({ context }: any) => {
      const queryState = context?.getQueryState?.() ?? {};
      const filters = { ...(queryState.filters || {}) };
      delete filters[field];
      const params: Record<string, any> = {
        fields: field,
        ...(queryState.extraParams || {}),
      };
      if (queryState.q) params.q = queryState.q;
      if (Object.keys(filters).length > 0) {
        params.filters = JSON.stringify(filters);
      }
      const res = await api.get(`/tasks/filter-values`, { params });
      const values = (res.data?.[field] || []) as Array<string | null>;
      let options = values.map((value) => {
        if (value == null) return { value, label: emptyLabel };
        const key = String(value);
        const label = labelMap && Object.prototype.hasOwnProperty.call(labelMap, key) ? labelMap[key] : key;
        return { value, label };
      });
      if (order && order.length > 0) {
        const orderMap = new Map(order.map((val, index) => [val, index]));
        options.sort((a, b) => {
          const aIndex = orderMap.has(a.value) ? (orderMap.get(a.value) as number) : Number.MAX_SAFE_INTEGER;
          const bIndex = orderMap.has(b.value) ? (orderMap.get(b.value) as number) : Number.MAX_SAFE_INTEGER;
          if (aIndex !== bIndex) return aIndex - bIndex;
          return (a.label || '').localeCompare(b.label || '');
        });
      } else {
        options.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
      }
      return options;
    };
  }, []);

  // Clickable cell renderer
  const ClickableCell: React.FC<ICellRendererParams<TaskRow, any>> = (params) => (
    <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }} onClick={() => {
      const sp = buildWorkspaceSearch();
      const ref = params.data?.item_number ? `T-${params.data.item_number}` : params.data?.id;
      navigate(`/portfolio/tasks/${ref}/overview?${sp.toString()}`);
    }}>
      {params.valueFormatted ?? params.value ?? ''}
    </Box>
  );

  const columns: EnhancedColDef<TaskRow>[] = useMemo(() => [
    {
      field: 'item_number',
      headerName: '#',
      width: 90,
      filter: 'agTextColumnFilter',
      cellRenderer: ClickableCell,
      valueFormatter: (p: any) => p.value ? `T-${p.value}` : '',
      comparator: (a: number, b: number) => (a || 0) - (b || 0),
    },
    {
      field: 'title',
      headerName: 'Task Title',
      flex: 1.5,
      minWidth: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: ClickableCell,
    },
    {
      field: 'task_type_name',
      headerName: 'Task Type',
      width: 110,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getTaskFilterValues('task_type_name'),
        searchable: false,
      },
      cellRenderer: TaskTypeCellRenderer,
    },
    {
      field: 'related_object_type',
      headerName: 'Context',
      width: 110,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getTaskFilterValues('related_object_type', {
          labelMap: CONTEXT_LABEL_MAP,
          order: [null, 'project', 'spend_item', 'capex_item', 'contract'],
          emptyLabel: 'Standalone',
        }),
        searchable: false,
        emptyLabel: 'Standalone',
      },
      cellRenderer: TypeCellRenderer,
    },
    {
      field: 'related_object_name',
      headerName: 'Related Entry',
      flex: 1.5,
      minWidth: 180,
      filter: 'agTextColumnFilter',
      cellRenderer: ClickableCell,
      hide: true,
    },
    {
      field: 'phase_name',
      headerName: 'Phase',
      width: 140,
      filter: 'agTextColumnFilter',
      valueFormatter: (params) => params.value || 'Project-level',
      cellRenderer: ClickableCell,
      hide: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getTaskFilterValues('status', {
          labelMap: STATUS_LABEL_MAP,
          order: ['open', 'in_progress', 'pending', 'in_testing', 'done', 'cancelled'],
        }),
        searchable: false,
      },
      cellRenderer: StatusCellRenderer,
    },
    {
      field: 'priority_level',
      headerName: 'Priority',
      width: 110,
      filter: 'agTextColumnFilter',
      cellRenderer: PriorityCellRenderer,
      hide: true,
    },
    {
      field: 'priority_score',
      headerName: 'Score',
      width: 90,
      sort: 'desc',
      cellRenderer: ScoreCellRenderer,
    },
    {
      field: 'assignee_name',
      headerName: 'Assignee',
      flex: 1,
      minWidth: 140,
      filter: 'agTextColumnFilter',
      cellRenderer: ClickableCell,
    },
    {
      field: 'due_date',
      headerName: 'Due Date',
      width: 120,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => formatDate(params.value),
      cellRenderer: ClickableCell,
      hide: true,
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 120,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => formatDate(params.value),
      cellRenderer: ClickableCell,
      hide: true,
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1.5,
      minWidth: 200,
      filter: 'agTextColumnFilter',
      cellRenderer: ClickableCell,
      hide: true,
    },
    // Classification columns (hidden by default)
    {
      field: 'source_name',
      headerName: 'Source',
      width: 140,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getTaskFilterValues('source_name'),
      },
      cellRenderer: ClickableCell,
      hide: true,
    },
    {
      field: 'category_name',
      headerName: 'Classification',
      width: 140,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getTaskFilterValues('category_name'),
      },
      cellRenderer: ClickableCell,
    },
    {
      field: 'stream_name',
      headerName: 'Stream',
      width: 140,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getTaskFilterValues('stream_name'),
      },
      cellRenderer: ClickableCell,
    },
    {
      field: 'company_name',
      headerName: 'Company',
      width: 140,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getTaskFilterValues('company_name'),
      },
      cellRenderer: ClickableCell,
      hide: true,
    },
  ], [ClickableCell, getTaskFilterValues]);

  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreate && (
        <Button
          variant="contained"
          onClick={() => {
            const sp = buildWorkspaceSearch();
            navigate(`/portfolio/tasks/new/overview?${sp.toString()}`);
          }}
        >
          New
        </Button>
      )}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>Import CSV</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>Export CSV</Button>}
      {canAdmin && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/tasks/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.title || row.related_object_name || row.id}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => { setRefreshKey((k) => k + 1); }}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Tasks" actions={actions} />
      <ServerDataGrid<TaskRow>
        columns={columns}
        endpoint="/tasks"
        queryKey="tasks"
        getRowId={(r) => r.id}
        enableSearch
        defaultSort={{ field: 'priority_score', direction: 'DESC' }}
        enableRowSelection={canAdmin}
        onSelectionChanged={(rows) => setSelectedRows(rows)}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        initialState={{
          filter: {
            filterModel: initialFilterModel
          }
        }}
        columnPreferencesKey="tasks"
        refreshKey={refreshKey}
        onQueryStateChange={(state) => {
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {} };
        }}
        extraParams={extraParams}
        toolbarExtras={taskScopeToolbar}
      />
      <CsvExportDialogV2
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        endpoint="/tasks"
        title="Export Tasks"
        presets={[{ name: 'enrichment', label: 'Data Enrichment' }]}
      />
      <CsvImportDialogV2
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/tasks"
        title="Import Tasks"
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
