import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Tabs, Tab, Stack, Button, Typography, Alert, Divider, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { useCapexNav } from '../../hooks/useCapexNav';
import CapexInfoEditor, { CapexInfoEditorHandle } from './editors/CapexInfoEditor';
import CapexInfoCreateEditor, { CapexInfoCreateEditorHandle } from './editors/CapexInfoCreateEditor';
import BudgetEditor, { BudgetEditorHandle } from './editors/BudgetEditor';
import AllocationEditor, { AllocationEditorHandle } from './editors/AllocationEditor';
import EntityTasksPanel from '../../components/EntityTasksPanel';
import RelationsPanel, { RelationsPanelHandle } from './editors/RelationsPanel';
import { readStoredCapexListContext, writeStoredCapexListContext } from './listContextStorage';

type TabKey = 'overview' | 'budget' | 'allocations' | 'tasks' | 'relations';

// Tab labels resolved inside component

export default function CapexItemPage() {
  const { t } = useTranslation(['ops', 'common']);
  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'overview', label: t('opex.tabs.overview') },
    { key: 'budget', label: t('opex.tabs.budget') },
    { key: 'allocations', label: t('opex.tabs.allocations') },
    { key: 'tasks', label: t('opex.tabs.tasks') },
    { key: 'relations', label: t('opex.tabs.relations') },
  ];
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const storedListContext = React.useMemo(() => readStoredCapexListContext(), []);

  const idParam = String(params.id || '');
  const isCreate = idParam === 'new';
  const id = idParam;
  const routeTab = (params.tab as TabKey) || 'overview';

  // Preserve list context for prev/next
  const sort = searchParams.get('sort') || storedListContext?.sort || 'yBudget:DESC';
  const q = searchParams.get('q') || storedListContext?.q || '';
  const filters = searchParams.get('filters') || storedListContext?.filters || '';
  React.useEffect(() => {
    writeStoredCapexListContext({ sort, q, filters });
  }, [sort, q, filters]);
  const buildListContextParams = React.useCallback(() => {
    const sp = new URLSearchParams(searchParamsString);
    if (!sp.get('sort') && sort) sp.set('sort', sort);
    if (!sp.get('q') && q) sp.set('q', q);
    if (!sp.get('filters') && filters) sp.set('filters', filters);
    return sp;
  }, [filters, q, searchParamsString, sort]);

  const nav = useCapexNav({ id, sort, q, filters });
  const { ids, index, total, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { ids: [], index: 0, total: 0, hasPrev: false, hasNext: false, prevId: null as any, nextId: null as any }
    : nav;

  const { data, error } = useQuery({
    queryKey: ['capex', id],
    queryFn: async () => { const res = await api.get(`/capex-items/${id}`); return res.data; },
    enabled: !isCreate,
  });

  // Year state via URL
  const currentYear = React.useMemo(() => {
    const yParam = searchParams.get('year');
    const yNum = yParam ? Number(yParam) : NaN;
    if (Number.isFinite(yNum)) return yNum;
    return new Date().getFullYear();
  }, [searchParams]);

  const setYear = (y: number) => {
    const next = buildListContextParams();
    next.set('year', String(y));
    setSearchParams(next, { replace: true });
  };

  // Dirty handling per tab via refs
  const overviewRef = React.useRef<CapexInfoEditorHandle>(null);
  const overviewCreateRef = React.useRef<CapexInfoCreateEditorHandle>(null);
  const budgetRef = React.useRef<BudgetEditorHandle>(null);
  const allocRef = React.useRef<AllocationEditorHandle>(null);
  const [dirty, setDirty] = React.useState(false);
  const updateDirty = React.useCallback((d: boolean) => setDirty(d), []);

  const handleSave = async () => {
    const active = routeTab;
    if (active === 'overview') {
      if (isCreate) {
        const newId = await overviewCreateRef.current?.save();
        if (newId) {
          const sp = buildListContextParams();
          navigate(`/ops/capex/${newId}/overview?${sp.toString()}`);
        }
        return;
      }
      await overviewRef.current?.save();
    }
    else if (active === 'budget') await budgetRef.current?.save();
    else if (active === 'allocations') await allocRef.current?.save();
    else if (active === 'relations') await relationsRef.current?.save();
    setDirty(false);
  };

  const handleReset = () => {
    const active = routeTab;
    if (active === 'overview') {
      if (isCreate) overviewCreateRef.current?.reset(); else overviewRef.current?.reset();
    }
    if (active === 'budget') budgetRef.current?.reset();
    if (active === 'allocations') allocRef.current?.reset();
    if (active === 'relations') relationsRef.current?.reset();
    setDirty(false);
  };

  const confirmAndNavigate = async (targetId: string | null) => {
    if (!targetId) return;
    if (dirty) {
      const proceed = window.confirm(t('confirmations.unsavedNavigate'));
      if (proceed) {
        try { await handleSave(); } catch { return; }
      } else {
        handleReset();
      }
    }
    // Navigate preserving tab and current query params
    const params = buildListContextParams();
    navigate(`/ops/capex/${targetId}/${routeTab}?${params.toString()}`);
  };

  const handlePrev = () => confirmAndNavigate(prevId);
  const handleNext = () => confirmAndNavigate(nextId);

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'overview') return;
    if (dirty) {
      const proceed = window.confirm(t('confirmations.unsavedSwitchTab'));
      if (proceed) {
        void handleSave().then(() => {
          const params = buildListContextParams();
          navigate(`/ops/capex/${id}/${nextValue}?${params.toString()}`);
        });
        return;
      } else {
        handleReset();
      }
    }
    const params = buildListContextParams();
    navigate(`/ops/capex/${id}/${nextValue}?${params.toString()}`);
  };

  const availableYears = React.useMemo(() => {
    const Y = new Date().getFullYear();
    return [Y - 2, Y - 1, Y, Y + 1, Y + 2];
  }, []);

  const relationsRef = React.useRef<RelationsPanelHandle>(null);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack>
          <Typography variant="h6">{isCreate ? t('capex.workspace.newCapexItem') : (data?.description || t('capex.workspace.capexItem'))}</Typography>
          <Typography variant="body2" color="text.secondary">
            {total > 0 ? t('capex.workspace.itemOf', { index: index + 1, total }) : ''}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button onClick={handlePrev} disabled={!hasPrev}>{t('capex.workspace.prev')}</Button>
          <Button onClick={handleReset} disabled={!dirty}>{t('common:buttons.reset')}</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={!dirty}>{t('common:buttons.saveChanges')}</Button>
          <Button onClick={handleNext} disabled={!hasNext}>{t('capex.workspace.next')}</Button>
          <IconButton aria-label="Close" title="Close" onClick={() => {
            // Navigate back to list, preserve search context if present
            const sp = buildListContextParams();
            const qs = sp.toString();
            navigate(`/ops/capex${qs ? `?${qs}` : ''}`);
          }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">{t('capex.workspace.failedToLoad')}</Alert>}

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', minHeight: 420 }}>
        <Tabs orientation="vertical" value={routeTab} onChange={(_, v) => onTabChange(null as any, v)} sx={{ borderRight: 1, borderColor: 'divider', minWidth: 160 }}>
          {tabs.map(t => (
            <Tab key={t.key} label={t.label} value={t.key} disabled={isCreate && t.key !== 'overview'} />
          ))}
        </Tabs>

        <Box sx={{ flex: 1, pl: 3 }}>
          {isCreate && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {t('capex.workspace.tabsAfterCreate')}
            </Typography>
          )}
          {routeTab === 'overview' && (
            isCreate ? (
              <CapexInfoCreateEditor ref={overviewCreateRef} onDirtyChange={updateDirty} />
            ) : (
              <CapexInfoEditor id={id} ref={overviewRef} onDirtyChange={updateDirty} />
            )
          )}
          {routeTab === 'budget' && (
            <BudgetEditor id={id} year={currentYear} availableYears={availableYears} onYearChange={setYear} ref={budgetRef} onDirtyChange={updateDirty} />
          )}
          {routeTab === 'allocations' && (
            <AllocationEditor id={id} year={currentYear} availableYears={availableYears} onYearChange={setYear} ref={allocRef} onDirtyChange={updateDirty} />
          )}
          {routeTab === 'tasks' && (
            <EntityTasksPanel entityType="capex_item" entityId={id} />
          )}
          {routeTab === 'relations' && (
            <RelationsPanel id={id} ref={relationsRef} onDirtyChange={updateDirty} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
