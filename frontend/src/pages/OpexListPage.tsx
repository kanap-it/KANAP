import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ColDef } from 'ag-grid-community';
import ServerDataGrid, { StatusScope } from '../components/ServerDataGrid';
import PageHeader from '../components/PageHeader';
import { Button, Stack } from '@mui/material';
import CheckboxSetFilter from '../components/CheckboxSetFilter';
import CheckboxSetFloatingFilter from '../components/CheckboxSetFloatingFilter';
import api from '../api';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import CsvExportDialog from '../components/csv/CsvExportDialog';
import CsvImportDialog from '../components/csv/CsvImportDialog';
import DeleteSelectedButton from '../components/DeleteSelectedButton';
import { LinkCellRenderer } from '../components/grid/renderers';
import { readStoredOpexListContext, writeStoredOpexListContext } from './opex/listContextStorage';
import { STATUS_VALUES } from '../constants/status';
import ForbiddenPage from './ForbiddenPage';

type SummaryRow = {
  id: string;
  product_name: string;
  description?: string | null;
  supplier?: { id: string; name: string } | null;
  account?: { id: string; account_number: number; account_name: string } | null;
  currency: string;
  effective_start: string;
  effective_end?: string | null;
  status: string;
  owner_it_id?: string | null;
  owner_business_id?: string | null;
  analytics_category_id?: string | null;
  analytics_category_name?: string | null;
  project_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  main_recipient?: { company_id: string; department_id: string; pct: number; label: string } | null;
  versions?: {
    yMinus1?: { year?: number; totals: { budget: number; follow_up: number; landing: number; revision: number }; reporting?: { budget: number; follow_up: number; landing: number; revision: number }; version_id?: string };
    y?: { year?: number; totals: { budget: number; follow_up: number; landing: number; revision: number }; reporting?: { budget: number; follow_up: number; landing: number; revision: number }; version_id?: string };
    yPlus1?: { year?: number; totals: { budget: number; follow_up: number; landing: number; revision: number }; reporting?: { budget: number; follow_up: number; landing: number; revision: number }; version_id?: string };
    yPlus2?: { year?: number; totals: { budget: number; follow_up: number; landing: number; revision: number }; reporting?: { budget: number; follow_up: number; landing: number; revision: number }; version_id?: string };
  };
  latest_task?: { id: string; title?: string; description?: string; status?: string; created_at?: string } | null;
  spread_mode_for_y?: 'flat' | 'manual' | null;
  latest_contract_name?: string | null;
  allocation_method_label?: string | null;
  allocation_warning?: string | null;
  paying_company_id?: string | null;
  paying_company_name?: string | null;
  account_display?: string | null;
  owner_it_name?: string | null;
  owner_business_name?: string | null;
};

type LookupUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
};

function formatNumber(v: any) {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return '';
  const i = Math.round(n);
  return i.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default function OpexListPage() {
  const { hasLevel } = useAuth();

  if (!hasLevel('opex', 'reader')) {
    return <ForbiddenPage />;
  }

  const navigate = useNavigate();
  const location = useLocation();
  const Y = new Date().getFullYear();

  const { data: usersEnabled } = useQuery<LookupUser[]>({
    queryKey: ['users', 'enabled', 'lookup'],
    queryFn: async () => {
      const res = await api.get<{ items: LookupUser[] }>('/users', { params: { status: 'enabled', limit: 1000 } });
      return res.data.items;
    },
  });
  const userNameById = useMemo(() => {
    const m = new Map<string, string>();
    (usersEnabled ?? []).forEach((u: LookupUser) => {
      const fn = (u.first_name || '').trim();
      const ln = (u.last_name || '').trim();
      const name = [fn, ln].filter(Boolean).join(' ');
      m.set(u.id, name || u.email);
    });
    return m;
  }, [usersEnabled]);

  const getOpexFilterValues = useCallback((field: string, opts?: { emptyLabel?: string }) => {
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
      if (Object.keys(filters).length > 0) params.filters = JSON.stringify(filters);
      const statusScope = queryState.statusScope;
      if (statusScope === 'enabled' || statusScope === 'disabled') {
        params.status = statusScope;
      } else if (statusScope === 'all') {
        params.includeDisabled = '1';
      }
      const res = await api.get('/spend-items/summary/filter-values', { params });
      const values = (res.data?.[field] || []) as Array<string | null>;
      const options = values.map((value) => {
        if (value == null) return { value, label: emptyLabel };
        return { value, label: String(value) };
      });
      options.sort((a, b) => {
        if (a.value == null) return 1;
        if (b.value == null) return -1;
        return (a.label || '').localeCompare(b.label || '');
      });
      return options;
    };
  }, []);

  const gridApiRef = useRef<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<SummaryRow[]>([]);
  const lastQueryRef = useRef<{ sort: string; q: string; filters: any; filtersString: string; statusScope?: StatusScope } | null>(null);
  const storedContextRef = useRef(readStoredOpexListContext());
  const [pinnedTotals, setPinnedTotals] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = storedContextRef.current || readStoredOpexListContext();
    if (stored && !storedContextRef.current) {
      storedContextRef.current = stored;
    }
    if (!stored) return;

    const currentParams = new URLSearchParams(location.search);
    const currentSort = currentParams.get('sort') || '';
    const currentQ = currentParams.get('q') || '';
    const currentFilters = currentParams.get('filters') || '';

    const shouldApplySort = !!stored.sort && !currentSort;
    const shouldApplyQ = !!stored.q && !currentQ;
    const shouldApplyFilters = !!stored.filters && !currentFilters;

    if (!shouldApplySort && !shouldApplyQ && !shouldApplyFilters) return;

    const newParams = new URLSearchParams(location.search);
    if (shouldApplySort) newParams.set('sort', stored.sort);
    if (shouldApplyQ) newParams.set('q', stored.q);
    if (shouldApplyFilters) newParams.set('filters', stored.filters);

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
      const res = await api.get('/spend-items/summary/totals', { params });
      const totals = res.data || {};
      const pinned = {
        product_name: 'Total',
        versions: {
          yMinus1: {
            totals: {
              budget: Number(totals.yMinus1Budget || 0),
              landing: Number(totals.yMinus1Landing || 0),
            },
          },
          y: {
            totals: {
              budget: Number(totals.yBudget || 0),
              revision: Number(totals.yRevision || 0),
              follow_up: Number(totals.yFollowUp || 0),
              landing: Number(totals.yLanding || 0),
            },
          },
          yPlus1: {
            totals: {
              budget: Number(totals.yPlus1Budget || 0),
              revision: Number(totals.yPlus1Revision || 0),
            },
          },
          yPlus2: {
            totals: {
              budget: Number(totals.yPlus2Budget || 0),
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
    const stored = storedContextRef.current || readStoredOpexListContext();
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

  const canCreate = hasLevel('opex', 'manager');
  const canAdmin = hasLevel('opex', 'admin');
  const actions = (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {canCreate && (
        <Button
          variant="contained"
          onClick={() => {
            const urlParams = new URLSearchParams(window.location.search);
            const stored = storedContextRef.current || readStoredOpexListContext();
            if (stored && !storedContextRef.current) storedContextRef.current = stored;
            const sort = urlParams.get('sort') || stored?.sort || 'yBudget:DESC';
            const q = urlParams.get('q') || stored?.q || '';
            const filters = urlParams.get('filters') || stored?.filters || '';
            const sp = new URLSearchParams();
            if (sort) sp.set('sort', sort);
            if (q) sp.set('q', q);
            if (filters) sp.set('filters', filters);
            navigate(`/ops/opex/new?${sp.toString()}`);
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
          endpoint="/spend-items/bulk"
          getItemId={(row) => row.id}
          getItemName={(row) => row.product_name}
          gridApi={gridApiRef.current}
          onDeleteSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </Stack>
  );

  const buildGridSearch = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stored = storedContextRef.current || readStoredOpexListContext();
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

  const getOpexHref = useCallback((row: unknown, colId?: string) => {
    const item = row as SummaryRow | null | undefined;
    if (!item?.id) return null;
    if (colId === 'contract_name') {
      const contractId = (item as any)?.latest_contract_id;
      return contractId ? `/ops/contracts/${contractId}/overview` : null;
    }
    const sp = buildGridSearch();
    const next = new URLSearchParams(sp);
    let tab = 'overview';
    if (colId === 'allocation_label') {
      tab = 'allocations';
      next.set('year', String(Y));
    } else if (colId === 'yMinus1Budget' || colId === 'yMinus1Landing') {
      tab = 'budget';
      next.set('year', String(Y - 1));
    } else if (colId === 'yBudget' || colId === 'yRevision' || colId === 'yFollowUp' || colId === 'yLanding' || colId === 'spread_mode_for_y') {
      tab = 'budget';
      next.set('year', String(Y));
    } else if (colId === 'yPlus1Budget' || colId === 'yPlus1Revision') {
      tab = 'budget';
      next.set('year', String(Y + 1));
    } else if (colId === 'yPlus2Budget') {
      tab = 'budget';
      next.set('year', String(Y + 2));
    } else if (colId === 'latest_task_text') {
      tab = 'tasks';
    }
    return `/ops/opex/${item.id}/${tab}?${next.toString()}`;
  }, [Y, buildGridSearch]);

  const columns: ColDef<SummaryRow>[] = useMemo(() => [
    {
      field: 'product_name',
      headerName: 'Product Name',
      flex: 1,
      minWidth: 220,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'product_name')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      colId: 'supplier_name',
      headerName: 'Supplier',
      valueGetter: (p) => {
        const d: any = p.data || {};
        return d?.supplier?.name ?? d?.supplier_name ?? d?.supplier ?? '';
      },
      width: 180,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'supplier_name')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      field: 'paying_company_name',
      headerName: 'Paying Company',
      width: 200,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getOpexFilterValues('paying_company_name'),
        searchable: false,
      },
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'paying_company_name')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      colId: 'contract_name',
      headerName: 'Contract',
      valueGetter: (p) => p.data?.latest_contract_name || '',
      width: 200,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'contract_name')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      colId: 'account_display',
      headerName: 'Account',
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getOpexFilterValues('account_display'),
        searchable: false,
      },
      valueGetter: (p) => {
        const d: any = p.data || {};
        const a = d?.account;
        if (a && (a.account_number != null || a.account_name != null)) {
          const num = a.account_number != null ? String(a.account_number) : '';
          const name = a.account_name != null ? String(a.account_name) : '';
          return [num, name].filter(Boolean).join(' - ');
        }
        if (typeof d?.account_display === 'string') return d.account_display;
        if (typeof d?.account === 'string') return d.account;
        if (d?.account_number != null || d?.account_name != null) {
          const num = d.account_number != null ? String(d.account_number) : '';
          const name = d.account_name != null ? String(d.account_name) : '';
          return [num, name].filter(Boolean).join(' - ');
        }
        return '';
      },
      width: 220,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'account_display')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      colId: 'allocation_label',
      headerName: 'Allocation',
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getOpexFilterValues('allocation_label'),
        searchable: false,
      },
      valueGetter: (p) => p.data?.allocation_method_label ?? '',
      tooltipValueGetter: (p) => p.data?.allocation_method_label ?? '',
      width: 180,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'allocation_label')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      colId: 'yMinus1Budget',
      headerName: `Y-1 Budget (${Y - 1})`,
      valueGetter: (p) => p.data?.versions?.yMinus1?.reporting?.budget ?? p.data?.versions?.yMinus1?.totals?.budget ?? 0,
      valueFormatter: (p) => formatNumber(p.value),
      type: 'rightAligned',
      width: 170,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'yMinus1Budget')}
          onNavigate={(href) => navigate(href)}
        />
      ),
      defaultHidden: true,
    },
    {
      colId: 'yMinus1Landing',
      headerName: `Y-1 Landing (${Y - 1})`,
      valueGetter: (p) => p.data?.versions?.yMinus1?.reporting?.landing ?? p.data?.versions?.yMinus1?.totals?.landing ?? 0,
      valueFormatter: (p) => formatNumber(p.value),
      type: 'rightAligned',
      width: 170,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'yMinus1Landing')}
          onNavigate={(href) => navigate(href)}
        />
      ),
      defaultHidden: true,
    },
    {
      colId: 'yBudget',
      headerName: `Y Budget (${Y})`,
      valueGetter: (p) => p.data?.versions?.y?.reporting?.budget ?? p.data?.versions?.y?.totals?.budget ?? 0,
      valueFormatter: (p) => formatNumber(p.value),
      type: 'rightAligned',
      width: 160,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'yBudget')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      colId: 'yRevision',
      headerName: `Y Revision (${Y})`,
      valueGetter: (p) => p.data?.versions?.y?.reporting?.revision ?? p.data?.versions?.y?.totals?.revision ?? 0,
      valueFormatter: (p) => formatNumber(p.value),
      type: 'rightAligned',
      width: 160,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'yRevision')}
          onNavigate={(href) => navigate(href)}
        />
      ),
      defaultHidden: true,
    },
    {
      colId: 'yFollowUp',
      headerName: `Y Follow-up (${Y})`,
      valueGetter: (p) => p.data?.versions?.y?.reporting?.follow_up ?? p.data?.versions?.y?.totals?.follow_up ?? 0,
      valueFormatter: (p) => formatNumber(p.value),
      type: 'rightAligned',
      width: 170,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'yFollowUp')}
          onNavigate={(href) => navigate(href)}
        />
      ),
      defaultHidden: true,
    },
    {
      colId: 'yLanding',
      headerName: `Y Landing (${Y})`,
      valueGetter: (p) => p.data?.versions?.y?.reporting?.landing ?? p.data?.versions?.y?.totals?.landing ?? 0,
      valueFormatter: (p) => formatNumber(p.value),
      type: 'rightAligned',
      width: 160,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'yLanding')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      colId: 'yPlus1Budget',
      headerName: `Y+1 Budget (${Y + 1})`,
      valueGetter: (p) => p.data?.versions?.yPlus1?.reporting?.budget ?? p.data?.versions?.yPlus1?.totals?.budget ?? 0,
      valueFormatter: (p) => formatNumber(p.value),
      type: 'rightAligned',
      width: 180,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'yPlus1Budget')}
          onNavigate={(href) => navigate(href)}
        />
      ),
      defaultHidden: true,
    },
    {
      colId: 'yPlus1Revision',
      headerName: `Y+1 Revision (${Y + 1})`,
      valueGetter: (p) => p.data?.versions?.yPlus1?.reporting?.revision ?? p.data?.versions?.yPlus1?.totals?.revision ?? 0,
      valueFormatter: (p) => formatNumber(p.value),
      type: 'rightAligned',
      width: 190,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'yPlus1Revision')}
          onNavigate={(href) => navigate(href)}
        />
      ),
      defaultHidden: true,
    },
    {
      colId: 'yPlus2Budget',
      headerName: `Y+2 Budget (${Y + 2})`,
      valueGetter: (p) => p.data?.versions?.yPlus2?.totals?.budget ?? 0,
      valueFormatter: (p) => formatNumber(p.value),
      type: 'rightAligned',
      width: 180,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'yPlus2Budget')}
          onNavigate={(href) => navigate(href)}
        />
      ),
      defaultHidden: true,
    },
    {
      colId: 'latest_task_text',
      headerName: 'Task',
      valueGetter: (p) => p.data?.latest_task?.title ?? '',
      tooltipValueGetter: (p) => (p.value ? String(p.value) : ''),
      flex: 1,
      minWidth: 220,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'latest_task_text')}
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
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'status')}
          onNavigate={(href) => navigate(href)}
        />
      ),
      defaultHidden: true,
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 250,
      defaultHidden: true,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'description')}
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
        getValues: getOpexFilterValues('currency'),
        searchable: false,
      },
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'currency')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      field: 'effective_start',
      headerName: 'Effective Start',
      width: 150,
      defaultHidden: true,
      valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleDateString() : ''),
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'effective_start')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      field: 'effective_end',
      headerName: 'Effective End',
      width: 150,
      defaultHidden: true,
      valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleDateString() : ''),
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'effective_end')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      colId: 'owner_it_name',
      headerName: 'IT Owner',
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getOpexFilterValues('owner_it_name'),
        searchable: false,
      },
      valueGetter: (p) => p.data?.owner_it_name ?? (p.data?.owner_it_id ? userNameById.get(p.data.owner_it_id) || '' : ''),
      width: 200,
      defaultHidden: true,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'owner_it_name')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      colId: 'owner_business_name',
      headerName: 'Business Owner',
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getOpexFilterValues('owner_business_name'),
        searchable: false,
      },
      valueGetter: (p) => p.data?.owner_business_name ?? (p.data?.owner_business_id ? userNameById.get(p.data.owner_business_id) || '' : ''),
      width: 200,
      defaultHidden: true,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'owner_business_name')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      field: 'analytics_category_name',
      headerName: 'Analytics',
      width: 200,
      defaultHidden: true,
      filter: CheckboxSetFilter,
      floatingFilterComponent: CheckboxSetFloatingFilter,
      filterParams: {
        getValues: getOpexFilterValues('analytics_category_name'),
        searchable: false,
      },
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'analytics_category_name')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      field: 'project_id',
      headerName: 'Project ID',
      width: 150,
      defaultHidden: true,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'project_id')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      field: 'notes',
      headerName: 'Notes',
      width: 250,
      defaultHidden: true,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'notes')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 200,
      valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleString() : ''),
      defaultHidden: true,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'created_at')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
    {
      field: 'updated_at',
      headerName: 'Updated',
      width: 200,
      valueFormatter: (p) => (p.value ? new Date(p.value as string).toLocaleString() : ''),
      defaultHidden: true,
      cellRenderer: (params: any) => (
        <LinkCellRenderer
          {...params}
          linkType="internal"
          getHref={(row) => getOpexHref(row, 'updated_at')}
          onNavigate={(href) => navigate(href)}
        />
      ),
    },
  ], [Y, getOpexFilterValues, getOpexHref, navigate, userNameById]);

  return (
    <>
      <PageHeader title="OPEX" actions={actions} />
      <ServerDataGrid<SummaryRow>
        columns={columns}
        endpoint="/spend-items/summary"
        queryKey="spend-items-summary"
        getRowId={(r) => r.id}
        enableSearch
        pinnedBottomRowData={pinnedTotals}
        defaultSort={{ field: 'yBudget', direction: 'DESC' }}
        extraParams={{ years: [Y - 1, Y, Y + 1, Y + 2].join(',') }}
        statusScopeConfig={{ defaultScope: 'enabled' }}
        columnPreferencesKey="opex-summary"
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
          writeStoredOpexListContext(snapshot);
          updateTotals({ q: state.q || '', filterModel: filtersObject, statusScope: scope });
        }}
        enableRowSelection={canAdmin}
        onSelectionChanged={setSelectedRows}
      />
      <CsvExportDialog open={exportOpen} onClose={() => setExportOpen(false)} endpoint="/spend-items" title="Export OPEX" />
      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} endpoint="/spend-items" title="Import OPEX" onImported={() => setRefreshKey((k) => k + 1)} />
    </>
  );
}
