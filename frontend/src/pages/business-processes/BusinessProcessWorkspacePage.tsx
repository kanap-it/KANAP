import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Divider, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { useBusinessProcessNav } from '../../hooks/useBusinessProcessNav';
import BusinessProcessOverviewEditor, { BusinessProcessOverviewEditorHandle } from './editors/BusinessProcessOverviewEditor';
import BusinessProcessCreateEditor, { BusinessProcessCreateEditorHandle } from './editors/BusinessProcessCreateEditor';
import BusinessProcessCategoryManagerDialog from './BusinessProcessCategoryManagerDialog';

type TabKey = 'overview';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: 'Overview' },
];

export default function BusinessProcessWorkspacePage() {
  const navigate = useNavigate();
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

  const nav = useBusinessProcessNav({ id, sort, q, filters });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null, nextId: null }
    : nav;

  const { data, error } = useQuery({
    queryKey: ['business-processes', id],
    queryFn: async () => {
      const res = await api.get(`/business-processes/${id}`);
      return res.data;
    },
    enabled: !isCreate,
  });

  const overviewRef = React.useRef<BusinessProcessOverviewEditorHandle>(null);
  const createRef = React.useRef<BusinessProcessCreateEditorHandle>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false);

  const [dirty, setDirty] = React.useState(false);
  const updateDirty = React.useCallback((d: boolean) => setDirty(d), []);

  const handleSave = async () => {
    try {
      if (routeTab === 'overview') {
        if (isCreate) {
          const newId = await createRef.current?.save();
          if (newId) {
            const sp = new URLSearchParams(searchParams);
            navigate(`/master-data/business-processes/${newId}/overview?${sp.toString()}`);
          }
        } else {
          await overviewRef.current?.save();
        }
      }
      setDirty(false);
    } catch {
      // child editors handle their own errors
    }
  };

  const handleReset = () => {
    if (routeTab === 'overview') {
      if (isCreate) createRef.current?.reset();
      else overviewRef.current?.reset();
    }
    setDirty(false);
  };

  const confirmAndNavigate = async (targetId: string | null) => {
    if (!targetId) return;
    if (dirty) {
      const proceed = window.confirm('You have unsaved changes. Save before navigating?');
      if (proceed) {
        try {
          await handleSave();
        } catch {
          return;
        }
      } else {
        handleReset();
      }
    }
    navigate(`/master-data/business-processes/${targetId}/${routeTab}?${searchParams.toString()}`);
  };

  const handlePrev = () => {
    void confirmAndNavigate(prevId);
  };
  const handleNext = () => {
    void confirmAndNavigate(nextId);
  };

  const onTabChange = (_: React.SyntheticEvent, nextValue: TabKey) => {
    if (isCreate && nextValue !== 'overview') return;
    if (dirty) {
      const proceed = window.confirm('You have unsaved changes. Save before switching tabs?');
      if (proceed) {
        void handleSave().then(() =>
          navigate(`/master-data/business-processes/${id}/${nextValue}?${searchParams.toString()}`),
        );
        return;
      } else {
        handleReset();
      }
    }
    navigate(`/master-data/business-processes/${id}/${nextValue}?${searchParams.toString()}`);
  };

  const canManage = hasLevel('business_processes', 'manager');
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
            {isCreate ? 'New Business Process' : data?.name || 'Business Process'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {!isCreate && total > 0 ? `Process ${index + 1} of ${total}` : ''}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button onClick={handlePrev} disabled={!hasPrev}>
            Prev
          </Button>
          <Button onClick={handleReset} disabled={!dirty}>
            Reset
          </Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saveDisabled}>
            Save
          </Button>
          <Button onClick={handleNext} disabled={!hasNext}>
            Next
          </Button>
          <IconButton
            aria-label="Close"
            title="Close"
            onClick={() => {
              const qs = listContextParams.toString();
              navigate(`/master-data/business-processes${qs ? `?${qs}` : ''}`);
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {!!error && <Alert severity="error">Failed to load business process.</Alert>}

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ display: 'flex', minHeight: 420 }}>
        <Tabs
          orientation="vertical"
          value={routeTab}
          onChange={(_, value) => onTabChange(null as any, value as TabKey)}
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 160 }}
        >
          {tabs.map((t) => (
            <Tab key={t.key} label={t.label} value={t.key} disabled={isCreate && t.key !== 'overview'} />
          ))}
        </Tabs>

        <Box sx={{ flex: 1, pl: 3 }}>
          {routeTab === 'overview' && (
            isCreate ? (
              <BusinessProcessCreateEditor
                ref={createRef}
                onDirtyChange={updateDirty}
                onManageCategoriesClick={() => setCategoryManagerOpen(true)}
              />
            ) : (
              <BusinessProcessOverviewEditor
                ref={overviewRef}
                id={id}
                onDirtyChange={updateDirty}
                readOnly={!canManage}
                onManageCategoriesClick={() => setCategoryManagerOpen(true)}
              />
            )
          )}
        </Box>
      </Box>
      <BusinessProcessCategoryManagerDialog
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        onUpdated={() => {
          // Category changes are picked up via react-query in selectors
        }}
      />
    </Box>
  );
}
