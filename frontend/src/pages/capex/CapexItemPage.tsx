import React from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { useCapexNav } from '../../hooks/useCapexNav';
import useAutosave from '../../hooks/useAutosave';
import { formatItemRef } from '../../utils/item-ref';
import {
  StatusValue,
  deriveStatusFromDisabledAt,
  normalizeDisabledAtInput,
} from '../../constants/status';
import PortfolioDetailWorkspaceShell from '../portfolio/workspace/PortfolioDetailWorkspaceShell';
import SendLinkButton from '../../components/workspace/SendLinkButton';
import CapexMetadataBar, { CapexPriority } from './workspace/CapexMetadataBar';
import CapexPropertiesDrawer, { CapexInvestmentType, CapexPpeType } from './workspace/CapexPropertiesDrawer';
import CapexInfoCreateEditor, { CapexInfoCreateEditorHandle } from './editors/CapexInfoCreateEditor';
import BudgetTab, { BudgetTabHandle } from '../../components/finance/BudgetTab';
import AllocationsTab, { AllocationsTabHandle } from '../../components/finance/AllocationsTab';
import { CAPEX_FINANCE_CONFIG } from '../../components/finance/config';
import RelationsPanel, { RelationsPanelHandle } from './editors/RelationsPanel';
import EntityTasksPanel from '../../components/EntityTasksPanel';
import { readStoredCapexListContext, writeStoredCapexListContext } from './listContextStorage';
import { fetchCapexTasksCount, fetchCapexRelationsCount } from '../../utils/workspaceTabCounts';

type TabKey = 'overview' | 'budget' | 'allocations' | 'tasks' | 'relations';
const TAB_KEYS: TabKey[] = ['overview', 'budget', 'allocations', 'tasks', 'relations'];

type CapexForm = {
  id?: string;
  item_number?: number;
  description: string;
  supplier_id: string;
  currency: string;
  account_id: string;
  paying_company_id: string;
  ppe_type: CapexPpeType;
  investment_type: CapexInvestmentType;
  priority: CapexPriority;
  effective_start: string;
  effective_end: string;
  status: StatusValue;
  disabled_at: string | null;
  owner_it_id: string;
  owner_business_id: string;
  analytics_category_id: string;
  notes: string;
  created_at: string | null;
  updated_at: string | null;
};

const EMPTY_FORM: CapexForm = {
  description: '', supplier_id: '', currency: 'EUR', account_id: '', paying_company_id: '',
  ppe_type: 'hardware', investment_type: 'replacement', priority: 'medium',
  effective_start: '', effective_end: '', status: 'enabled', disabled_at: null,
  owner_it_id: '', owner_business_id: '', analytics_category_id: '', notes: '',
  created_at: null, updated_at: null,
};

const NULLABLE_PATCH_FIELDS = new Set([
  'supplier_id',
  'account_id',
  'paying_company_id',
  'effective_end',
  'owner_it_id',
  'owner_business_id',
  'analytics_category_id',
  'disabled_at',
]);

function normalizePatch(patch: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(patch).map(([key, value]) => [
    key,
    NULLABLE_PATCH_FIELDS.has(key) && value === '' ? null : value,
  ]));
}

function toForm(data: any): CapexForm {
  const normalizedDisabledAt = data?.disabled_at ? new Date(data.disabled_at).toISOString() : null;
  return {
    id: data?.id,
    item_number: data?.item_number,
    description: data?.description || '',
    supplier_id: data?.supplier_id || '',
    currency: (data?.currency || 'EUR').toUpperCase(),
    account_id: data?.account_id || '',
    paying_company_id: data?.paying_company_id || '',
    ppe_type: (data?.ppe_type || 'hardware') as CapexPpeType,
    investment_type: (data?.investment_type || 'replacement') as CapexInvestmentType,
    priority: (data?.priority || 'medium') as CapexPriority,
    effective_start: data?.effective_start ? String(data.effective_start).slice(0, 10) : '',
    effective_end: data?.effective_end ? String(data.effective_end).slice(0, 10) : '',
    status: deriveStatusFromDisabledAt(normalizedDisabledAt),
    disabled_at: normalizedDisabledAt,
    owner_it_id: data?.owner_it_id || '',
    owner_business_id: data?.owner_business_id || '',
    analytics_category_id: data?.analytics_category_id || '',
    notes: data?.notes || '',
    created_at: data?.created_at || null,
    updated_at: data?.updated_at || null,
  };
}

const sectionLabelSx = { fontSize: 12, fontWeight: 500, color: 'kanap.text.tertiary', mb: 1, display: 'block' } as const;
const composerSx = {
  '& .MuiInputBase-root': {
    bgcolor: 'kanap.bg.composer',
    border: '1px solid',
    borderColor: 'kanap.border.default',
    borderRadius: '8px',
    p: '14px 16px',
    fontSize: 14,
    lineHeight: 1.6,
    alignItems: 'flex-start',
  },
} as const;

export default function CapexItemPage() {
  const { t } = useTranslation(['ops', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const queryClient = useQueryClient();
  const storedListContext = React.useMemo(() => readStoredCapexListContext(), []);

  const idParam = String(params.id || '');
  const isCreate = idParam === 'new';
  const routeTab: TabKey = TAB_KEYS.includes(params.tab as TabKey) ? (params.tab as TabKey) : 'overview';

  const { data, error, refetch, isPlaceholderData } = useQuery({
    queryKey: ['capex', idParam],
    queryFn: async () => (await api.get(`/capex-items/${idParam}`)).data,
    enabled: !isCreate,
    placeholderData: (previousData) => previousData,
  });
  const stale = isPlaceholderData;
  const uuid = (data?.id as string | undefined) || (isCreate ? idParam : undefined);

  React.useEffect(() => {
    if (!data?.item_number) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(idParam);
    if (!isUuid) return;
    const ref = formatItemRef('capex', data.item_number);
    window.history.replaceState(null, '', `/ops/capex/${ref}/${routeTab}${location.search}`);
  }, [data?.item_number, idParam, routeTab, location.search]);

  const tasksCountQuery = useQuery({
    queryKey: ['capex-tasks-count', uuid],
    queryFn: () => fetchCapexTasksCount(uuid as string),
    enabled: !!uuid && !isCreate,
  });
  const relationsCountQuery = useQuery({
    queryKey: ['capex-relations-count', uuid],
    queryFn: () => fetchCapexRelationsCount(uuid as string),
    enabled: !!uuid && !isCreate,
  });

  const [form, setForm] = React.useState<CapexForm>(EMPTY_FORM);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (data && !isCreate) setForm(toForm(data));
  }, [data, isCreate]);

  const sort = searchParams.get('sort') || storedListContext?.sort || 'yBudget:DESC';
  const q = searchParams.get('q') || storedListContext?.q || '';
  const filters = searchParams.get('filters') || storedListContext?.filters || '';
  React.useEffect(() => { writeStoredCapexListContext({ sort, q, filters }); }, [sort, q, filters]);
  const buildListContextParams = React.useCallback(() => {
    const sp = new URLSearchParams(searchParamsString);
    if (!sp.get('sort') && sort) sp.set('sort', sort);
    if (!sp.get('q') && q) sp.set('q', q);
    if (!sp.get('filters') && filters) sp.set('filters', filters);
    return sp;
  }, [filters, q, searchParamsString, sort]);

  const nav = useCapexNav({ id: uuid || idParam, sort, q, filters });
  const { index, total, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { index: 0, total: 0, hasPrev: false, hasNext: false, prevId: null as any, nextId: null as any }
    : nav;

  const currentYear = React.useMemo(() => {
    const y = Number(searchParams.get('year'));
    return Number.isFinite(y) && y > 0 ? y : new Date().getFullYear();
  }, [searchParams]);
  const availableYears = React.useMemo(() => {
    const Y = new Date().getFullYear();
    return [Y - 2, Y - 1, Y, Y + 1, Y + 2];
  }, []);
  const setYear = (y: number) => {
    const next = buildListContextParams();
    next.set('year', String(y));
    setSearchParams(next, { replace: true });
  };

  const autosave = useAutosave({
    onError: (e) => setSaveError(getApiErrorMessage(e, t, t('capex.editor.failedToSave'))),
  });
  const pendingPatchRef = React.useRef<Record<string, any>>({});

  const flushPending = React.useCallback(async () => {
    if (!uuid) return;
    const keys = Object.keys(pendingPatchRef.current);
    if (keys.length === 0) return;
    const patch = normalizePatch({ ...pendingPatchRef.current });
    pendingPatchRef.current = {};
    await api.patch(`/capex-items/${uuid}`, patch);
    await queryClient.invalidateQueries({ queryKey: ['capex', idParam] });
    queryClient.invalidateQueries({ queryKey: ['capex-summary'] });
  }, [uuid, idParam, queryClient]);

  const patchNow = React.useCallback(async (patch: Partial<CapexForm>) => {
    if (isCreate || !uuid || stale) return;
    setForm((prev) => ({ ...prev, ...patch }));
    setSaveError(null);
    try {
      await api.patch(`/capex-items/${uuid}`, normalizePatch(patch));
      await queryClient.invalidateQueries({ queryKey: ['capex', idParam] });
      queryClient.invalidateQueries({ queryKey: ['capex-summary'] });
    } catch (e) {
      setSaveError(getApiErrorMessage(e, t, t('capex.editor.failedToSave')));
      await refetch();
    }
  }, [isCreate, uuid, stale, idParam, queryClient, refetch, t]);

  const patchDebounced = React.useCallback((patch: Partial<CapexForm>) => {
    if (isCreate || !uuid || stale) return;
    setForm((prev) => ({ ...prev, ...patch }));
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    autosave.schedule(flushPending);
  }, [isCreate, uuid, stale, autosave, flushPending]);

  const createRef = React.useRef<CapexInfoCreateEditorHandle>(null);
  const budgetRef = React.useRef<BudgetTabHandle>(null);
  const allocRef = React.useRef<AllocationsTabHandle>(null);
  const relationsRef = React.useRef<RelationsPanelHandle>(null);

  const activeRefEditor = React.useCallback(() => {
    if (routeTab === 'relations') return relationsRef.current;
    return null;
  }, [routeTab]);

  const flushAll = React.useCallback(async (): Promise<boolean> => {
    const overviewOk = await autosave.flush();
    if (!overviewOk) return false;
    if (routeTab === 'budget') return (await budgetRef.current?.flush()) ?? true;
    if (routeTab === 'allocations') return (await allocRef.current?.flush()) ?? true;
    const editor = activeRefEditor();
    if (editor?.isDirty?.()) {
      try { await editor.save(); } catch { return false; }
    }
    return true;
  }, [autosave, activeRefEditor, routeTab]);

  const goToTab = React.useCallback(async (nextTab: TabKey) => {
    if (isCreate && nextTab !== 'overview') return;
    if (!(await flushAll())) return;
    const sp = buildListContextParams();
    navigate(`/ops/capex/${idParam}/${nextTab}?${sp.toString()}`);
  }, [isCreate, flushAll, buildListContextParams, navigate, idParam]);

  const confirmAndNavigate = React.useCallback(async (targetId: string | null) => {
    if (!targetId) return;
    if (!(await flushAll())) return;
    const sp = buildListContextParams();
    navigate(`/ops/capex/${targetId}/${routeTab}?${sp.toString()}`);
  }, [flushAll, buildListContextParams, navigate, routeTab]);

  const closeWorkspace = React.useCallback(async () => {
    if (!(await flushAll())) return;
    const sp = buildListContextParams();
    const qs = sp.toString();
    navigate(`/ops/capex${qs ? `?${qs}` : ''}`);
  }, [flushAll, buildListContextParams, navigate]);

  const handleCreate = React.useCallback(async () => {
    const newId = await createRef.current?.save();
    if (newId) {
      const sp = buildListContextParams();
      navigate(`/ops/capex/${newId}/overview?${sp.toString()}`);
    }
  }, [buildListContextParams, navigate]);

  const handleStatusChange = (next: StatusValue) => {
    const disabled_at = next === 'disabled' ? (form.disabled_at || new Date().toISOString()) : null;
    void patchNow({ status: deriveStatusFromDisabledAt(disabled_at), disabled_at });
  };
  const handleDisabledAtChange = (next: string | null) => {
    const disabled_at = normalizeDisabledAtInput(next);
    void patchNow({ status: deriveStatusFromDisabledAt(disabled_at), disabled_at });
  };

  const reference = data?.item_number ? formatItemRef('capex', data.item_number) : null;

  const tabs = React.useMemo(() => ([
    { key: 'overview', label: t('capex.tabs.overview') },
    { key: 'budget', label: t('capex.tabs.budget') },
    { key: 'allocations', label: t('capex.tabs.allocations') },
    { key: 'tasks', label: t('capex.tabs.tasks') },
    { key: 'relations', label: t('capex.tabs.relations') },
  ] as Array<{ key: TabKey; label: string }>), [t]);

  const savingHint = autosave.status === 'saving' || autosave.status === 'pending'
    ? t('common:status.saving', 'Saving...')
    : autosave.status === 'saved'
      ? t('common:status.saved', 'Saved')
      : null;

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {!!error && <Alert severity="error" sx={{ mx: 2, mt: 1 }}>{t('capex.workspace.failedToLoad')}</Alert>}
      {!!saveError && <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setSaveError(null)}>{saveError}</Alert>}

      <PortfolioDetailWorkspaceShell
        activeTab={routeTab}
        tabs={tabs.map((tab) => ({
          ...tab,
          disabled: isCreate && tab.key !== 'overview',
          badge: tab.key === 'tasks'
            ? (tasksCountQuery.data || undefined)
            : tab.key === 'relations'
              ? (relationsCountQuery.data || undefined)
              : undefined,
        }))}
        onTabChange={(next) => { void goToTab(next as TabKey); }}
        drawerStorageKey="kanap.capex.drawerOpen"
        backLabel={t('capex.workspace.capexItems', 'CAPEX items')}
        onBack={() => { void closeWorkspace(); }}
        itemReference={reference}
        onCopyReference={reference ? () => { void navigator.clipboard?.writeText(reference); } : undefined}
        title={form.description}
        titleFallback={isCreate ? t('capex.workspace.newCapexItem') : t('capex.workspace.capexItem')}
        canEditTitle={!isCreate}
        onTitleSave={(value) => { void patchNow({ description: value }); }}
        isCreate={isCreate}
        nav={!isCreate && total > 0 ? {
          currentIndex: index + 1,
          totalCount: total,
          hasPrev,
          hasNext,
          onPrev: () => { void confirmAndNavigate(prevId); },
          onNext: () => { void confirmAndNavigate(nextId); },
          previousLabel: t('capex.workspace.prev'),
          nextLabel: t('capex.workspace.next'),
        } : undefined}
        onSaveShortcut={() => { void flushAll(); }}
        metadata={!isCreate ? (
          <CapexMetadataBar
            status={form.status}
            priority={form.priority}
            ownerItId={form.owner_it_id || null}
            ownerBizId={form.owner_business_id || null}
            onStatusChange={handleStatusChange}
            onPriorityChange={(v) => void patchNow({ priority: v })}
            onOwnerItChange={(v) => void patchNow({ owner_it_id: (v || '') as string })}
            onOwnerBizChange={(v) => void patchNow({ owner_business_id: (v || '') as string })}
          />
        ) : undefined}
        actions={(
          <>
            {savingHint && (
              <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary', alignSelf: 'center', mr: 0.5 }}>
                {savingHint}
              </Typography>
            )}
            {!isCreate && uuid && (
              <SendLinkButton
                itemType="capex"
                itemId={uuid}
                itemName={form.description || t('capex.workspace.capexItem')}
                itemNumber={data?.item_number}
              />
            )}
            {isCreate && (
              <Button variant="contained" size="small" onClick={() => void handleCreate()}>
                {t('common:buttons.create')}
              </Button>
            )}
            <IconButton aria-label={t('common:buttons.close')} title={t('common:buttons.close')} size="small" onClick={() => { void closeWorkspace(); }}>
              <CloseIcon />
            </IconButton>
          </>
        )}
        properties={!isCreate ? (
          <CapexPropertiesDrawer
            supplierId={form.supplier_id}
            payingCompanyId={form.paying_company_id}
            accountId={form.account_id}
            currency={form.currency}
            ppeType={form.ppe_type}
            investmentType={form.investment_type}
            analyticsCategoryId={form.analytics_category_id}
            effectiveStart={form.effective_start}
            effectiveEnd={form.effective_end}
            status={form.status}
            disabledAt={form.disabled_at}
            createdAt={form.created_at}
            updatedAt={form.updated_at}
            onSupplierChange={(v) => void patchNow({ supplier_id: v })}
            onPayingCompanyChange={(v) => void patchNow({ paying_company_id: v })}
            onAccountChange={(v) => void patchNow({ account_id: v })}
            onCurrencyChange={(v) => void patchNow({ currency: v.toUpperCase() })}
            onPpeTypeChange={(v) => void patchNow({ ppe_type: v })}
            onInvestmentTypeChange={(v) => void patchNow({ investment_type: v })}
            onAnalyticsCategoryChange={(v) => void patchNow({ analytics_category_id: v })}
            onEffectiveStartChange={(v) => void patchNow({ effective_start: v })}
            onEffectiveEndChange={(v) => void patchNow({ effective_end: v })}
            onStatusChange={handleStatusChange}
            onDisabledAtChange={handleDisabledAtChange}
          />
        ) : <></>}
      >
        {routeTab === 'overview' && (
          isCreate ? (
            <CapexInfoCreateEditor ref={createRef} />
          ) : (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box>
                <Typography component="label" sx={sectionLabelSx}>{t('capex.fields.notes')}</Typography>
                <TextField
                  value={form.notes}
                  onChange={(e) => patchDebounced({ notes: e.target.value })}
                  multiline minRows={4} fullWidth variant="standard"
                  placeholder={t('capex.fields.notesPlaceholder', 'e.g., approved investment rationale')}
                  InputProps={{ disableUnderline: true }}
                  sx={composerSx}
                />
              </Box>
            </Stack>
          )
        )}

        {routeTab === 'budget' && !isCreate && uuid && (
          <BudgetTab key={uuid} id={uuid} year={currentYear} currency={form.currency} availableYears={availableYears} onYearChange={setYear} config={CAPEX_FINANCE_CONFIG} ref={budgetRef} />
        )}
        {routeTab === 'allocations' && !isCreate && uuid && (
          <AllocationsTab key={uuid} id={uuid} year={currentYear} currency={form.currency} availableYears={availableYears} onYearChange={setYear} config={CAPEX_FINANCE_CONFIG} ref={allocRef} />
        )}
        {routeTab === 'tasks' && !isCreate && uuid && (
          <EntityTasksPanel key={uuid} entityType="capex_item" entityId={uuid} onTasksChange={() => { void tasksCountQuery.refetch(); }} />
        )}
        {routeTab === 'relations' && !isCreate && uuid && (
          <RelationsPanel key={uuid} id={uuid} ref={relationsRef} autoSave onRelationsChange={() => { void relationsCountQuery.refetch(); }} />
        )}
      </PortfolioDetailWorkspaceShell>
    </Box>
  );
}
