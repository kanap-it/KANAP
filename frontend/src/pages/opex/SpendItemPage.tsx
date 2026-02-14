import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Tabs,
  Tab,
  Stack,
  Button,
  Typography,
  Alert,
  Divider,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api';
import { useSpendNav } from '../../hooks/useSpendNav';
import SpendInfoEditor, { SpendInfoEditorHandle } from './editors/SpendInfoEditor';
import SpendInfoCreateEditor, { SpendInfoCreateEditorHandle } from './editors/SpendInfoCreateEditor';
import BudgetEditor, { BudgetEditorHandle } from './editors/BudgetEditor';
import AllocationEditor, { AllocationEditorHandle } from './editors/AllocationEditor';
import EntityTasksPanel from '../../components/EntityTasksPanel';
import RelationsPanel, { RelationsPanelHandle } from './editors/RelationsPanel';
import { readStoredOpexListContext, writeStoredOpexListContext } from './listContextStorage';

type TabKey = 'overview' | 'budget' | 'allocations' | 'tasks' | 'relations';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'budget', label: 'Budget' },
  { key: 'allocations', label: 'Allocations' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'relations', label: 'Relations' },
];

export default function SpendItemPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const storedListContext = React.useMemo(() => readStoredOpexListContext(), []);

  const idParam = String(params.id || '');
  const isCreate = idParam === 'new';
  const id = idParam;
  const routeTab = (params.tab as TabKey) || 'overview';

  // Preserve list context for prev/next
  const sort = searchParams.get('sort') || storedListContext?.sort || 'yBudget:DESC';
  const q = searchParams.get('q') || storedListContext?.q || '';
  const filters = searchParams.get('filters') || storedListContext?.filters || '';
  React.useEffect(() => {
    writeStoredOpexListContext({ sort, q, filters });
  }, [sort, q, filters]);
  const buildListContextParams = React.useCallback(() => {
    const sp = new URLSearchParams(searchParamsString);
    if (!sp.get('sort') && sort) sp.set('sort', sort);
    if (!sp.get('q') && q) sp.set('q', q);
    if (!sp.get('filters') && filters) sp.set('filters', filters);
    return sp;
  }, [filters, q, searchParamsString, sort]);

  const nav = useSpendNav({ id, sort, q, filters });
  const { ids, index, total, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { ids: [], index: 0, total: 0, hasPrev: false, hasNext: false, prevId: null as any, nextId: null as any }
    : nav;

  const { data, isLoading, error } = useQuery({
    queryKey: ['spend', id],
    queryFn: async () => { const res = await api.get(`/spend-items/${id}`); return res.data; },
    enabled: !isCreate,
  });

  // Year state for budget/allocations routed via URL (?year=YYYY)
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
  const overviewRef = React.useRef<SpendInfoEditorHandle>(null);
  const overviewCreateRef = React.useRef<SpendInfoCreateEditorHandle>(null);
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
          navigate(`/ops/opex/${newId}/overview?${sp.toString()}`);
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
      const proceed = window.confirm('You have unsaved changes. Save before navigating?');
      if (proceed) {
        try { await handleSave(); } catch { return; }
      } else {
        // discard
        handleReset();
      }
    }
    // Navigate preserving tab and current query params
    const params = buildListContextParams();
    navigate(`/ops/opex/${targetId}/${routeTab}?${params.toString()}`);
  };

  const handlePrev = () => confirmAndNavigate(prevId);
  const handleNext = () => confirmAndNavigate(nextId);

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'overview') return; // disable during creation
    if (dirty) {
      const proceed = window.confirm('You have unsaved changes. Save before switching tabs?');
      if (proceed) {
        void handleSave().then(() => {
          const params = buildListContextParams();
          navigate(`/ops/opex/${id}/${nextValue}?${params.toString()}`);
        });
        return;
      } else {
        handleReset();
      }
    }
    const params = buildListContextParams();
    navigate(`/ops/opex/${id}/${nextValue}?${params.toString()}`);
  };

  const availableYears = React.useMemo(() => {
    const Y = new Date().getFullYear();
    return [Y - 2, Y - 1, Y, Y + 1, Y + 2];
  }, []);

  const relationsRef = React.useRef<RelationsPanelHandle>(null);

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack>
          <Typography variant="h6">{isCreate ? 'New Spend Item' : (data?.product_name || 'Spend Item')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {total > 0 ? `Item ${index + 1} of ${total}` : ''}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button onClick={handlePrev} disabled={!hasPrev}>Prev</Button>
          <Button onClick={handleReset} disabled={!dirty}>Reset</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={!dirty}>Save</Button>
          <Button onClick={handleNext} disabled={!hasNext}>Next</Button>
          <IconButton aria-label="Close" title="Close" onClick={() => {
            // Navigate back to list, preserve search context if present
            const sp = buildListContextParams();
            const qs = sp.toString();
            navigate(`/ops/opex${qs ? `?${qs}` : ''}`);
          }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">Failed to load item.</Alert>}

      <Divider sx={{ mb: 2 }} />

      {/* Body with vertical tabs */}
      <Box sx={{ display: 'flex', minHeight: 420 }}>
        <Tabs
          orientation="vertical"
          value={routeTab}
          onChange={(_, v) => onTabChange(null as any, v)}
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 160 }}
        >
          {tabs.map(t => (
            <Tab key={t.key} label={t.label} value={t.key} disabled={isCreate && t.key !== 'overview'} />
          ))}
        </Tabs>

        <Box sx={{ flex: 1, pl: 3 }}>
          {isCreate && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Other tabs will be available after you create the item.
            </Typography>
          )}
          {routeTab === 'overview' && (
            isCreate ? (
              <SpendInfoCreateEditor ref={overviewCreateRef} onDirtyChange={updateDirty} />
            ) : (
              <SpendInfoEditor id={id} ref={overviewRef} onDirtyChange={updateDirty} />
            )
          )}
          {routeTab === 'budget' && (
            <BudgetEditor id={id} year={currentYear} availableYears={availableYears} onYearChange={setYear} ref={budgetRef} onDirtyChange={updateDirty} />
          )}
          {routeTab === 'allocations' && (
            <AllocationEditor id={id} year={currentYear} availableYears={availableYears} onYearChange={setYear} ref={allocRef} onDirtyChange={updateDirty} />
          )}
          {routeTab === 'tasks' && (
            <EntityTasksPanel entityType="spend_item" entityId={id} />
          )}
          {routeTab === 'relations' && (
            <RelationsPanel id={id} ref={relationsRef} onDirtyChange={updateDirty} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
