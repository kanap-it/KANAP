import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Chip, Button, Stack, Box, LinearProgress, Typography, RadioGroup, FormControlLabel, Radio, Tooltip } from '@mui/material';
import type { EnhancedColDef } from '../../components/ServerDataGrid';
import ServerDataGrid from '../../components/ServerDataGrid';
import { LinkCellRenderer } from '../../components/grid/renderers';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../auth/AuthContext';
import type { ICellRendererParams } from 'ag-grid-community';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CsvExportDialogV2, CsvImportDialogV2 } from '../../components/csv';
import ForbiddenPage from '../ForbiddenPage';
import CheckboxSetFilter from '../../components/CheckboxSetFilter';
import CheckboxSetFloatingFilter from '../../components/CheckboxSetFloatingFilter';
import api from '../../api';
import { useGridScopePreference } from '../../hooks/useGridScopePreference';

type ProjectRow = {
  id: string;
  name: string;
  purpose: string | null;
  status: string;
  origin: 'standard' | 'fast_track' | 'legacy';
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  company_id: string | null;
  company?: { id: string; name: string } | null;
  priority_score: number | null;
  execution_progress: number;
  planned_start: string | null;
  planned_end: string | null;
  item_number: number;
  created_at: string;
  updated_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }> = {
  waiting_list: { label: 'Waiting List', color: 'default' },
  planned: { label: 'Planned', color: 'info' },
  in_progress: { label: 'In Progress', color: 'primary' },
  in_testing: { label: 'In Testing', color: 'info' },
  on_hold: { label: 'On Hold', color: 'warning' },
  done: { label: 'Done', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

const ORIGIN_LABELS: Record<string, string> = {
  standard: 'Request',
  fast_track: 'Fast-track',
  legacy: 'Legacy',
};

const STATUS_LABEL_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([key, cfg]) => [key, cfg.label]),
);
const STATUS_ORDER = Object.keys(STATUS_CONFIG);


function StatusCellRenderer(props: any) {
  const status = props.value as string;
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'default' as const };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
}

function ProgressCellRenderer(props: any) {
  const value = Number(props.value) || 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', py: 1 }}>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{ flex: 1, height: 8, borderRadius: 4 }}
      />
      <Typography variant="caption" sx={{ minWidth: 35 }}>{value}%</Typography>
    </Box>
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

export default function ProjectsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasLevel, profile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const gridApiRef = useRef<any>(null);

  const canCreate = hasLevel('portfolio_projects', 'manager');
  const canAdmin = hasLevel('portfolio_projects', 'admin');

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
  const urlProjectScope = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const scope = params.get('projectScope');
    if (scope === 'my' || scope === 'team' || scope === 'all') {
      return scope;
    }
    return null;
  }, [location.search]);
  const [projectScope, setProjectScope] = useGridScopePreference('projects', urlProjectScope);

  const { data: myTeamConfig, isFetched: isTeamConfigFetched } = useQuery({
    queryKey: ['my-team-config', profile?.id],
    queryFn: async () => {
      const res = await api.get<{ id: string; team_id?: string | null }>(`/portfolio/team-members/by-user/${profile?.id}`);
      return res.data;
    },
    enabled: !!profile?.id && hasLevel('portfolio_projects', 'reader'),
  });
  const hasTeam = !!myTeamConfig?.team_id;

  const projectScopeRef = useRef(projectScope);
  const profileIdRef = useRef<string | null>(profile?.id ?? null);
  const hasTeamRef = useRef(hasTeam);
  const teamIdRef = useRef<string | null>(myTeamConfig?.team_id ?? null);

  React.useEffect(() => {
    projectScopeRef.current = projectScope;
  }, [projectScope]);

  React.useEffect(() => {
    profileIdRef.current = profile?.id ?? null;
  }, [profile?.id]);

  React.useEffect(() => {
    hasTeamRef.current = hasTeam;
  }, [hasTeam]);

  React.useEffect(() => {
    teamIdRef.current = myTeamConfig?.team_id ?? null;
  }, [myTeamConfig?.team_id]);

  React.useEffect(() => {
    if (projectScope === 'team' && isTeamConfigFetched && !hasTeam) {
      setProjectScope('my');
    }
  }, [projectScope, isTeamConfigFetched, hasTeam]);

  // Default filter: exclude 'done' status
  const defaultStatusValues = useMemo(
    () => STATUS_ORDER.filter((status) => status !== 'done'),
    [],
  );
  const defaultFilterModel = useMemo(() => ({
    status: {
      filterType: 'set',
      values: defaultStatusValues,
    },
  }), [defaultStatusValues]);

  // Use URL filters if present, otherwise use default
  const initialFilterModel = useMemo(() => {
    return urlFilters || defaultFilterModel;
  }, [urlFilters, defaultFilterModel]);

  const lastQueryRef = useRef<{ sort: string; q: string; filters: any } | null>(null);
  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'priority_score:DESC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    const scope = projectScopeRef.current;
    const profileId = profileIdRef.current;
    const hasTeamNow = hasTeamRef.current;
    const teamId = teamIdRef.current;
    sp.set('projectScope', scope);
    if (scope === 'my' && profileId) {
      sp.set('involvedUserId', profileId);
    } else if (scope === 'team' && hasTeamNow && teamId) {
      sp.set('involvedTeamId', teamId);
      if (profileId) sp.set('involvedUserId', profileId);
    }
    return sp;
  }, []);

  const projectScopeToolbar = (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="body2">Show:</Typography>
      <RadioGroup
        row
        value={projectScope}
        onChange={(e) => setProjectScope(e.target.value as 'my' | 'team' | 'all')}
        sx={{ '& .MuiFormControlLabel-root': { mr: 1 } }}
      >
        <FormControlLabel value="my" control={<Radio size="small" />} label="My projects" />
        <Tooltip title={hasTeam ? '' : 'You are not assigned to a team'}>
          <span>
            <FormControlLabel
              value="team"
              control={<Radio size="small" />}
              label="My team's projects"
              disabled={!hasTeam}
            />
          </span>
        </Tooltip>
        <FormControlLabel value="all" control={<Radio size="small" />} label="All projects" />
      </RadioGroup>
    </Stack>
  );

  const clickableCellRenderer = useCallback((params: ICellRendererParams<ProjectRow, any>) => (
    <LinkCellRenderer
      {...params}
      linkType="internal"
      getHref={(data) => {
        if (!data?.id) return null;
        const sp = buildWorkspaceSearch();
        const ref = data.item_number ? `PRJ-${data.item_number}` : data.id;
        return `/portfolio/projects/${ref}/summary?${sp.toString()}`;
      }}
      onNavigate={(href) => navigate(href)}
    />
  ), [buildWorkspaceSearch, navigate]);

  const getProjectFilterValues = useCallback((
    field: string,
    opts?: { labelMap?: Record<string, string>; order?: Array<string | null>; emptyLabel?: string; searchable?: boolean },
  ) => {
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
      const res = await api.get('/portfolio/projects/filter-values', { params });
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

  const columns: EnhancedColDef<ProjectRow>[] = useMemo(() => [
    {
      field: 'item_number',
      headerName: '#',
      width: 90,
      filter: 'agTextColumnFilter',
      cellRenderer: clickableCellRenderer,
      valueFormatter: (p: any) => p.value ? `PRJ-${p.value}` : '',
      comparator: (a: number, b: number) => (a || 0) - (b || 0),
    },
    {
      field: 'name',
      headerName: 'Project Name',
      flex: 1.5,
      minWidth: 220,
      filter: 'agTextColumnFilter',
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'priority_score',
      headerName: 'Priority',
      width: 100,
      filter: 'agNumberColumnFilter',
      valueFormatter: (params: any) => (params.value != null ? String(Math.round(params.value)) : ''),
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getProjectFilterValues('status', { labelMap: STATUS_LABEL_MAP, order: STATUS_ORDER }),
        searchable: false,
        treatAllAsUnfiltered: false,
      },
      cellRenderer: StatusCellRenderer,
    },
    {
      field: 'origin',
      headerName: 'Origin',
      width: 110,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getProjectFilterValues('origin', { labelMap: ORIGIN_LABELS, order: ['standard', 'fast_track', 'legacy'] }),
        searchable: false,
      },
      valueFormatter: (params: any) => ORIGIN_LABELS[params.value] || params.value,
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'execution_progress',
      headerName: 'Progress',
      width: 140,
      filter: 'agNumberColumnFilter',
      cellRenderer: ProgressCellRenderer,
    },
    {
      field: 'source_name',
      headerName: 'Source',
      width: 100,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getProjectFilterValues('source_name'),
        searchable: false,
      },
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'category_name',
      headerName: 'Category',
      width: 200,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getProjectFilterValues('category_name'),
        searchable: false,
      },
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'stream_name',
      headerName: 'Stream',
      width: 180,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getProjectFilterValues('stream_name'),
        searchable: false,
      },
      cellRenderer: clickableCellRenderer,
    },
    {
      colId: 'company_name',
      headerName: 'Company',
      width: 180,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getProjectFilterValues('company_name'),
        searchable: false,
      },
      valueGetter: (params: any) => params.data?.company?.name || '',
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'planned_start',
      headerName: 'Start',
      width: 110,
      filter: 'agDateColumnFilter',
      valueFormatter: (params: any) => formatDate(params.value),
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'planned_end',
      headerName: 'End',
      width: 110,
      filter: 'agDateColumnFilter',
      valueFormatter: (params: any) => formatDate(params.value),
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 110,
      filter: 'agDateColumnFilter',
      valueFormatter: (params: any) => formatDate(params.value),
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'updated_at',
      headerName: 'Last changed',
      width: 130,
      filter: 'agDateColumnFilter',
      valueFormatter: (params: any) => formatDate(params.value),
      cellRenderer: clickableCellRenderer,
      hide: true,
    },
  ], [clickableCellRenderer, getProjectFilterValues]);

  const extraParams = useMemo(() => {
    const params: Record<string, any> = {
      include: 'company,classification',
    };
    if (projectScope === 'my' && profile?.id) {
      params.involvedUserId = profile.id;
    } else if (projectScope === 'team' && hasTeam && myTeamConfig?.team_id) {
      params.involvedTeamId = myTeamConfig.team_id;
      if (profile?.id) params.involvedUserId = profile.id;
    }
    return params;
  }, [projectScope, profile?.id, hasTeam, myTeamConfig?.team_id]);

  // Use URL filters if present, otherwise use default filter
  const initialGridState = useMemo(() => ({
    filter: {
      filterModel: initialFilterModel,
    },
  }), [initialFilterModel]);

  if (!hasLevel('portfolio_projects', 'reader')) {
    return <ForbiddenPage />;
  }

  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreate && (
        <Button
          variant="contained"
          onClick={() => {
            const sp = buildWorkspaceSearch();
            navigate(`/portfolio/projects/new/summary?${sp.toString()}`);
          }}
        >
          New Project
        </Button>
      )}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>Import CSV</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>Export CSV</Button>}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Portfolio Projects" actions={actions} />
      <ServerDataGrid<ProjectRow>
        columns={columns}
        endpoint="/portfolio/projects"
        showRowCount
        queryKey="portfolio-projects"
        getRowId={(r) => r.id}
        enableSearch
        defaultSort={{ field: 'priority_score', direction: 'DESC' }}
        extraParams={extraParams}
        columnPreferencesKey="portfolio-projects"
        initialState={initialGridState}
        refreshKey={refreshKey}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        onQueryStateChange={(state) => {
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {} };
        }}
        toolbarExtras={projectScopeToolbar}
      />
      <CsvExportDialogV2
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        endpoint="/portfolio/projects"
        title="Export Portfolio Projects"
        presets={[{ name: 'enrichment', label: 'Data Enrichment' }]}
      />
      <CsvImportDialogV2
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/portfolio/projects"
        title="Import Portfolio Projects"
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
