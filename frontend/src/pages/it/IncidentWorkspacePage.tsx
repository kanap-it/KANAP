import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Menu, MenuItem, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  incidentsApi,
  type CreateIncidentInput,
  type Incident,
  type IncidentStatus,
  type UpdateIncidentInput,
} from '../../api/endpoints/incidents';
import { useAuth } from '../../auth/AuthContext';
import { PropertyRow, StatusDot, useKanapDialogs } from '../../components/design';
import EntityKnowledgePanel from '../../components/EntityKnowledgePanel';
import useAutosave from '../../hooks/useAutosave';
import { useIncidentItemNav } from '../../hooks/useModuleItemNav';
import { useLocale } from '../../i18n/useLocale';
import { formatShortDate } from '../../lib/dateFormat';
import { dialogBorderedFieldSx, drawerFieldValueSx, drawerMenuItemSx } from '../../theme/formSx';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import { downloadBlob } from '../../utils/downloadBlob';
import { formatItemRef } from '../../utils/item-ref';
import { getDotColor, INCIDENT_STATUS_COLORS } from '../../utils/statusColors';
import ForbiddenPage from '../ForbiddenPage';
import PortfolioDetailWorkspaceShell, {
  type PortfolioDetailWorkspaceTab,
} from '../portfolio/workspace/PortfolioDetailWorkspaceShell';
import IncidentAttachmentsTab from './workspace/IncidentAttachmentsTab';
import IncidentJournalTab, { incidentEntriesQueryKey } from './workspace/IncidentJournalTab';
import IncidentMetadataBar from './workspace/IncidentMetadataBar';
import IncidentOverviewTab from './workspace/IncidentOverviewTab';
import IncidentPropertiesDrawer, {
  type IncidentDrawerPatch,
  type IncidentDrawerValues,
} from './workspace/IncidentPropertiesDrawer';
import IncidentRelationsTab from './workspace/IncidentRelationsTab';
import {
  INCIDENT_STATUS_FLOW,
  incidentComposerSx,
  incidentSectionLabelSx,
  incidentStatusLabel,
  isForwardStatusMove,
  isIncidentLocked,
} from './workspace/incidentWorkspace';

const TAB_KEYS = ['overview', 'journal', 'relations', 'documents', 'attachments'] as const;
type TabKey = (typeof TAB_KEYS)[number];

type CreateForm = IncidentDrawerValues & { title: string; description: string };

const UUID_ROUTE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export function IncidentWorkspacePage() {
  const { t } = useTranslation(['it', 'common']);
  const { hasLevel, profile } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const dialogs = useKanapDialogs();
  const theme = useTheme();
  const locale = useLocale();

  const routeId = String(params.id || '');
  const isCreate = routeId === 'new';
  const rawTab = params.tab as TabKey | undefined;
  const validTab: TabKey = rawTab && TAB_KEYS.includes(rawTab) ? rawTab : 'overview';

  const canView = hasLevel('incidents', 'reader');
  const canEdit = hasLevel('incidents', 'contributor');
  const isAdmin = hasLevel('incidents', 'admin');

  const queryKey = React.useMemo(() => ['incident', routeId] as const, [routeId]);
  const { data, isPlaceholderData, error: loadError } = useQuery({
    queryKey,
    queryFn: () => incidentsApi.get(routeId),
    enabled: !isCreate && canView,
    placeholderData: (previous) => previous,
  });
  const stale = isPlaceholderData;
  const locked = !!data && isIncidentLocked(data.status);
  const editable = !!data && canEdit && !locked && !stale;
  const reference = data ? formatItemRef('incident', data.item_number) : null;
  const workspaceRouteId = isCreate ? 'new' : (!stale && reference) || routeId;

  const [error, setError] = React.useState<string | null>(null);
  const [statusAnchor, setStatusAnchor] = React.useState<HTMLElement | null>(null);
  const [createForm, setCreateForm] = React.useState<CreateForm>(() => ({
    title: '',
    description: '',
    category: null,
    severity: '',
    status: 'open',
    started_at: null,
    detected_at: new Date().toISOString(),
    resolved_at: null,
    closed_at: null,
    reporter_user_id: profile?.id ?? null,
    owner_user_id: null,
    source_ref: null,
    personal_data_affected: false,
    authority_notification_required: false,
    authority_notified_at: null,
    notified_parties: null,
  }));
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = React.useState(false);

  // Normalise a uuid route to the business ref once the incident is known.
  React.useEffect(() => {
    if (isCreate || stale || !reference || !UUID_ROUTE_RE.test(routeId)) return;
    const qs = searchParams.toString();
    window.history.replaceState(null, '', `/it/incidents/${reference}/${validTab}${qs ? `?${qs}` : ''}`);
  }, [isCreate, reference, routeId, searchParams, stale, validTab]);

  const setIncidentCache = React.useCallback((updater: (previous: Incident) => Incident) => {
    queryClient.setQueryData<Incident>(queryKey, (previous) => (previous ? updater(previous) : previous));
  }, [queryClient, queryKey]);

  const invalidateEntries = React.useCallback((incidentId: string) => {
    void queryClient.invalidateQueries({ queryKey: incidentEntriesQueryKey(incidentId) });
  }, [queryClient]);

  const patchNow = React.useCallback(async (patch: UpdateIncidentInput) => {
    if (!data || stale) return;
    const previous = data;
    setIncidentCache((current) => ({ ...current, ...patch }));
    setError(null);
    try {
      const saved = await incidentsApi.update(previous.id, patch);
      setIncidentCache(() => saved);
      if ('status' in patch || 'severity' in patch) invalidateEntries(previous.id);
    } catch (e) {
      setIncidentCache(() => previous);
      setError(getApiErrorMessage(e, t, t('workspace.incident.messages.saveFailed')));
    }
  }, [data, invalidateEntries, setIncidentCache, stale, t]);

  // Debounced autosave for long-form text: the cache is patched immediately so
  // the page never redraws from a server round-trip.
  const pendingPatchRef = React.useRef<UpdateIncidentInput>({});
  const incidentIdRef = React.useRef<string | null>(null);
  if (data && !stale) incidentIdRef.current = data.id;
  const handleAutosaveError = React.useCallback((e: unknown) => {
    setError(getApiErrorMessage(e, t, t('workspace.incident.messages.saveFailed')));
    void queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey, t]);
  const { schedule: scheduleSave, flush: flushSave, status: autosaveStatus } = useAutosave({
    onError: handleAutosaveError,
  });

  const flushPending = React.useCallback(async () => {
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};
    const incidentId = incidentIdRef.current;
    if (!incidentId || Object.keys(patch).length === 0) return;
    const saved = await incidentsApi.update(incidentId, patch);
    setIncidentCache((current) => ({ ...current, ...patch, updated_at: saved.updated_at }));
  }, [setIncidentCache]);

  const patchDebounced = React.useCallback((patch: UpdateIncidentInput) => {
    if (!editable) return;
    setIncidentCache((current) => ({ ...current, ...patch }));
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    scheduleSave(flushPending);
  }, [editable, flushPending, scheduleSave, setIncidentCache]);

  const listContextParams = React.useMemo(() => {
    const sp = new URLSearchParams();
    for (const key of ['sort', 'q', 'filters']) {
      const value = searchParams.get(key);
      if (value) sp.set(key, value);
    }
    return sp;
  }, [searchParams]);

  const handleClose = React.useCallback(async () => {
    if (!(await flushSave())) return;
    const qs = listContextParams.toString();
    navigate(`/it/incidents${qs ? `?${qs}` : ''}`);
  }, [flushSave, listContextParams, navigate]);

  const handleTabChange = React.useCallback(async (nextTab: string) => {
    if (nextTab === validTab) return;
    if (!(await flushSave())) return;
    if (validTab === 'documents') void queryClient.invalidateQueries({ queryKey });
    const qs = searchParams.toString();
    navigate(`/it/incidents/${workspaceRouteId}/${nextTab}${qs ? `?${qs}` : ''}`);
  }, [flushSave, navigate, queryClient, queryKey, searchParams, validTab, workspaceRouteId]);

  const navState = useIncidentItemNav({
    id: data && !stale ? data.id : '',
    sort: searchParams.get('sort'),
    q: searchParams.get('q'),
    filters: searchParams.get('filters'),
    enabled: !isCreate && canView,
  });
  const goToIncident = React.useCallback(async (target: string | null) => {
    if (!target) return;
    if (!(await flushSave())) return;
    const qs = searchParams.toString();
    navigate(`/it/incidents/${target}/${validTab}${qs ? `?${qs}` : ''}`);
  }, [flushSave, navigate, searchParams, validTab]);

  const handleTitleSave = React.useCallback((next: string) => {
    const trimmed = next.trim();
    if (!trimmed || !data || trimmed === data.title) return;
    void patchNow({ title: trimmed });
  }, [data, patchNow]);

  const handleDrawerChange = React.useCallback((patch: IncidentDrawerPatch) => {
    const { severity, detected_at, ...rest } = patch;
    const next: UpdateIncidentInput = { ...rest };
    if (severity) next.severity = severity;
    if (detected_at) next.detected_at = detected_at;
    void patchNow(next);
  }, [patchNow]);

  const handleStatusChange = React.useCallback((next: IncidentStatus) => {
    setStatusAnchor(null);
    if (!data || next === data.status) return;
    void patchNow({ status: next });
  }, [data, patchNow]);

  const handleReopen = React.useCallback(async () => {
    if (!data) return;
    const reason = await dialogs.prompt({
      title: t('workspace.incident.dialogs.reopenTitle'),
      message: t('workspace.incident.dialogs.reopenMessage'),
      placeholder: t('workspace.incident.dialogs.reopenPlaceholder'),
      confirmLabel: t('workspace.incident.dialogs.reopenConfirm'),
      required: true,
    });
    if (!reason?.trim()) return;
    try {
      const saved = await incidentsApi.reopen(data.id, reason.trim());
      setIncidentCache(() => saved);
      invalidateEntries(data.id);
    } catch (e) {
      setError(getApiErrorMessage(e, t, t('workspace.incident.messages.saveFailed')));
    }
  }, [data, dialogs, invalidateEntries, setIncidentCache, t]);

  const handleCancel = React.useCallback(async () => {
    if (!data) return;
    const reason = await dialogs.prompt({
      title: t('workspace.incident.dialogs.cancelTitle'),
      message: t('workspace.incident.dialogs.cancelMessage'),
      placeholder: t('workspace.incident.dialogs.cancelPlaceholder'),
      confirmLabel: t('workspace.incident.dialogs.cancelConfirm'),
      required: true,
      intent: 'danger',
    });
    if (!reason?.trim()) return;
    try {
      const saved = await incidentsApi.cancel(data.id, reason.trim());
      setIncidentCache(() => saved);
      invalidateEntries(data.id);
    } catch (e) {
      setError(getApiErrorMessage(e, t, t('workspace.incident.messages.saveFailed')));
    }
  }, [data, dialogs, invalidateEntries, setIncidentCache, t]);

  const handleCreate = React.useCallback(async () => {
    if (!canEdit || createSubmitting) return;
    const title = createForm.title.trim();
    const severity = createForm.severity;
    const detectedAt = createForm.detected_at;
    if (!title) {
      setCreateError(t('workspace.incident.create.titleRequired'));
      return;
    }
    if (!severity) {
      setCreateError(t('workspace.incident.create.severityRequired'));
      return;
    }
    if (!detectedAt) {
      setCreateError(t('workspace.incident.create.detectedRequired'));
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const payload: CreateIncidentInput = {
        title,
        severity,
        detected_at: detectedAt,
        category: createForm.category,
        started_at: createForm.started_at,
        reporter_user_id: createForm.reporter_user_id,
        owner_user_id: createForm.owner_user_id,
        source_ref: createForm.source_ref,
        personal_data_affected: createForm.personal_data_affected,
        authority_notification_required: createForm.authority_notification_required,
        authority_notified_at: createForm.authority_notified_at,
        notified_parties: createForm.notified_parties,
        description: createForm.description.trim() || null,
      };
      const saved = await incidentsApi.create(payload);
      const savedRef = formatItemRef('incident', saved.item_number);
      queryClient.setQueryData<Incident>(['incident', savedRef], saved);
      void queryClient.invalidateQueries({ queryKey: ['incidents-ids'] });
      const qs = listContextParams.toString();
      navigate(`/it/incidents/${savedRef}/overview${qs ? `?${qs}` : ''}`, { replace: true });
    } catch (e) {
      setCreateError(getApiErrorMessage(e, t, t('workspace.incident.messages.createFailed')));
    } finally {
      setCreateSubmitting(false);
    }
  }, [canEdit, createForm, createSubmitting, listContextParams, navigate, queryClient, t]);

  const handleExportPdf = React.useCallback(async () => {
    if (!data || isCreate || exportingPdf) return;
    setExportingPdf(true);
    try {
      const result = await incidentsApi.exportReport(routeId, locale);
      const fallback = `${formatItemRef('incident', data.item_number)}-incident-report.pdf`;
      downloadBlob(result.blob, result.filename || fallback);
    } catch (e) {
      let message = t('workspace.incident.messages.exportPdfFailed');
      const blobData = (e as { response?: { data?: unknown } })?.response?.data;
      if (blobData instanceof Blob) {
        try {
          const parsed = JSON.parse(await blobData.text()) as { message?: unknown };
          if (typeof parsed?.message === 'string' && parsed.message.trim()) message = parsed.message;
        } catch {
          // keep the fallback
        }
      } else {
        message = getApiErrorMessage(e, t, message);
      }
      await dialogs.alert({ message, intent: 'danger' });
    } finally {
      setExportingPdf(false);
    }
  }, [data, dialogs, exportingPdf, isCreate, locale, routeId, t]);

  if (!canView) return <ForbiddenPage />;

  const { total, index, hasPrev, hasNext, prevId, nextId } = navState;
  const counts = data?.counts;
  const tabs: PortfolioDetailWorkspaceTab[] = [
    { key: 'overview', label: t('workspace.incident.tabs.overview') },
    { key: 'journal', label: t('workspace.incident.tabs.journal'), badge: counts?.entries || undefined, disabled: isCreate },
    {
      key: 'relations',
      label: t('workspace.incident.tabs.relations'),
      badge: counts ? (counts.assets + counts.applications + counts.tasks) || undefined : undefined,
      disabled: isCreate,
    },
    { key: 'documents', label: t('workspace.incident.tabs.documents'), badge: counts?.documents || undefined, disabled: isCreate },
    { key: 'attachments', label: t('workspace.incident.tabs.attachments'), badge: counts?.attachments || undefined, disabled: isCreate },
  ];

  const savingHint = autosaveStatus === 'saving' || autosaveStatus === 'pending'
    ? t('common:status.saving')
    : autosaveStatus === 'saved'
      ? t('common:status.saved')
      : null;
  const lockedBanner = data && locked
    ? t(data.status === 'cancelled' ? 'workspace.incident.overview.cancelledBanner' : 'workspace.incident.overview.closedBanner', {
      date: formatShortDate(data.closed_at || data.updated_at, locale, { year: 'always' }),
    })
    : null;

  const statusColor = (status: string) => getDotColor(INCIDENT_STATUS_COLORS[status], theme.palette.mode);

  const actions = (
    <>
      {isCreate && (
        <Button
          variant="contained"
          size="small"
          onClick={() => void handleCreate()}
          disabled={createSubmitting || !canEdit}
        >
          {t('common:buttons.create')}
        </Button>
      )}
      {!isCreate && data && canView && (
        <Button
          variant="action"
          size="small"
          onClick={() => void handleExportPdf()}
          disabled={exportingPdf}
          startIcon={exportingPdf ? <CircularProgress size={12} /> : undefined}
        >
          {t('workspace.incident.actions.exportPdf')}
        </Button>
      )}
      {!isCreate && data && canEdit && !locked && (
        <>
          <Button
            variant="action"
            size="small"
            onClick={(event) => setStatusAnchor(event.currentTarget)}
            disabled={!editable}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: '16px !important' }} />}
            title={t('workspace.incident.actions.changeStatus')}
          >
            <StatusDot color={statusColor(data.status)} size={8} sx={{ mr: '6px' }} />
            {incidentStatusLabel(t, data.status)}
          </Button>
          <Menu anchorEl={statusAnchor} open={!!statusAnchor} onClose={() => setStatusAnchor(null)}>
            {INCIDENT_STATUS_FLOW.map((status) => {
              const forward = isForwardStatusMove(data.status, status);
              return (
                <MenuItem
                  key={status}
                  selected={status === data.status}
                  disabled={!forward}
                  onClick={() => handleStatusChange(status)}
                  sx={{ ...drawerMenuItemSx, gap: '8px' }}
                >
                  <StatusDot color={statusColor(status)} size={8} />
                  {incidentStatusLabel(t, status)}
                  {!forward && (
                    <Box component="span" sx={{ ml: 'auto', pl: 1.5, fontSize: 11, color: 'kanap.text.tertiary' }}>
                      {t('workspace.incident.actions.useReopen')}
                    </Box>
                  )}
                </MenuItem>
              );
            })}
          </Menu>
        </>
      )}
      {!isCreate && data && isAdmin && (data.status === 'resolved' || locked) && (
        <Button variant="action" size="small" onClick={() => void handleReopen()} disabled={stale}>
          {t('workspace.incident.actions.reopen')}
        </Button>
      )}
      {!isCreate && data && isAdmin && !locked && (
        <Button variant="action-danger" size="small" onClick={() => void handleCancel()} disabled={stale}>
          {t('workspace.incident.actions.cancel')}
        </Button>
      )}
    </>
  );

  const properties = isCreate ? (
    <IncidentPropertiesDrawer
      values={createForm}
      isCreate
      disabled={createSubmitting || !canEdit}
      onChange={(patch) => setCreateForm((previous) => ({ ...previous, ...patch }))}
    />
  ) : data ? (
    <IncidentPropertiesDrawer
      key={data.id}
      values={data}
      isCreate={false}
      disabled={!editable}
      onChange={handleDrawerChange}
    />
  ) : (
    <Box />
  );

  const metadata = !isCreate && data ? (
    <IncidentMetadataBar
      incident={data}
      disabled={!editable}
      onSeverityChange={(severity) => void patchNow({ severity })}
      onOwnerChange={(owner_user_id) => void patchNow({ owner_user_id })}
      onDetectedAtChange={(detected_at) => void patchNow({ detected_at })}
    />
  ) : undefined;

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {loadError && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }}>
          {getApiErrorMessage(loadError, t, t('workspace.incident.messages.loadFailed'))}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
      <PortfolioDetailWorkspaceShell
        activeTab={validTab}
        tabs={tabs}
        onTabChange={(next) => { void handleTabChange(next); }}
        drawerStorageKey="kanap.incidents.drawerOpen"
        backLabel={t('workspace.incident.backLabel')}
        onBack={() => { void handleClose(); }}
        itemReference={!isCreate ? reference : null}
        onCopyReference={!isCreate && reference ? () => { void navigator.clipboard?.writeText(reference); } : undefined}
        title={isCreate ? createForm.title : data?.title || ''}
        titleFallback={isCreate ? t('workspace.incident.newTitle') : t('workspace.incident.untitled')}
        canEditTitle={editable}
        onTitleSave={handleTitleSave}
        isCreate={isCreate}
        forceDrawerOpen={isCreate}
        onSaveShortcut={() => { void flushSave(); }}
        nav={!isCreate && total > 0 ? {
          currentIndex: index + 1,
          totalCount: total,
          hasPrev,
          hasNext,
          onPrev: () => { void goToIncident(prevId); },
          onNext: () => { void goToIncident(nextId); },
          previousLabel: t('workspace.incident.previous'),
          nextLabel: t('workspace.incident.next'),
        } : undefined}
        metadata={metadata}
        actions={actions}
        properties={properties}
      >
        {isCreate ? (
          <Box sx={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <PropertyRow label={t('workspace.incident.create.title')} required valueSx={{ maxWidth: 560 }}>
              <TextField
                value={createForm.title}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, title: event.target.value }))}
                placeholder={t('workspace.incident.create.titlePlaceholder')}
                required
                size="small"
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
                disabled={createSubmitting || !canEdit}
              />
            </PropertyRow>
            <Box>
              <Typography component="label" sx={incidentSectionLabelSx}>
                {t('workspace.incident.create.description')}
              </Typography>
              <TextField
                value={createForm.description}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, description: event.target.value }))}
                multiline
                minRows={4}
                fullWidth
                variant="standard"
                placeholder={t('workspace.incident.overview.descriptionPlaceholder')}
                InputProps={{ disableUnderline: true }}
                sx={incidentComposerSx}
                disabled={createSubmitting || !canEdit}
              />
            </Box>
            {createError && <Alert severity="error">{createError}</Alert>}
          </Box>
        ) : !data ? null : (
          <>
            {validTab === 'overview' && (
              <IncidentOverviewTab
                key={data.id}
                incident={data}
                readOnly={!editable}
                lockedBanner={lockedBanner}
                savingHint={savingHint}
                onPatchDebounced={patchDebounced}
              />
            )}
            {validTab === 'journal' && (
              <IncidentJournalTab
                key={data.id}
                incidentId={data.id}
                canAdd={editable}
                onEntryAdded={() => setIncidentCache((current) => ({
                  ...current,
                  counts: { ...current.counts, entries: current.counts.entries + 1 },
                }))}
              />
            )}
            {validTab === 'relations' && (
              <IncidentRelationsTab
                key={data.id}
                incidentId={data.id}
                readOnly={!editable}
                onLinksChange={(kind, count) => setIncidentCache((current) => ({
                  ...current,
                  counts: { ...current.counts, [kind]: count },
                }))}
                onTasksChange={() => { void queryClient.invalidateQueries({ queryKey }); }}
              />
            )}
            {validTab === 'documents' && (
              <EntityKnowledgePanel entityType="incidents" entityId={data.id} canCreate={editable} />
            )}
            {validTab === 'attachments' && (
              <IncidentAttachmentsTab
                key={data.id}
                incidentId={data.id}
                canManage={editable}
                onCountChange={(count) => setIncidentCache((current) => ({
                  ...current,
                  counts: { ...current.counts, attachments: count },
                }))}
              />
            )}
          </>
        )}
      </PortfolioDetailWorkspaceShell>
    </Box>
  );
}

export default IncidentWorkspacePage;
