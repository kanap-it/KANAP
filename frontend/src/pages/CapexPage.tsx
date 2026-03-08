import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { StatusScope } from '../components/ServerDataGrid';
import { Button, Stack } from '@mui/material';
import CheckboxSetFilter from '../components/CheckboxSetFilter';
import CheckboxSetFloatingFilter from '../components/CheckboxSetFloatingFilter';
import CsvExportDialog from '../components/csv/CsvExportDialog';
import CsvImportDialog from '../components/csv/CsvImportDialog';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
import { LinkCellRenderer } from '../components/grid/renderers';
import { readStoredCapexListContext, writeStoredCapexListContext } from './capex/listContextStorage';
import ForbiddenPage from './ForbiddenPage';
import { STATUS_VALUES } from '../constants/status';
// import StatusSwitch from '../components/fields/StatusSwitch';

type SummaryRow = {
  id: string;
  description: string;
  ppe_type: 'hardware' | 'software';
  investment_type: 'replacement' | 'capacity' | 'productivity' | 'security' | 'conformity' | 'business_growth' | 'other';
  priority: 'mandatory' | 'high' | 'medium' | 'low';
  currency: string;
  effective_start: string;
  effective_end?: string | null;
  status: string;
  notes?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  versions?: {
    yMinus1?: {
      year?: number;
      totals: { budget: number; follow_up: number; landing: number; revision: number };
      reporting?: { budget: number; follow_up: number; landing: number; revision: number };
      version_id?: string;
    };
    y?: {
      year?: number;
      totals: { budget: number; follow_up: number; landing: number; revision: number };
      reporting?: { budget: number; follow_up: number; landing: number; revision: number };
      version_id?: string;
    };
    yPlus1?: {
      year?: number;
      totals: { budget: number; follow_up: number; landing: number; revision: number };
      reporting?: { budget: number; follow_up: number; landing: number; revision: number };
      version_id?: string;
    };
  };
  spread_mode_for_y?: 'flat' | 'manual' | null;
  allocation_method_label?: string | null;
  next_year_allocation_method_label?: string | null;
  allocation_warning?: string | null;
};

function formatNumber(v: any) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return '';
  const i = Math.round(n);
  return i.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// modal-specific option lists removed

export default function CapexPage() {
  const { hasLevel } = useAuth();

  if (!hasLevel('capex', 'reader')) {
    return <ForbiddenPage />;
  }

  const Y = new Date().getFullYear();
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<SummaryRow[]>([]);
  const [pinnedTotals, setPinnedTotals] = useState<any[]>([]);
  const [reportingCurrency, setReportingCurrency] = useState('EUR');
  const lastQueryRef = useRef<{ sort: string; q: string; filters: any; filtersString: string; statusScope?: StatusScope } | null>(null);
  const gridApiRef = useRef<any>(null);
  const storedContextRef = useRef(readStoredCapexListContext());

  const getCapexFilterValues = useCallback((field: string, opts?: { emptyLabel?: string; labelMap?: Record<string, string> }) => {
    const emptyLabel = opts?.emptyLabel ?? '(Blank)';
    const labelMap = opts?.labelMap;
    return async ({ context }: any) => {
      const queryState = context?.getQueryState?.() ?? {};
      const filters = { ...(queryState.filters || {}) };
      delete filters[field];
      const params: Record<string, any> = {
        fields: field,
        ...(queryState.extraParams || {}),
      };
      if (queryState.q) params.q = queryState.q;
      if (Object.keys(filters).length > 0) params.filters = JSON.stringify(filters);
      const statusScope = queryState.statusScope;
      if (statusScope === 'enabled' || statusScope === 'disabled') {
        params.status = statusScope;
      } else if (statusScope === 'all') {
        params.includeDisabled = '1';
      }
      const res = await api.get('/capex-items/summary/filter-values', { params });
      const values = (res.data?.[field] || []) as Array<string | null>;
      const options = values.map((value) => {
        if (value == null) return { value, label: emptyLabel };
        const key = String(value);
        const label = labelMap && Object.prototype.hasOwnProperty.call(labelMap, key) ? labelMap[key] : key;
        return { value, label };
      });
      options.sort((a, b) => {
        if (a.value == null) return 1;
        if (b.value == null) return -1;
        return (a.label || '').localeCompare(b.label || '');
      });
      return options;
    };
  }, []);

  const PPE_LABELS: Record<string, string> = useMemo(() => ({
    hardware: 'Hardware',
    software: 'Software',
  }), []);

  const INVESTMENT_LABELS: Record<string, string> = useMemo(() => ({
    replacement: 'Replacement',
    capacity: 'Capacity',
    productivity: 'Productivity',
    security: 'Security',
    conformity: 'Conformity',
    business_growth: 'Business Growth',
    other: 'Other',
  }), []);

  const PRIORITY_LABELS: Record<string, string> = useMemo(() => ({
    mandatory: 'Mandatory',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  }), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = storedContextRef.current || readStoredCapexListContext();
    if (stored && !storedContextRef.current) {
      storedContextRef.current = stored;
    }
    if (!stored) return;

    const currentParams = new URLSearchParams(location.search);
    const currentSort = currentParams.get('sort') || '';
    const currentQ = currentParams.get('q') || '';
    const currentFilters = currentParams.get('filters') || '';

    // Only update URL if stored values differ from current URL
    const needsUpdate =
      (stored.sort && stored.sort !== currentSort) ||
      (stored.q && stored.q !== currentQ) ||
      (stored.filters && stored.filters !== currentFilters);

    if (!needsUpdate) return;

    const newParams = new URLSearchParams(location.search);
    if (stored.sort) newParams.set('sort', stored.sort);
    if (stored.q) newParams.set('q', stored.q);
    if (stored.filters) newParams.set('filters', stored.filters);

    navigate({ search: newParams.toString() }, { replace: true });
  }, [location.search, navigate]);

  const updateTotals = useCallback(async ({ q, filterModel, statusScope }: { q: string; filterModel: any; statusScope?: StatusScope }) => {
    try {
      const params: Record<string, any> = {};
      if (q) params.q = q;
      if (filterModel && Object.keys(filterModel).length > 0) params.filters = JSON.stringify(filterModel);
      if (statusScope === 'enabled' || statusScope === 'disabled') {
        params.status = statusScope;
      } else if (statusScope === 'all') {
        params.includeDisabled = '1';
      }
      const res = await api.get('/capex-items/summary/totals', { params });
      const totals = res.data || {};
      const rc = typeof totals.reportingCurrency === 'string' ? totals.reportingCurrency : 'EUR';
      setReportingCurrency(rc);
      const pinned = {
        description: `Total`,
        versions: {
          yMinus1: {
            reporting: {
              landing: Number(totals.yMinus1Landing || 0),
              budget: Number(totals.yMinus1Landing || 0),
              revision: 0,
              follow_up: 0,
            },
            totals: {
              landing: Number(totals.yMinus1Landing || 0),
              budget: Number(totals.yMinus1Landing || 0),
              revision: 0,
              follow_up: 0,
            },
          },
          y: {
            reporting: {
              budget: Number(totals.yBudget || 0),
              landing: Number(totals.yLanding || 0),
              revision: 0,
              follow_up: 0,
            },
            totals: {
              budget: Number(totals.yBudget || 0),
              landing: Number(totals.yLanding || 0),
              revision: 0,
              follow_up: 0,
            },
          },
          yPlus1: {
            reporting: {
              budget: Number(totals.yPlus1Budget || 0),
              landing: 0,
              revision: 0,
              follow_up: 0,
            },
            totals: {
              budget: Number(totals.yPlus1Budget || 0),
              landing: 0,
              revision: 0,
              follow_up: 0,
            },
          },
        },
      };
      setPinnedTotals([pinned]);
    } catch (err) {
      setPinnedTotals([]);
    }
  }, []);

  useEffect(() => {
    let urlParams: URLSearchParams | null = null;
    if (typeof window !== 'undefined') {
      urlParams = new URLSearchParams(window.location.search);
    }
    const stored = storedContextRef.current || readStoredCapexListContext();
    if (stored && !storedContextRef.current) storedContextRef.current = stored;
    const q = lastQueryRef.current?.q || urlParams?.get('q') || stored?.q || '';
    let fm = lastQueryRef.current?.filters || (gridApiRef.current?.getFilterModel?.() || {});
    if ((!fm || Object.keys(fm).length === 0) && stored?.filters) {
      try {
        const parsed = JSON.parse(stored.filters);
        if (parsed && typeof parsed === 'object') fm = parsed;
      } catch {}
    }
    const statusScope = lastQueryRef.current?.statusScope ?? 'enabled';
    updateTotals({ q, filterModel: fm, statusScope });
  }, [refreshKey, updateTotals]);

  const buildGridSearch = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stored = storedContextRef.current || readStoredCapexListContext();
    if (stored && !storedContextRef.current) storedContextRef.current = stored;
    const fallbackSort = lastQueryRef.current?.sort || urlParams.get('sort') || stored?.sort || 'yBudget:DESC';
    const sortModel = gridApiRef.current?.getSortModel?.() as Array<{ colId?: string; sort?: 'asc' | 'desc' | undefined }> | undefined;
    const primarySort = Array.isArray(sortModel) && sortModel.length > 0 ? sortModel[0] : undefined;
    let sort = fallbackSort;
    if (primarySort?.colId) {
      const direction = primarySort.sort === 'asc' ? 'ASC' : 'DESC';
      sort = `${primarySort.colId}:${direction}`;
    }
    const q = lastQueryRef.current?.q ?? urlParams.get('q') ?? stored?.q ?? '';
    const gridFilterModel = gridApiRef.current?.getFilterModel?.() || lastQueryRef.current?.filters || {};
    let filters = gridFilterModel && Object.keys(gridFilterModel).length > 0 ? JSON.stringify(gridFilterModel) : '';
    if (!filters && lastQueryRef.current?.filtersString) filters = lastQueryRef.current.filtersString;
    if (!filters && stored?.filters) filters = stored.filters;
    const sp = new URLSearchParams();
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters) sp.set('filters', filters);
    return sp;
  }, []);

  const getCapexHref = useCallback((row: unknown, colId?: string) => {
    const item = row as SummaryRow | null | undefined;
    if (!item?.id) return null;
    const sp = buildGridSearch();
    const next = new URLSearchParams(sp);
    let tab = 'overview';
    if (colId === 'yAllocation') {
      tab = 'allocations';
      next.set('year', String(Y));
    } else if (colId === 'yPlus1Allocation') {
      tab = 'allocations';
      next.set('year', String(Y + 1));
    } else if (colId === 'yMinus1Landing') {
      tab = 'budget';
      next.set('year', String(Y - 1));
    } else if (colId === 'yBudget' || colId === 'yLanding') {
      tab = 'budget';
      next.set('year', String(Y));
    } else if (colId === 'yPlus1Budget') {
      tab = 'budget';
      next.set('year', String(Y + 1));
    } else if (colId === 'latest_task_text') {
      tab = 'tasks';
    }
    return `/ops/capex/${item.id}/${tab}?${next.toString()}`;
  }, [Y, buildGridSearch]);

  const columns = useMemo(() => {
    return [
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        minWidth: 220,
        required: true,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'description')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'company_name',
        headerName: 'Company',
        width: 160,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: {
          getValues: getCapexFilterValues('company_name'),
          searchable: false,
        },
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'company_name')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'ppe_type',
        headerName: 'PP&E Type',
        width: 140,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: {
          getValues: getCapexFilterValues('ppe_type', { labelMap: PPE_LABELS }),
          searchable: false,
        },
        valueFormatter: (p: any) => {
          const raw = p?.value;
          return raw != null ? (PPE_LABELS[String(raw)] || String(raw)) : '';
        },
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'ppe_type')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'investment_type',
        headerName: 'Investment Type',
        width: 170,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: {
          getValues: getCapexFilterValues('investment_type', { labelMap: INVESTMENT_LABELS }),
          searchable: false,
        },
        valueFormatter: (p: any) => {
          const raw = p?.value;
          return raw != null ? (INVESTMENT_LABELS[String(raw)] || String(raw)) : '';
        },
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'investment_type')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'priority',
        headerName: 'Priority',
        width: 120,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: {
          getValues: getCapexFilterValues('priority', { labelMap: PRIORITY_LABELS }),
          searchable: false,
        },
        valueFormatter: (p: any) => {
          const raw = p?.value;
          return raw != null ? (PRIORITY_LABELS[String(raw)] || String(raw)) : '';
        },
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'priority')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        colId: 'yAllocation',
        headerName: 'Y Allocation',
        valueGetter: (p: any) => p.data?.allocation_method_label ?? '',
        tooltipValueGetter: (p: any) => p.data?.allocation_method_label ?? '',
        width: 180,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'yAllocation')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        colId: 'yPlus1Allocation',
        headerName: 'Y+1 Allocation',
        valueGetter: (p: any) => p.data?.next_year_allocation_method_label ?? '',
        tooltipValueGetter: (p: any) => p.data?.next_year_allocation_method_label ?? '',
        width: 200,
        defaultHidden: true,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'yPlus1Allocation')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        colId: 'yMinus1Landing',
        headerName: `Y-1 Landing (${Y - 1})`,
        valueGetter: (p: any) => p.data?.versions?.yMinus1?.reporting?.landing ?? p.data?.versions?.yMinus1?.totals?.landing ?? 0,
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 170,
        defaultHidden: true,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'yMinus1Landing')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        colId: 'yBudget',
        headerName: `Y Budget (${Y})`,
        valueGetter: (p: any) => p.data?.versions?.y?.reporting?.budget ?? p.data?.versions?.y?.totals?.budget ?? 0,
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 160,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'yBudget')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        colId: 'yLanding',
        headerName: `Y Landing (${Y})`,
        valueGetter: (p: any) => p.data?.versions?.y?.reporting?.landing ?? p.data?.versions?.y?.totals?.landing ?? 0,
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 160,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'yLanding')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        colId: 'yPlus1Budget',
        headerName: `Y+1 Budget (${Y + 1})`,
        valueGetter: (p: any) => p.data?.versions?.yPlus1?.reporting?.budget ?? p.data?.versions?.yPlus1?.totals?.budget ?? 0,
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 180,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'yPlus1Budget')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'currency',
        headerName: 'Currency',
        width: 110,
        defaultHidden: true,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: {
          getValues: getCapexFilterValues('currency'),
          searchable: false,
        },
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'currency')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'effective_start',
        headerName: 'Start',
        width: 120,
        defaultHidden: true,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'effective_start')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'effective_end',
        headerName: 'End',
        width: 120,
        defaultHidden: true,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'effective_end')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'notes',
        headerName: 'Notes',
        flex: 1,
        minWidth: 200,
        defaultHidden: true,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'notes')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        colId: 'latest_task_text',
        headerName: 'Task',
        valueGetter: (p: any) => p.data?.latest_task?.title ?? '',
        tooltipValueGetter: (p: any) => (p.value ? String(p.value) : ''),
        flex: 1,
        minWidth: 220,
        defaultHidden: true,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'latest_task_text')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Enabled',
        width: 140,
        filter: 'agSetColumnFilter',
        filterParams: { values: STATUS_VALUES, suppressMiniFilter: true },
        defaultHidden: true,
        cellRenderer: (params: any) => (
          <LinkCellRenderer
            {...params}
            linkType="internal"
            getHref={(row) => getCapexHref(row, 'status')}
            onNavigate={(href) => navigate(href)}
          />
        ),
      },
    ];
  }, [Y, getCapexFilterValues, getCapexHref, INVESTMENT_LABELS, PPE_LABELS, PRIORITY_LABELS, navigate, reportingCurrency]);

  const canCreate = hasLevel('capex','manager');
  const canAdmin = hasLevel('capex','admin');

  const actions = (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {canCreate && (
        <Button
          variant="contained"
          onClick={() => {
            const urlParams = new URLSearchParams(window.location.search);
            const stored = storedContextRef.current || readStoredCapexListContext();
            if (stored && !storedContextRef.current) storedContextRef.current = stored;
            const sort = urlParams.get('sort') || stored?.sort || 'yBudget:DESC';
            const q = urlParams.get('q') || stored?.q || '';
            const filters = urlParams.get('filters') || stored?.filters || '';
            const sp = new URLSearchParams();
            if (sort) sp.set('sort', sort);
            if (q) sp.set('q', q);
            if (filters) sp.set('filters', filters);
            navigate(`/ops/capex/new?${sp.toString()}`);
          }}
        >New</Button>
      )}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>Import CSV</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>Export CSV</Button>}
      {canAdmin && (
        <DeleteSelectedButton
          selectedRows={selectedRows}
          endpoint="/capex-items/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.description}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </Stack>
  );

  return (
    <>
      <PageHeader title={`CAPEX (${reportingCurrency})`} actions={actions} />
      <ServerDataGrid<SummaryRow>
        columns={columns as any}
        endpoint="/capex-items/summary"
        queryKey="capex-summary"
        getRowId={(r) => r.id}
        enableSearch
        pinnedBottomRowData={pinnedTotals}
        defaultSort={{ field: 'yBudget', direction: 'DESC' }}
        statusScopeConfig={{ defaultScope: 'enabled' }}
        columnPreferencesKey="capex-summary"
        refreshKey={refreshKey}
        onGridApiReady={(gridApi) => { gridApiRef.current = gridApi; }}
        onQueryStateChange={(state) => {
          const normalizedSort = state.sort || 'yBudget:DESC';
          const filtersObject = state.filterModel || {};
          const filtersString = filtersObject && Object.keys(filtersObject).length > 0 ? JSON.stringify(filtersObject) : '';
          const scope = state.statusScope ?? 'enabled';
          lastQueryRef.current = { sort: normalizedSort, q: state.q || '', filters: filtersObject, filtersString, statusScope: scope };
          const snapshot = { sort: normalizedSort, q: state.q || '', filters: filtersString };
          storedContextRef.current = snapshot;
          writeStoredCapexListContext(snapshot);
          updateTotals({ q: state.q || '', filterModel: filtersObject, statusScope: scope });
        }}
        enableRowSelection={canAdmin}
        onSelectionChanged={setSelectedRows}
      />

      {/* Workspace replaces modal-based edit/budget flows */}

      <CsvExportDialog open={exportOpen} onClose={() => setExportOpen(false)} endpoint="/capex-items" title="Export CAPEX" />
      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} endpoint="/capex-items" title="Import CAPEX" onImported={() => setRefreshKey((k) => k + 1)} />
    </>
  );
}
