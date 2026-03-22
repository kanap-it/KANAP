import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import LocationOverviewEditor, { LocationFormState } from './editors/LocationOverviewEditor';
import LocationContactsPanel, { LocationContactsPanelHandle } from './editors/LocationContactsPanel';
import LocationSubItemsPanel, { LocationSubItemsPanelHandle } from './editors/LocationSubItemsPanel';
import LocationRelationsPanel from './editors/LocationRelationsPanel';

type TabKey = 'overview' | 'contacts' | 'relations';

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'contacts', label: 'Contacts & Support' },
  { key: 'relations', label: 'Relations' },
];

const DEFAULT_LOCATION: LocationFormState = {
  code: '',
  name: '',
  hosting_type: '',
  operating_company_id: null,
  country_iso: '',
  city: '',
  datacenter: '',
  provider: '',
  region: '',
  additional_info: '',
};

export default function LocationWorkspacePage() {
  const { hasLevel } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const idParam = String(params.id || '');
  const tab = (params.tab as TabKey) || 'overview';
  const isCreate = idParam === 'new';
  const locationId = idParam;

  const [overviewData, setOverviewData] = React.useState<LocationFormState>({ ...DEFAULT_LOCATION });
  const [baselineData, setBaselineData] = React.useState<LocationFormState>({ ...DEFAULT_LOCATION });
  const [loading, setLoading] = React.useState(!isCreate);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [contactsDirty, setContactsDirty] = React.useState(false);
  const [subItemsDirty, setSubItemsDirty] = React.useState(false);
  const contactsRef = React.useRef<LocationContactsPanelHandle>(null);
  const subItemsRef = React.useRef<LocationSubItemsPanelHandle>(null);

  const canManage = hasLevel('locations', 'member');
  const canDelete = hasLevel('locations', 'member');

  const normalize = React.useCallback((form: LocationFormState) => {
    return {
      code: form.code || '',
      name: form.name || '',
      hosting_type: form.hosting_type || '',
      operating_company_id: form.operating_company_id || null,
      country_iso: (form.country_iso || '').toUpperCase(),
      city: form.city || '',
      datacenter: form.datacenter || '',
      provider: form.provider || '',
      region: form.region || '',
      additional_info: form.additional_info || '',
    };
  }, []);

  const overviewDirty = React.useMemo(() => {
    return JSON.stringify(normalize(overviewData)) !== JSON.stringify(normalize(baselineData));
  }, [normalize, overviewData, baselineData]);

  const dirty = overviewDirty || contactsDirty || subItemsDirty;

  const load = React.useCallback(async () => {
    if (isCreate) {
      setOverviewData({ ...DEFAULT_LOCATION });
      setBaselineData({ ...DEFAULT_LOCATION });
      setLoading(false);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get(`/locations/${locationId}`);
      const payload = res.data as any;
      const mapped: LocationFormState = {
        code: payload.code || '',
        name: payload.name || '',
        hosting_type: payload.hosting_type || '',
        operating_company_id: payload.operating_company_id || null,
        country_iso: (payload.country_iso || '').toString().toUpperCase(),
        city: payload.city || '',
        datacenter: payload.datacenter || '',
        provider: payload.provider || '',
        region: payload.region || '',
        additional_info: payload.additional_info || '',
      };
      setOverviewData(mapped);
      setBaselineData(mapped);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load location';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [isCreate, locationId]);

  React.useEffect(() => { void load(); }, [load]);

  const toPayload = React.useCallback((form: LocationFormState) => {
    const trimText = (value: string) => {
      const v = value ?? '';
      return v.trim();
    };
    return {
      code: trimText(form.code),
      name: trimText(form.name),
      hosting_type: form.hosting_type,
      operating_company_id: form.operating_company_id || null,
      country_iso: trimText(form.country_iso).toUpperCase() || null,
      city: trimText(form.city) || null,
      datacenter: trimText(form.datacenter) || null,
      provider: trimText(form.provider) || null,
      region: trimText(form.region) || null,
      additional_info: trimText(form.additional_info) || null,
    };
  }, []);

  const handleSaveOverview = async () => {
    const payload = toPayload(overviewData);
    if (!payload.code) {
      setSaveError('Code is required.');
      return;
    }
    if (!payload.name) {
      setSaveError('Name is required.');
      return;
    }
    if (!payload.hosting_type) {
      setSaveError('Hosting type is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    setDeleteError(null);
    try {
      if (isCreate) {
        const res = await api.post('/locations', payload);
        const saved = res.data as any;
        const mapped: LocationFormState = {
          code: saved.code || '',
          name: saved.name || '',
          hosting_type: saved.hosting_type || '',
          operating_company_id: saved.operating_company_id || null,
          country_iso: (saved.country_iso || '').toString().toUpperCase(),
          city: saved.city || '',
          datacenter: saved.datacenter || '',
          provider: saved.provider || '',
          region: saved.region || '',
          additional_info: saved.additional_info || '',
        };
        const sp = new URLSearchParams(searchParams);
        navigate(`/it/locations/${saved.id}/overview${sp.toString() ? `?${sp.toString()}` : ''}`, { replace: true });
        setOverviewData(mapped);
        setBaselineData(mapped);
      } else {
        const res = await api.patch(`/locations/${locationId}`, payload);
        const saved = res.data as any;
        const mapped: LocationFormState = {
          code: saved.code || '',
          name: saved.name || '',
          hosting_type: saved.hosting_type || '',
          operating_company_id: saved.operating_company_id || null,
          country_iso: (saved.country_iso || '').toString().toUpperCase(),
          city: saved.city || '',
          datacenter: saved.datacenter || '',
          provider: saved.provider || '',
          region: saved.region || '',
          additional_info: saved.additional_info || '',
        };
        setOverviewData(mapped);
        setBaselineData(mapped);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to save location';
      setSaveError(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!canManage) return;
    if (tab === 'overview') {
      await handleSaveOverview();
      if (!isCreate) {
        try {
          await subItemsRef.current?.save();
        } catch {
          // error handled inside panel
        }
      }
    } else if (tab === 'contacts' && !isCreate) {
      try {
        await contactsRef.current?.save();
      } catch {
        // error handled inside panel
      }
    }
  };

  const handleReset = () => {
    if (tab === 'overview') {
      setOverviewData(baselineData);
      setSaveError(null);
      subItemsRef.current?.reset();
    } else if (tab === 'contacts') {
      contactsRef.current?.reset();
    }
  };

  const listContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    const sort = searchParams.get('sort');
    const q = searchParams.get('q');
    const filters = searchParams.get('filters');
    if (sort) sp.set('sort', sort);
    if (q) sp.set('q', q);
    if (filters) sp.set('filters', filters);
    return sp;
  }, [searchParams]);

  const navigateWithTab = (nextTab: TabKey) => {
    const qs = searchParams.toString();
    navigate(`/it/locations/${locationId}/${nextTab}${qs ? `?${qs}` : ''}`);
  };

  const handleTabChange = (_: React.SyntheticEvent, nextTab: TabKey) => {
    if (tab === nextTab) return;
    if (dirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Continue without saving?');
      if (!confirmLeave) {
        return;
      }
    }
    navigateWithTab(nextTab);
  };

  const closeToList = () => {
    const qs = listContextParams.toString();
    navigate(`/it/locations${qs ? `?${qs}` : ''}`);
  };

  const handleOpenDeleteDialog = () => {
    if (isCreate || !canDelete || deleting) return;
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    if (deleting) return;
    setDeleteDialogOpen(false);
  };

  const handleDeleteLocation = async () => {
    if (isCreate || !canDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/locations/${locationId}`);
      setDeleteDialogOpen(false);
      closeToList();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to delete location';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const saveDisabled = !dirty || !canManage || saving || deleting;

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack>
          <Typography variant="h6">{isCreate ? 'New Location' : overviewData.name || 'Location'}</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {canDelete && !isCreate && (
            <Button color="error" onClick={handleOpenDeleteDialog} disabled={saving || deleting}>
              Delete
            </Button>
          )}
          <Button onClick={handleReset} disabled={!dirty || deleting}>Reset</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saveDisabled}>
            Save
          </Button>
          <IconButton onClick={closeToList}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>
      {(loading || saving || deleting) && <LinearProgress />}
      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
      {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', minHeight: 400 }}>
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={handleTabChange}
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 160 }}
        >
          {tabs.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              label={t.label}
              disabled={(isCreate && t.key !== 'overview') || (t.key === 'contacts' && isCreate)}
            />
          ))}
        </Tabs>
        <Box sx={{ flex: 1, pl: 3 }}>
          {tab === 'overview' && (
            <>
              <LocationOverviewEditor
                data={overviewData}
                onChange={(patch) => {
                  setOverviewData((prev) => ({ ...prev, ...patch }));
                }}
                readOnly={!canManage}
                disabled={loading}
              />
              <Box sx={{ mt: 3 }}>
                {isCreate ? (
                  <Alert severity="info">Sub-locations are available after you create the location.</Alert>
                ) : (
                  <LocationSubItemsPanel
                    id={locationId}
                    ref={subItemsRef}
                    onDirtyChange={(d) => setSubItemsDirty(d)}
                  />
                )}
              </Box>
            </>
          )}
          {tab === 'contacts' && !isCreate && (
            <LocationContactsPanel
              id={locationId}
              ref={contactsRef}
              onDirtyChange={(d) => setContactsDirty(d)}
            />
          )}
          {tab === 'contacts' && isCreate && (
            <Alert severity="info">Contacts are available after you create the location.</Alert>
          )}
          {tab === 'relations' && !isCreate && <LocationRelationsPanel id={locationId} />}
          {tab === 'relations' && isCreate && (
            <Alert severity="info">Relations are available after you create the location.</Alert>
          )}
        </Box>
      </Box>
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Delete location?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete this location and automatically unassign all linked assets.
          </DialogContentText>
          {dirty && (
            <DialogContentText sx={{ mt: 1 }}>
              You also have unsaved changes in this workspace. Those changes will be lost.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={deleting}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={() => void handleDeleteLocation()} disabled={deleting}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
