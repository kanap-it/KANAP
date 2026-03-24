import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Divider, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useCompanyNav } from '../../hooks/useCompanyNav';
import CompanyOverviewEditor, { CompanyOverviewEditorHandle } from './editors/CompanyOverviewEditor';
import CompanyCreateEditor, { CompanyCreateEditorHandle } from './editors/CompanyCreateEditor';
import CompanyDetailsEditor, { CompanyDetailsEditorHandle } from './editors/CompanyDetailsEditor';

type TabKey = 'overview' | 'details';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'overview' },
  { key: 'details', label: 'details' },
];

export default function CompanyWorkspacePage() {
  const { t } = useTranslation(['master-data', 'common']);
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

  const nav = useCompanyNav({ id, sort, q, filters, year: listYear });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null, nextId: null }
    : nav;

  const { data, error } = useQuery({
    queryKey: ['companies', id],
    queryFn: async () => { const res = await api.get(`/companies/${id}`); return res.data; },
    enabled: !isCreate,
  });

  const currentYear = React.useMemo(() => {
    const yParam = searchParams.get('year');
    const yNum = yParam ? Number(yParam) : NaN;
    if (Number.isFinite(yNum)) return yNum;
    return new Date().getFullYear();
  }, [searchParams]);

  const applyYearParam = (y: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('year', String(y));
    setSearchParams(next, { replace: true });
  };

  const overviewRef = React.useRef<CompanyOverviewEditorHandle>(null);
  const overviewCreateRef = React.useRef<CompanyCreateEditorHandle>(null);
  const detailsRef = React.useRef<CompanyDetailsEditorHandle>(null);

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
            navigate(`/master-data/companies/${newId}/overview?${sp.toString()}`);
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

  const handleYearChange = (nextYear: number) => {
    if (nextYear === currentYear) return;
    if (dirty) {
      const proceed = window.confirm(t('shared.workspace.unsavedSwitchYear'));
      if (proceed) {
        void handleSave().then(() => applyYearParam(nextYear)).catch(() => {});
        return;
      }
      handleReset();
    }
    applyYearParam(nextYear);
  };

  const confirmAndNavigate = async (targetId: string | null) => {
    if (!targetId) return;
    if (dirty) {
      const proceed = window.confirm(t('shared.workspace.unsavedNavigate'));
      if (proceed) {
        try { await handleSave(); } catch { return; }
      } else {
        handleReset();
      }
    }
    navigate(`/master-data/companies/${targetId}/${routeTab}?${searchParams.toString()}`);
  };

  const handlePrev = () => { void confirmAndNavigate(prevId); };
  const handleNext = () => { void confirmAndNavigate(nextId); };

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'overview') return;
    if (dirty) {
      const proceed = window.confirm(t('shared.workspace.unsavedSwitchTab'));
      if (proceed) {
        void handleSave().then(() => navigate(`/master-data/companies/${id}/${nextValue}?${searchParams.toString()}`));
        return;
      } else {
        handleReset();
      }
    }
    navigate(`/master-data/companies/${id}/${nextValue}?${searchParams.toString()}`);
  };

  const availableYears = React.useMemo(() => {
    const Y = new Date().getFullYear();
    return [Y - 2, Y - 1, Y, Y + 1, Y + 2];
  }, []);

  const canManageCompanies = hasLevel('companies', 'manager');
  const saveDisabled = !dirty || !canManageCompanies;

  const listContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters) sp.set('filters', filters);
    if (searchParams.get('year')) sp.set('year', searchParams.get('year') as string);
    return sp;
  }, [filters, q, sort, searchParams]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack>
          <Typography variant="h6">
            {isCreate ? t('companies.newCompany') : (data?.name || t('companies.companyFallback'))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!isCreate && total > 0 ? t('shared.workspace.itemCountOf', { entity: t('companies.companyFallback'), current: index + 1, total }) : ''}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button onClick={handlePrev} disabled={!hasPrev}>{t('shared.labels.prev')}</Button>
          <Button onClick={handleReset} disabled={!dirty}>{t('common:buttons.reset')}</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saveDisabled}>{t('common:buttons.saveChanges')}</Button>
          <Button onClick={handleNext} disabled={!hasNext}>{t('shared.labels.next')}</Button>
          <IconButton
            aria-label="Close"
            title="Close"
            onClick={() => {
              const qs = listContextParams.toString();
              navigate(`/master-data/companies${qs ? `?${qs}` : ''}`);
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">{t('companies.loadError')}</Alert>}

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
              {t('companies.detailsTabHint')}
            </Typography>
          )}

          {routeTab === 'overview' && (
            isCreate ? (
              <CompanyCreateEditor ref={overviewCreateRef} onDirtyChange={updateDirty} />
            ) : (
              <CompanyOverviewEditor ref={overviewRef} id={id} onDirtyChange={updateDirty} readOnly={!canManageCompanies} />
            )
          )}

          {routeTab === 'details' && !isCreate && (
            <CompanyDetailsEditor
              ref={detailsRef}
              id={id}
              year={currentYear}
              availableYears={availableYears}
              onYearChange={handleYearChange}
              onDirtyChange={updateDirty}
              readOnly={!canManageCompanies}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
