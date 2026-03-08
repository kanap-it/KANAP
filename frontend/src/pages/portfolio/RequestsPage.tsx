import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Chip, Button, Stack, Box, RadioGroup, FormControlLabel, Radio, Tooltip, Typography } from '@mui/material';
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

type RequestRow = {
  id: string;
  name: string;
  purpose: string | null;
  status: string;
  source_id: string | null;
  source_name: string | null;
  category_id: string | null;
  category_name: string | null;
  stream_id: string | null;
  stream_name: string | null;
  company_id: string | null;
  company?: { id: string; name: string } | null;
  requestor_id: string | null;
  requestor?: { id: string; email: string; first_name?: string; last_name?: string } | null;
  priority_score: number | null;
  target_delivery_date: string | null;
  item_number: number;
  created_at: string;
  updated_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }> = {
  pending_review: { label: 'Pending Review', color: 'default' },
  candidate: { label: 'Candidate', color: 'info' },
  approved: { label: 'Approved', color: 'primary' },
  on_hold: { label: 'On Hold', color: 'warning' },
  rejected: { label: 'Rejected', color: 'error' },
  converted: { label: 'Converted', color: 'success' },
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

export default function RequestsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasLevel, profile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const gridApiRef = useRef<any>(null);

  const canCreate = hasLevel('portfolio_requests', 'manager');
  const canAdmin = hasLevel('portfolio_requests', 'admin');

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
  const urlRequestScope = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const scope = params.get('requestScope');
    if (scope === 'my' || scope === 'team' || scope === 'all') {
      return scope;
    }
    return null;
  }, [location.search]);
  const [requestScope, setRequestScope] = useGridScopePreference('requests', urlRequestScope);

  const { data: myTeamConfig, isFetched: isTeamConfigFetched } = useQuery({
    queryKey: ['my-team-config', profile?.id],
    queryFn: async () => {
      const res = await api.get<{ id: string; team_id?: string | null }>(`/portfolio/team-members/by-user/${profile?.id}`);
      return res.data;
    },
    enabled: !!profile?.id && hasLevel('portfolio_requests', 'reader'),
  });
  const hasTeam = !!myTeamConfig?.team_id;

  const requestScopeRef = useRef(requestScope);
  const profileIdRef = useRef<string | null>(profile?.id ?? null);
  const hasTeamRef = useRef(hasTeam);
  const teamIdRef = useRef<string | null>(myTeamConfig?.team_id ?? null);

  React.useEffect(() => {
    requestScopeRef.current = requestScope;
  }, [requestScope]);

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
    if (requestScope === 'team' && isTeamConfigFetched && !hasTeam) {
      setRequestScope('my');
    }
  }, [requestScope, isTeamConfigFetched, hasTeam]);

  // Default hidden statuses should start unchecked in the status filter.
  const defaultHiddenStatuses = useMemo(() => new Set<string>(['converted']), []);
  const defaultStatusValues = useMemo(
    () => STATUS_ORDER.filter((status) => !defaultHiddenStatuses.has(status)),
    [defaultHiddenStatuses],
  );

  // If URL filters are present but do not specify status, still apply default status visibility.
  const initialFilterModel = useMemo(() => {
    const parsed = (urlFilters && typeof urlFilters === 'object' && !Array.isArray(urlFilters))
      ? { ...urlFilters }
      : {};
    const hasExplicitStatusFilter = Object.prototype.hasOwnProperty.call(parsed, 'status');
    if (hasExplicitStatusFilter) return parsed;
    return {
      ...parsed,
      status: {
        filterType: 'set',
        values: defaultStatusValues,
      },
    };
  }, [urlFilters, defaultStatusValues]);

  const lastQueryRef = useRef<{ sort: string; q: string; filters: any } | null>(null);
  const buildWorkspaceSearch = useCallback(() => {
    const sp = new URLSearchParams();
    const sort = lastQueryRef.current?.sort || 'priority_score:DESC';
    const q = lastQueryRef.current?.q || '';
    const filters = lastQueryRef.current?.filters || {};
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters && Object.keys(filters).length > 0) sp.set('filters', JSON.stringify(filters));
    const scope = requestScopeRef.current;
    const profileId = profileIdRef.current;
    const hasTeamNow = hasTeamRef.current;
    const teamId = teamIdRef.current;
    sp.set('requestScope', scope);
    if (scope === 'my' && profileId) {
      sp.set('involvedUserId', profileId);
    } else if (scope === 'team' && hasTeamNow && teamId) {
      sp.set('involvedTeamId', teamId);
      if (profileId) sp.set('involvedUserId', profileId);
    }
    return sp;
  }, []);

  const requestScopeToolbar = (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Typography variant="body2">Show:</Typography>
      <RadioGroup
        row
        value={requestScope}
        onChange={(e) => setRequestScope(e.target.value as 'my' | 'team' | 'all')}
        sx={{ '& .MuiFormControlLabel-root': { mr: 1 } }}
      >
        <FormControlLabel value="my" control={<Radio size="small" />} label="My requests" />
        <Tooltip title={hasTeam ? '' : 'You are not assigned to a team'}>
          <span>
            <FormControlLabel
              value="team"
              control={<Radio size="small" />}
              label="My team's requests"
              disabled={!hasTeam}
            />
          </span>
        </Tooltip>
        <FormControlLabel value="all" control={<Radio size="small" />} label="All requests" />
      </RadioGroup>
    </Stack>
  );

  const clickableCellRenderer = useCallback((params: ICellRendererParams<RequestRow, any>) => (
    <LinkCellRenderer
      {...params}
      linkType="internal"
      getHref={(data) => {
        if (!data?.id) return null;
        const sp = buildWorkspaceSearch();
        const ref = data.item_number ? `REQ-${data.item_number}` : data.id;
        return `/portfolio/requests/${ref}/summary?${sp.toString()}`;
      }}
      onNavigate={(href) => navigate(href)}
    />
  ), [buildWorkspaceSearch, navigate]);

  const getRequestFilterValues = useCallback((
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
      const res = await api.get('/portfolio/requests/filter-values', { params });
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

  const columns: EnhancedColDef<RequestRow>[] = useMemo(() => [
    {
      field: 'item_number',
      headerName: '#',
      width: 90,
      filter: 'agTextColumnFilter',
      cellRenderer: clickableCellRenderer,
      valueFormatter: (p: any) => p.value ? `REQ-${p.value}` : '',
      comparator: (a: number, b: number) => (a || 0) - (b || 0),
    },
    {
      field: 'name',
      headerName: 'Request Name',
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
      width: 150,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getRequestFilterValues('status', { labelMap: STATUS_LABEL_MAP, order: STATUS_ORDER }),
        searchable: false,
        treatAllAsUnfiltered: false,
      },
      cellRenderer: StatusCellRenderer,
    },
    {
      field: 'source_name',
      headerName: 'Source',
      width: 100,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getRequestFilterValues('source_name'),
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
        getValues: getRequestFilterValues('category_name'),
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
        getValues: getRequestFilterValues('stream_name'),
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
        getValues: getRequestFilterValues('company_name'),
        searchable: false,
      },
      valueGetter: (params: any) => params.data?.company?.name || '',
      cellRenderer: clickableCellRenderer,
    },
    {
      colId: 'requestor_name',
      headerName: 'Requestor',
      width: 180,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getRequestFilterValues('requestor_name'),
        searchable: false,
      },
      valueGetter: (params: any) => {
        const r = params.data?.requestor;
        if (!r) return '';
        if (r.first_name || r.last_name) return `${r.first_name || ''} ${r.last_name || ''}`.trim();
        return r.email || '';
      },
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'target_delivery_date',
      headerName: 'Target Date',
      width: 130,
      filter: 'agDateColumnFilter',
      valueFormatter: (params: any) => formatDate(params.value),
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 130,
      filter: 'agDateColumnFilter',
      valueFormatter: (params: any) => formatDate(params.value),
      cellRenderer: clickableCellRenderer,
    },
    {
      field: 'updated_at',
      headerName: 'Last changed',
      width: 140,
      filter: 'agDateColumnFilter',
      valueFormatter: (params: any) => formatDate(params.value),
      cellRenderer: clickableCellRenderer,
      hide: true,
    },
  ], [clickableCellRenderer, getRequestFilterValues]);

  const extraParams = useMemo(() => {
    const params: Record<string, any> = {
      include: 'company,requestor,classification',
    };
    if (requestScope === 'my' && profile?.id) {
      params.involvedUserId = profile.id;
    } else if (requestScope === 'team' && hasTeam && myTeamConfig?.team_id) {
      params.involvedTeamId = myTeamConfig.team_id;
      if (profile?.id) params.involvedUserId = profile.id;
    }
    return params;
  }, [requestScope, profile?.id, hasTeam, myTeamConfig?.team_id]);

  // Use URL filters if present, otherwise use default filter
  const initialGridState = useMemo(() => ({
    filter: {
      filterModel: initialFilterModel,
    },
  }), [initialFilterModel]);

  if (!hasLevel('portfolio_requests', 'reader')) {
    return <ForbiddenPage />;
  }

  const actions = (
    <Stack direction="row" spacing={1}>
      {canCreate && (
        <Button
          variant="contained"
          onClick={() => {
            const sp = buildWorkspaceSearch();
            navigate(`/portfolio/requests/new/summary?${sp.toString()}`);
          }}
        >
          New Request
        </Button>
      )}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>Import CSV</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>Export CSV</Button>}
    </Stack>
  );

  return (
    <>
      <PageHeader title="Portfolio Requests" actions={actions} />
      <ServerDataGrid<RequestRow>
        columns={columns}
        endpoint="/portfolio/requests"
        queryKey="portfolio-requests"
        getRowId={(r) => r.id}
        enableSearch
        defaultSort={{ field: 'priority_score', direction: 'DESC' }}
        extraParams={extraParams}
        columnPreferencesKey="portfolio-requests"
        initialState={initialGridState}
        refreshKey={refreshKey}
        onGridApiReady={(api) => { gridApiRef.current = api; }}
        onQueryStateChange={(state) => {
          lastQueryRef.current = { sort: state.sort, q: state.q || '', filters: state.filterModel || {} };
        }}
        toolbarExtras={requestScopeToolbar}
      />
      <CsvExportDialogV2
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        endpoint="/portfolio/requests"
        title="Export Portfolio Requests"
        presets={[{ name: 'enrichment', label: 'Data Enrichment' }]}
      />
      <CsvImportDialogV2
        open={importOpen}
        onClose={() => setImportOpen(false)}
        endpoint="/portfolio/requests"
        title="Import Portfolio Requests"
        onImported={() => setRefreshKey((k) => k + 1)}
      />
    </>
  );
}
