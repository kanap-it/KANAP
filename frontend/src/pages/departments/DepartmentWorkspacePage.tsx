import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Divider, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useDepartmentNav } from '../../hooks/useDepartmentNav';
import DepartmentOverviewEditor, { DepartmentOverviewEditorHandle } from './editors/DepartmentOverviewEditor';
import DepartmentCreateEditor, { DepartmentCreateEditorHandle } from './editors/DepartmentCreateEditor';
import DepartmentDetailsEditor, { DepartmentDetailsEditorHandle } from './editors/DepartmentDetailsEditor';

type TabKey = 'overview' | 'details';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'details', label: 'Details' },
];

export default function DepartmentWorkspacePage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasLevel } = useAuth();

  const idParam = String(params.id || '');
  const isCreate = idParam === 'new';
  const id = idParam;
  const routeTab = (params.tab as TabKey) || 'overview';

  const sort = searchParams.get('sort');
  const q = searchParams.get('q');
  const filters = searchParams.get('filters');
  const listYear = searchParams.get('year');

  const nav = useDepartmentNav({ id, sort, q, filters, year: listYear });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null, nextId: null }
    : nav;

  const { data, error } = useQuery({
    queryKey: ['departments', id],
    queryFn: async () => { const res = await api.get(`/departments/${id}`); return res.data; },
    enabled: !isCreate,
  });

  const currentYear = React.useMemo(() => {
    const yParam = searchParams.get('year');
    const yNum = yParam ? Number(yParam) : NaN;
    if (Number.isFinite(yNum)) return yNum;
    return new Date().getFullYear();
  }, [searchParams]);

  const setYear = (y: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('year', String(y));
    setSearchParams(next, { replace: true });
  };

  const overviewRef = React.useRef<DepartmentOverviewEditorHandle>(null);
  const overviewCreateRef = React.useRef<DepartmentCreateEditorHandle>(null);
  const detailsRef = React.useRef<DepartmentDetailsEditorHandle>(null);

  const [dirty, setDirty] = React.useState(false);
  const updateDirty = React.useCallback((d: boolean) => setDirty(d), []);

  const handleSave = async () => {
    const active = routeTab;
    try {
      if (active === 'overview') {
        if (isCreate) {
          const newId = await overviewCreateRef.current?.save();
          if (newId) {
            const sp = new URLSearchParams(searchParams);
            navigate(`/master-data/departments/${newId}/overview?${sp.toString()}`);
            return;
          }
        } else {
          await overviewRef.current?.save();
        }
      } else if (active === 'details') {
        await detailsRef.current?.save();
      }
      setDirty(false);
    } catch {
      // Child editors surface their own errors
    }
  };

  const handleReset = () => {
    const active = routeTab;
    if (active === 'overview') {
      if (isCreate) overviewCreateRef.current?.reset(); else overviewRef.current?.reset();
    }
    if (active === 'details') detailsRef.current?.reset();
    setDirty(false);
  };

  const confirmAndNavigate = async (targetId: string | null) => {
    if (!targetId) return;
    if (dirty) {
      const proceed = window.confirm('You have unsaved changes. Save before navigating?');
      if (proceed) {
        try { await handleSave(); } catch { return; }
      } else {
        handleReset();
      }
    }
    navigate(`/master-data/departments/${targetId}/${routeTab}?${searchParams.toString()}`);
  };

  const handlePrev = () => { void confirmAndNavigate(prevId); };
  const handleNext = () => { void confirmAndNavigate(nextId); };

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'overview') return;
    if (dirty) {
      const proceed = window.confirm('You have unsaved changes. Save before switching tabs?');
      if (proceed) {
        void handleSave().then(() => navigate(`/master-data/departments/${id}/${nextValue}?${searchParams.toString()}`));
        return;
      } else {
        handleReset();
      }
    }
    navigate(`/master-data/departments/${id}/${nextValue}?${searchParams.toString()}`);
  };

  const availableYears = React.useMemo(() => {
    const Y = new Date().getFullYear();
    return [Y - 2, Y - 1, Y, Y + 1, Y + 2];
  }, []);

  const canManageDepartments = hasLevel('departments', 'manager');
  const saveDisabled = !dirty || !canManageDepartments;

  const listContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters) sp.set('filters', filters);
    if (searchParams.get('year')) sp.set('year', searchParams.get('year') as string);
    return sp;
  }, [filters, q, sort, searchParams]);

  return (
    <Box sx={{ p: 2 }} key={id}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack>
          <Typography variant="h6">
            {isCreate ? 'New Department' : (data?.name || 'Department')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!isCreate && total > 0 ? `Department ${index + 1} of ${total}` : ''}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button onClick={handlePrev} disabled={!hasPrev}>Prev</Button>
          <Button onClick={handleReset} disabled={!dirty}>Reset</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saveDisabled}>Save</Button>
          <Button onClick={handleNext} disabled={!hasNext}>Next</Button>
          <IconButton
            aria-label="Close"
            title="Close"
            onClick={() => {
              const qs = listContextParams.toString();
              navigate(`/master-data/departments${qs ? `?${qs}` : ''}`);
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">Failed to load department.</Alert>}

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', minHeight: 420 }}>
        <Tabs
          orientation="vertical"
          value={routeTab}
          onChange={(_, value) => onTabChange(null as any, value as TabKey)}
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 160 }}
        >
          {tabs.map((t) => (
            <Tab
              key={t.key}
              label={t.label}
              value={t.key}
              disabled={isCreate && t.key !== 'overview'}
            />
          ))}
        </Tabs>

        <Box sx={{ flex: 1, pl: 3 }}>
          {isCreate && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              The Details tab becomes available after you create the department.
            </Typography>
          )}

          {routeTab === 'overview' && (
            isCreate ? (
              <DepartmentCreateEditor ref={overviewCreateRef} onDirtyChange={updateDirty} />
            ) : (
              <DepartmentOverviewEditor ref={overviewRef} id={id} onDirtyChange={updateDirty} readOnly={!canManageDepartments} />
            )
          )}

          {routeTab === 'details' && !isCreate && (
            <DepartmentDetailsEditor
              ref={detailsRef}
              id={id}
              year={currentYear}
              availableYears={availableYears}
              onYearChange={setYear}
              onDirtyChange={updateDirty}
              readOnly={!canManageDepartments}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
