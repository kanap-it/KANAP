import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import ServerDataGrid, { StatusScope } from '../components/ServerDataGrid';
import { Box, Button, Stack } from '@mui/material';
import CheckboxSetFilter from '../components/CheckboxSetFilter';
import CheckboxSetFloatingFilter from '../components/CheckboxSetFloatingFilter';
import CsvExportDialog from '../components/csv/CsvExportDialog';
import CsvImportDialog from '../components/csv/CsvImportDialog';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import api from '../api';
import { useAuth } from '../auth/AuthContext';
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

  // legacy modal create/edit handlers removed

  const ClickableCell: React.FC<any> = (params) => {
    const isPinned = params.node?.rowPinned;
    return (
      <Box
        component="span"
        sx={{ cursor: isPinned ? 'default' : 'pointer', '&:hover': isPinned ? undefined : { color: 'primary.main' } }}
      >
        {params.value}
      </Box>
    );
  };
  const ClickableCellGeneric: React.FC<any> = (params) => {
    const v = params.value as any;
    const display = typeof v === 'number' ? formatNumber(v) : v ?? '';
    const isPinned = params.node?.rowPinned;
    return (
      <Box component="span" sx={{ cursor: isPinned ? 'default' : 'pointer', '&:hover': isPinned ? undefined : { color: 'primary.main' } }}>
        {display}
      </Box>
    );
  };

  const columns = useMemo(() => {
    return [
      { field: 'description', headerName: 'Description', flex: 1, minWidth: 220, required: true, cellRenderer: ClickableCell },
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
        cellRenderer: ClickableCell,
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
        cellRenderer: ClickableCell,
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
        cellRenderer: ClickableCell,
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
        cellRenderer: ClickableCell,
      },
      { colId: 'yAllocation', headerName: 'Y Allocation', valueGetter: (p: any) => p.data?.allocation_method_label ?? '', tooltipValueGetter: (p: any) => p.data?.allocation_method_label ?? '', width: 180, cellRenderer: ClickableCellGeneric },
      { colId: 'yPlus1Allocation', headerName: 'Y+1 Allocation', valueGetter: (p: any) => p.data?.next_year_allocation_method_label ?? '', tooltipValueGetter: (p: any) => p.data?.next_year_allocation_method_label ?? '', width: 200, cellRenderer: ClickableCellGeneric, defaultHidden: true },
      { colId: 'yMinus1Landing', headerName: `Y-1 Landing (${Y - 1})`, valueGetter: (p: any) => p.data?.versions?.yMinus1?.reporting?.landing ?? p.data?.versions?.yMinus1?.totals?.landing ?? 0, valueFormatter: (p: any) => formatNumber(p.value), type: 'rightAligned', width: 170, defaultHidden: true, cellRenderer: ClickableCellGeneric },
      { colId: 'yBudget', headerName: `Y Budget (${Y})`, valueGetter: (p: any) => p.data?.versions?.y?.reporting?.budget ?? p.data?.versions?.y?.totals?.budget ?? 0, valueFormatter: (p: any) => formatNumber(p.value), type: 'rightAligned', width: 160, cellRenderer: ClickableCellGeneric },
      { colId: 'yLanding', headerName: `Y Landing (${Y})`, valueGetter: (p: any) => p.data?.versions?.y?.reporting?.landing ?? p.data?.versions?.y?.totals?.landing ?? 0, valueFormatter: (p: any) => formatNumber(p.value), type: 'rightAligned', width: 160, cellRenderer: ClickableCellGeneric },
      { colId: 'yPlus1Budget', headerName: `Y+1 Budget (${Y + 1})`, valueGetter: (p: any) => p.data?.versions?.yPlus1?.reporting?.budget ?? p.data?.versions?.yPlus1?.totals?.budget ?? 0, valueFormatter: (p: any) => formatNumber(p.value), type: 'rightAligned', width: 180, cellRenderer: ClickableCellGeneric },
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
        cellRenderer: ClickableCellGeneric,
      },
      { field: 'effective_start', headerName: 'Start', width: 120, defaultHidden: true, cellRenderer: ClickableCellGeneric },
      { field: 'effective_end', headerName: 'End', width: 120, defaultHidden: true, cellRenderer: ClickableCellGeneric },
      { field: 'notes', headerName: 'Notes', flex: 1, minWidth: 200, defaultHidden: true, cellRenderer: ClickableCellGeneric },
      { colId: 'latest_task_text', headerName: 'Task', valueGetter: (p: any) => p.data?.latest_task?.title ?? '', tooltipValueGetter: (p: any) => (p.value ? String(p.value) : ''), flex: 1, minWidth: 220, defaultHidden: true, cellRenderer: ClickableCellGeneric },
      { field: 'status', headerName: 'Enabled', width: 140, filter: 'agSetColumnFilter', filterParams: { values: STATUS_VALUES, suppressMiniFilter: true }, cellRenderer: ClickableCellGeneric, defaultHidden: true },
    ];
  }, [Y, getCapexFilterValues, INVESTMENT_LABELS, PPE_LABELS, PRIORITY_LABELS, reportingCurrency]);

  const onCellClicked = useCallback((params: any) => {
    const colId = params?.column?.getColId?.() || params?.colDef?.colId || params?.colDef?.field;
    const row: SummaryRow = params?.data;
    if (!row) return;

    const urlParams = new URLSearchParams(window.location.search);
    const stored = storedContextRef.current || readStoredCapexListContext();
    if (stored && !storedContextRef.current) storedContextRef.current = stored;
    const fallbackSort = lastQueryRef.current?.sort || urlParams.get('sort') || stored?.sort || 'yBudget:DESC';
    // Capture the live grid sort to avoid relying on stale query state when navigating to the workspace
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
    const snapshot = { sort, q, filters };
    storedContextRef.current = snapshot;
    writeStoredCapexListContext(snapshot);

    const go = (tab: string, year?: number) => {
      const s = new URLSearchParams(sp);
      if (year) s.set('year', String(year));
      navigate(`/ops/capex/${row.id}/${tab}?${s.toString()}`);
    };

    if (colId === 'yAllocation') return go('allocations', Y);
    if (colId === 'yPlus1Allocation') return go('allocations', Y + 1);
    if (colId === 'yMinus1Landing') return go('budget', Y - 1);
    if (colId === 'yBudget') return go('budget', Y);
    if (colId === 'yLanding') return go('budget', Y);
    if (colId === 'yPlus1Budget') return go('budget', Y + 1);
    if (colId === 'latest_task_text') return go('tasks');
    return go('overview');
  }, [Y, navigate]);

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
        onCellClicked={onCellClicked}
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
