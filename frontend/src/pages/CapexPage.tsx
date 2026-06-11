import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { formatItemRef } from '../utils/item-ref';
import { readStoredCapexListContext, writeStoredCapexListContext } from './capex/listContextStorage';
import ForbiddenPage from './ForbiddenPage';
import { STATUS_VALUES } from '../constants/status';
import { formatAmount as formatNumber } from '../i18n/formatters';
import { useLocale } from '../i18n/useLocale';
// import StatusSwitch from '../components/fields/StatusSwitch';

type SummaryRow = {
  id: string;
  item_number: number;
  description: string;
  supplier?: { id: string; name: string } | null;
  supplier_name?: string | null;
  paying_company_id?: string | null;
  paying_company_name?: string | null;
  account?: { id: string; account_number: number; account_name: string } | null;
  account_display?: string | null;
  owner_it_id?: string | null;
  owner_business_id?: string | null;
  owner_it_name?: string | null;
  owner_business_name?: string | null;
  analytics_category_id?: string | null;
  analytics_category_name?: string | null;
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
    yPlus2?: {
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

// modal-specific option lists removed

export default function CapexPage() {
  const { hasLevel } = useAuth();
  const { t } = useTranslation(["ops", "common"]);
  const locale = useLocale();

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
    const emptyLabel = opts?.emptyLabel ?? t('shared.blank');
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
  }, [t]);

  const PPE_LABELS: Record<string, string> = useMemo(() => ({
    hardware: t('capex.ppeTypes.hardware'),
    software: t('capex.ppeTypes.software'),
  }), [t]);

  const INVESTMENT_LABELS: Record<string, string> = useMemo(() => ({
    replacement: t('capex.investmentTypes.replacement'),
    capacity: t('capex.investmentTypes.capacity'),
    productivity: t('capex.investmentTypes.productivity'),
    security: t('capex.investmentTypes.security'),
    conformity: t('capex.investmentTypes.conformity'),
    business_growth: t('capex.investmentTypes.business_growth'),
    other: t('capex.investmentTypes.other'),
  }), [t]);

  const PRIORITY_LABELS: Record<string, string> = useMemo(() => ({
    mandatory: t('capex.priorityTypes.mandatory'),
    high: t('capex.priorityTypes.high'),
    medium: t('capex.priorityTypes.medium'),
    low: t('capex.priorityTypes.low'),
  }), [t]);

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
      const res = await api.get('/capex-items/summary/totals', { params });
      const totals = res.data || {};
      const rc = typeof totals.reportingCurrency === 'string' ? totals.reportingCurrency : 'EUR';
      setReportingCurrency(rc);
      const pinned = {
        description: t('shared.total'),
        versions: {
          yMinus1: {
            reporting: {
              budget: Number(totals.yMinus1Budget || 0),
              landing: Number(totals.yMinus1Landing || 0),
              revision: 0,
              follow_up: 0,
            },
            totals: {
              budget: Number(totals.yMinus1Budget || 0),
              landing: Number(totals.yMinus1Landing || 0),
              revision: 0,
              follow_up: 0,
            },
          },
          y: {
            reporting: {
              budget: Number(totals.yBudget || 0),
              revision: Number(totals.yRevision || 0),
              follow_up: Number(totals.yFollowUp || 0),
              landing: Number(totals.yLanding || 0),
            },
            totals: {
              budget: Number(totals.yBudget || 0),
              revision: Number(totals.yRevision || 0),
              follow_up: Number(totals.yFollowUp || 0),
              landing: Number(totals.yLanding || 0),
            },
          },
          yPlus1: {
            reporting: {
              budget: Number(totals.yPlus1Budget || 0),
              revision: Number(totals.yPlus1Revision || 0),
              landing: 0,
              follow_up: 0,
            },
            totals: {
              budget: Number(totals.yPlus1Budget || 0),
              revision: Number(totals.yPlus1Revision || 0),
              landing: 0,
              follow_up: 0,
            },
          },
          yPlus2: {
            reporting: {
              budget: Number(totals.yPlus2Budget || 0),
              revision: 0,
              landing: 0,
              follow_up: 0,
            },
            totals: {
              budget: Number(totals.yPlus2Budget || 0),
              revision: 0,
              landing: 0,
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
    if (colId === 'allocation_label') {
      tab = 'allocations';
      next.set('year', String(Y));
    } else if (colId === 'yMinus1Budget' || colId === 'yMinus1Landing') {
      tab = 'budget';
      next.set('year', String(Y - 1));
    } else if (colId === 'yBudget' || colId === 'yRevision' || colId === 'yFollowUp' || colId === 'yLanding') {
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
    const ref = item.item_number != null ? formatItemRef('capex', item.item_number) : item.id;
    return `/ops/capex/${ref}/${tab}?${next.toString()}`;
  }, [Y, buildGridSearch]);

  const columns = useMemo(() => {
    const linkCell = (colId: string) => (params: any) => (
      <LinkCellRenderer
        {...params}
        linkType="internal"
        getHref={(row) => getCapexHref(row, colId)}
        onNavigate={(href) => navigate(href)}
      />
    );
    const moneyGetter = (slot: 'yMinus1' | 'y' | 'yPlus1' | 'yPlus2', metric: 'budget' | 'revision' | 'follow_up' | 'landing') =>
      (p: any) => p.data?.versions?.[slot]?.reporting?.[metric] ?? p.data?.versions?.[slot]?.totals?.[metric] ?? 0;
    const accountGetter = (p: any) => {
      const d: any = p.data || {};
      const a = d?.account;
      if (a && (a.account_number != null || a.account_name != null)) {
        return [a.account_number != null ? String(a.account_number) : '', a.account_name != null ? String(a.account_name) : ''].filter(Boolean).join(' - ');
      }
      return d.account_display || '';
    };
    return [
      {
        colId: 'item_number',
        headerName: t('capex.columns.reference', 'Ref'),
        width: 96,
        valueGetter: (p: any) => (p.data?.item_number != null ? formatItemRef('capex', p.data.item_number) : ''),
        cellStyle: {
          color: 'var(--kanap-text-secondary)',
          fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
          fontVariantNumeric: 'tabular-nums',
          fontSize: '12px',
        },
        cellRenderer: linkCell('description'),
      },
      {
        field: 'description',
        headerName: t('capex.columns.description'),
        flex: 1,
        minWidth: 220,
        required: true,
        cellRenderer: linkCell('description'),
      },
      {
        colId: 'supplier_name',
        headerName: t('capex.columns.supplier'),
        valueGetter: (p: any) => p.data?.supplier?.name ?? p.data?.supplier_name ?? '',
        width: 180,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('supplier_name'), searchable: false },
        cellRenderer: linkCell('supplier_name'),
      },
      {
        field: 'paying_company_name',
        headerName: t('capex.columns.payingCompany'),
        width: 200,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('paying_company_name'), searchable: false },
        cellRenderer: linkCell('paying_company_name'),
      },
      {
        colId: 'account_display',
        headerName: t('capex.columns.account'),
        valueGetter: accountGetter,
        width: 220,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('account_display'), searchable: false },
        cellRenderer: linkCell('account_display'),
      },
      {
        field: 'ppe_type',
        headerName: t('capex.columns.ppeType'),
        width: 140,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('ppe_type', { labelMap: PPE_LABELS }), searchable: false },
        valueFormatter: (p: any) => p.value != null ? (PPE_LABELS[String(p.value)] || String(p.value)) : '',
        cellRenderer: linkCell('ppe_type'),
      },
      {
        field: 'investment_type',
        headerName: t('capex.columns.investmentType'),
        width: 170,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('investment_type', { labelMap: INVESTMENT_LABELS }), searchable: false },
        valueFormatter: (p: any) => p.value != null ? (INVESTMENT_LABELS[String(p.value)] || String(p.value)) : '',
        cellRenderer: linkCell('investment_type'),
      },
      {
        field: 'priority',
        headerName: t('capex.columns.priority'),
        width: 120,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('priority', { labelMap: PRIORITY_LABELS }), searchable: false },
        valueFormatter: (p: any) => p.value != null ? (PRIORITY_LABELS[String(p.value)] || String(p.value)) : '',
        cellRenderer: linkCell('priority'),
      },
      {
        colId: 'allocation_label',
        headerName: t('capex.columns.allocation'),
        valueGetter: (p: any) => p.data?.allocation_method_label ?? '',
        tooltipValueGetter: (p: any) => p.data?.allocation_method_label ?? '',
        width: 180,
        cellRenderer: linkCell('allocation_label'),
      },
      {
        colId: 'yMinus1Budget',
        headerName: t('capex.columns.yMinus1Budget', { year: Y - 1 }),
        valueGetter: moneyGetter('yMinus1', 'budget'),
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 170,
        defaultHidden: true,
        cellRenderer: linkCell('yMinus1Budget'),
      },
      {
        colId: 'yMinus1Landing',
        headerName: t('capex.columns.yMinus1Landing', { year: Y - 1 }),
        valueGetter: moneyGetter('yMinus1', 'landing'),
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 170,
        defaultHidden: true,
        cellRenderer: linkCell('yMinus1Landing'),
      },
      {
        colId: 'yBudget',
        headerName: t('capex.columns.yBudget', { year: Y }),
        valueGetter: moneyGetter('y', 'budget'),
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 160,
        cellRenderer: linkCell('yBudget'),
      },
      {
        colId: 'yRevision',
        headerName: t('capex.columns.yRevision', { year: Y }),
        valueGetter: moneyGetter('y', 'revision'),
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 160,
        defaultHidden: true,
        cellRenderer: linkCell('yRevision'),
      },
      {
        colId: 'yFollowUp',
        headerName: t('capex.columns.yFollowUp', { year: Y }),
        valueGetter: moneyGetter('y', 'follow_up'),
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 170,
        defaultHidden: true,
        cellRenderer: linkCell('yFollowUp'),
      },
      {
        colId: 'yLanding',
        headerName: t('capex.columns.yLanding', { year: Y }),
        valueGetter: moneyGetter('y', 'landing'),
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 160,
        cellRenderer: linkCell('yLanding'),
      },
      {
        colId: 'yPlus1Budget',
        headerName: t('capex.columns.yPlus1Budget', { year: Y + 1 }),
        valueGetter: moneyGetter('yPlus1', 'budget'),
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 180,
        defaultHidden: true,
        cellRenderer: linkCell('yPlus1Budget'),
      },
      {
        colId: 'yPlus1Revision',
        headerName: t('capex.columns.yPlus1Revision', { year: Y + 1 }),
        valueGetter: moneyGetter('yPlus1', 'revision'),
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 190,
        defaultHidden: true,
        cellRenderer: linkCell('yPlus1Revision'),
      },
      {
        colId: 'yPlus2Budget',
        headerName: t('capex.columns.yPlus2Budget', { year: Y + 2 }),
        valueGetter: moneyGetter('yPlus2', 'budget'),
        valueFormatter: (p: any) => formatNumber(p.value),
        type: 'rightAligned',
        width: 180,
        defaultHidden: true,
        cellRenderer: linkCell('yPlus2Budget'),
      },
      {
        field: 'currency',
        headerName: t('capex.columns.currency'),
        width: 110,
        defaultHidden: true,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('currency'), searchable: false },
        cellRenderer: linkCell('currency'),
      },
      {
        field: 'effective_start',
        headerName: t('capex.columns.effectiveStart'),
        width: 150,
        defaultHidden: true,
        valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleDateString(locale) : ''),
        cellRenderer: linkCell('effective_start'),
      },
      {
        field: 'effective_end',
        headerName: t('capex.columns.effectiveEnd'),
        width: 150,
        defaultHidden: true,
        valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleDateString(locale) : ''),
        cellRenderer: linkCell('effective_end'),
      },
      {
        colId: 'owner_it_name',
        headerName: t('capex.columns.itOwner'),
        valueGetter: (p: any) => p.data?.owner_it_name ?? '',
        width: 200,
        defaultHidden: true,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('owner_it_name'), searchable: false },
        cellRenderer: linkCell('owner_it_name'),
      },
      {
        colId: 'owner_business_name',
        headerName: t('capex.columns.businessOwner'),
        valueGetter: (p: any) => p.data?.owner_business_name ?? '',
        width: 200,
        defaultHidden: true,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('owner_business_name'), searchable: false },
        cellRenderer: linkCell('owner_business_name'),
      },
      {
        field: 'analytics_category_name',
        headerName: t('capex.columns.analytics'),
        width: 200,
        defaultHidden: true,
        filter: CheckboxSetFilter,
        floatingFilterComponent: CheckboxSetFloatingFilter,
        filterParams: { getValues: getCapexFilterValues('analytics_category_name'), searchable: false },
        cellRenderer: linkCell('analytics_category_name'),
      },
      {
        field: 'notes',
        headerName: t('capex.columns.notes'),
        width: 250,
        defaultHidden: true,
        cellRenderer: linkCell('notes'),
      },
      {
        colId: 'latest_task_text',
        headerName: t('capex.columns.task'),
        valueGetter: (p: any) => p.data?.latest_task?.title ?? '',
        tooltipValueGetter: (p: any) => (p.value ? String(p.value) : ''),
        flex: 1,
        minWidth: 220,
        defaultHidden: true,
        cellRenderer: linkCell('latest_task_text'),
      },
      {
        field: 'status',
        headerName: t('capex.columns.enabled'),
        width: 140,
        filter: 'agSetColumnFilter',
        filterParams: { values: STATUS_VALUES, suppressMiniFilter: true },
        defaultHidden: true,
        cellRenderer: linkCell('status'),
      },
      {
        field: 'created_at',
        headerName: t('capex.columns.created'),
        width: 200,
        valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString(locale) : ''),
        defaultHidden: true,
        cellRenderer: linkCell('created_at'),
      },
      {
        field: 'updated_at',
        headerName: t('capex.columns.updated'),
        width: 200,
        valueFormatter: (p: any) => (p.value ? new Date(p.value as string).toLocaleString(locale) : ''),
        defaultHidden: true,
        cellRenderer: linkCell('updated_at'),
      },
    ];
  }, [Y, getCapexFilterValues, getCapexHref, INVESTMENT_LABELS, PPE_LABELS, PRIORITY_LABELS, locale, navigate, t]);

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
        >{t('capex.newButton')}</Button>
      )}
      {canAdmin && <Button onClick={() => setImportOpen(true)}>{t('capex.importCsv')}</Button>}
      {canAdmin && <Button onClick={() => setExportOpen(true)}>{t('capex.exportCsv')}</Button>}
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
      <PageHeader title={t('capex.titleWithCurrency', { currency: reportingCurrency })} actions={actions} />
      <ServerDataGrid<SummaryRow>
        columns={columns as any}
        endpoint="/capex-items/summary"
        queryKey="capex-summary"
        getRowId={(r) => r.id}
        enableSearch
        pinnedBottomRowData={pinnedTotals}
        defaultSort={{ field: 'yBudget', direction: 'DESC' }}
        extraParams={{ years: [Y - 1, Y, Y + 1, Y + 2].join(',') }}
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
      <CsvExportDialog open={exportOpen} onClose={() => setExportOpen(false)} endpoint="/capex-items" title={t("capex.exportTitle")} />
      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} endpoint="/capex-items" title={t("capex.importTitle")} onImported={() => setRefreshKey((k) => k + 1)} />
    </>
  );
}
