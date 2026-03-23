import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Divider, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useSupplierNav } from '../../hooks/useSupplierNav';
import SupplierOverviewEditor, { SupplierOverviewEditorHandle } from './editors/SupplierOverviewEditor';
import SupplierCreateEditor, { SupplierCreateEditorHandle } from './editors/SupplierCreateEditor';
import SupplierContactsPanel from './editors/SupplierContactsPanel';

type TabKey = 'overview' | 'contacts';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'contacts', label: 'Contacts' },
];

export default function SupplierWorkspacePage() {
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

  const nav = useSupplierNav({ id, sort, q, filters });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null, nextId: null }
    : nav;

  const { data, error } = useQuery({
    queryKey: ['suppliers', id],
    queryFn: async () => { const res = await api.get(`/suppliers/${id}`); return res.data; },
    enabled: !isCreate,
  });

  const overviewRef = React.useRef<SupplierOverviewEditorHandle>(null);
  const overviewCreateRef = React.useRef<SupplierCreateEditorHandle>(null);

  const [dirty, setDirty] = React.useState(false);
  const updateDirty = React.useCallback((d: boolean) => setDirty(d), []);

  const handleSave = async () => {
    try {
      if (routeTab === 'overview') {
        if (isCreate) {
          const newId = await overviewCreateRef.current?.save();
          if (newId) {
            const sp = new URLSearchParams(searchParams);
            navigate(`/master-data/suppliers/${newId}/overview?${sp.toString()}`);
          }
        } else {
          await overviewRef.current?.save();
        }
      }
      // Contacts tab performs immediate mutations; no explicit save
      setDirty(false);
    } catch {
      // child editor handles its own errors
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
      const proceed = window.confirm('You have unsaved changes. Save before navigating?');
      if (proceed) {
        try { await handleSave(); } catch { return; }
      } else {
        handleReset();
      }
    }
    navigate(`/master-data/suppliers/${targetId}/${routeTab}?${searchParams.toString()}`);
  };

  const handlePrev = () => { void confirmAndNavigate(prevId); };
  const handleNext = () => { void confirmAndNavigate(nextId); };

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'overview') return;
    if (dirty) {
      const proceed = window.confirm('You have unsaved changes. Save before switching tabs?');
      if (proceed) {
        void handleSave().then(() => navigate(`/master-data/suppliers/${id}/${nextValue}?${searchParams.toString()}`));
        return;
      } else {
        handleReset();
      }
    }
    navigate(`/master-data/suppliers/${id}/${nextValue}?${searchParams.toString()}`);
  };

  const canManageSuppliers = hasLevel('suppliers', 'manager');
  const saveDisabled = !dirty || !canManageSuppliers;

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
            {isCreate ? t('suppliers.newSupplier') : (data?.name || t('suppliers.supplierFallback'))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!isCreate && total > 0 ? t('shared.workspace.itemCountOf', { entity: t('suppliers.supplierFallback'), current: index + 1, total }) : ''}
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
              navigate(`/master-data/suppliers${qs ? `?${qs}` : ''}`);
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">{t('suppliers.loadError')}</Alert>}

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
              {t('suppliers.contactsTabHint')}
            </Typography>
          )}

          {routeTab === 'overview' && (
            isCreate ? (
              <SupplierCreateEditor ref={overviewCreateRef} onDirtyChange={updateDirty} />
            ) : (
              <SupplierOverviewEditor ref={overviewRef} id={id} onDirtyChange={updateDirty} readOnly={!canManageSuppliers} />
            )
          )}

          {routeTab === 'contacts' && !isCreate && (
            <SupplierContactsPanel supplierId={id} canManage={canManageSuppliers} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
