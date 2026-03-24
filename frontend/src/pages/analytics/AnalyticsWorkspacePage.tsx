import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Divider, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useAnalyticsNav } from '../../hooks/useAnalyticsNav';
import AnalyticsOverviewEditor, { AnalyticsOverviewEditorHandle } from './editors/AnalyticsOverviewEditor';
import AnalyticsCreateEditor, { AnalyticsCreateEditorHandle } from './editors/AnalyticsCreateEditor';

type TabKey = 'overview';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
];

export default function AnalyticsWorkspacePage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['master-data', 'common']);
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { hasLevel } = useAuth();

  const idParam = String(params.id || '');
  const isCreate = idParam === 'new';
  const id = idParam;
  const routeTab = (params.tab as TabKey) || 'overview';

  const sort = searchParams.get('sort');
  const q = searchParams.get('q');
  const filters = searchParams.get('filters');

  const nav = useAnalyticsNav({ id, sort, q, filters });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null, nextId: null }
    : nav;

  const { data, error } = useQuery({
    queryKey: ['analytics-categories', id],
    queryFn: async () => { const res = await api.get(`/analytics-categories/${id}`); return res.data; },
    enabled: !isCreate,
  });

  const overviewRef = React.useRef<AnalyticsOverviewEditorHandle>(null);
  const overviewCreateRef = React.useRef<AnalyticsCreateEditorHandle>(null);

  const [dirty, setDirty] = React.useState(false);
  const updateDirty = React.useCallback((d: boolean) => setDirty(d), []);

  const handleSave = async () => {
    try {
      if (routeTab === 'overview') {
        if (isCreate) {
          const newId = await overviewCreateRef.current?.save();
          if (newId) {
            const sp = new URLSearchParams(searchParams);
            navigate(`/master-data/analytics/${newId}/overview?${sp.toString()}`);
          }
        } else {
          await overviewRef.current?.save();
        }
      }
      setDirty(false);
    } catch {
      // handled by child editors
    }
  };

  const handleReset = () => {
    if (routeTab === 'overview') {
      if (isCreate) overviewCreateRef.current?.reset(); else overviewRef.current?.reset();
    }
    setDirty(false);
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
    navigate(`/master-data/analytics/${targetId}/${routeTab}?${searchParams.toString()}`);
  };

  const handlePrev = () => { void confirmAndNavigate(prevId); };
  const handleNext = () => { void confirmAndNavigate(nextId); };

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'overview') return;
    if (dirty) {
      const proceed = window.confirm(t('shared.workspace.unsavedSwitchTab'));
      if (proceed) {
        void handleSave().then(() => navigate(`/master-data/analytics/${id}/${nextValue}?${searchParams.toString()}`));
        return;
      } else {
        handleReset();
      }
    }
    navigate(`/master-data/analytics/${id}/${nextValue}?${searchParams.toString()}`);
  };

  const canManage = hasLevel('analytics', 'manager');
  const saveDisabled = !dirty || !canManage;

  const listContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters) sp.set('filters', filters);
    return sp;
  }, [filters, q, sort]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack>
          <Typography variant="h6">
            {isCreate ? t('analytics.newAnalyticsCategory') : (data?.name || t('analytics.analyticsCategoryFallback'))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!isCreate && total > 0 ? t('shared.workspace.itemCountOf', { entity: t('analytics.analyticsCategoryFallback'), current: index + 1, total }) : ''}
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
              navigate(`/master-data/analytics${qs ? `?${qs}` : ''}`);
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">{t('analytics.loadError')}</Alert>}

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
          {routeTab === 'overview' && (
            isCreate ? (
              <AnalyticsCreateEditor ref={overviewCreateRef} onDirtyChange={updateDirty} />
            ) : (
              <AnalyticsOverviewEditor ref={overviewRef} id={id} onDirtyChange={updateDirty} readOnly={!canManage} />
            )
          )}
        </Box>
      </Box>
    </Box>
  );
}

