import React from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import { type IntegratedDocumentEditorHandle } from '../../components/IntegratedDocumentEditor';
import InterfaceBindingsMatrix from './components/InterfaceBindingsMatrix';
import type {
  InterfaceCompany,
  InterfaceDataResidency,
  InterfaceDependency,
  InterfaceDetail,
  InterfaceKeyIdentifier,
  InterfaceLeg,
  InterfaceLink,
  InterfaceOwner,
} from './components/interface-workspace';
import PortfolioWorkspaceShell from '../portfolio/workspace/PortfolioWorkspaceShell';
import InterfaceMappingTab, { type InterfaceMappingTabHandle } from './workspace/InterfaceMappingTab';
import InterfacePropertyPanel, { type InterfacePropertyPanelSection } from './workspace/InterfacePropertyPanel';
import InterfaceRelationsTab from './workspace/InterfaceRelationsTab';
import InterfaceSpecificationTab from './workspace/InterfaceSpecificationTab';
import InterfaceTechnicalTab from './workspace/InterfaceTechnicalTab';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import useItOpsEnumOptions from '../../hooks/useItOpsEnumOptions';
import { useRecentlyViewed } from '../workspace/hooks/useRecentlyViewed';

type WorkspaceTabKey = 'specification' | 'mapping' | 'relations' | 'technical' | 'environments';
type LegacyTabKey = 'overview' | 'ownership' | 'functional' | 'technical' | 'environments' | 'compliance';
type RouteTabKey = WorkspaceTabKey | LegacyTabKey;

const WORKSPACE_TABS = new Set<WorkspaceTabKey>(['specification', 'mapping', 'relations', 'technical', 'environments']);
const FOCUS_SECTIONS = new Set<InterfacePropertyPanelSection>(['core', 'team', 'data-compliance']);

const LEGACY_ROUTE_MAP: Record<LegacyTabKey, { tab: WorkspaceTabKey; section?: InterfacePropertyPanelSection }> = {
  overview: { tab: 'specification', section: 'core' },
  ownership: { tab: 'specification', section: 'team' },
  functional: { tab: 'specification' },
  compliance: { tab: 'specification', section: 'data-compliance' },
  technical: { tab: 'technical' },
  environments: { tab: 'environments' },
};

function normalizeUrl(raw: string) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function createInitialForm(): Partial<InterfaceDetail> {
  return {
    interface_id: '',
    name: '',
    specification_markdown: '',
    business_process_id: null,
    business_purpose: '',
    source_application_id: '',
    target_application_id: '',
    data_category: '',
    integration_route_type: 'direct',
    lifecycle: 'active',
    overview_notes: null,
    criticality: 'medium',
    impact_of_failure: null,
    business_objects: null,
    main_use_cases: null,
    functional_rules: null,
    core_transformations_summary: null,
    error_handling_summary: null,
    data_class: 'internal',
    contains_pii: false,
    pii_description: null,
    typical_data: null,
    audit_logging: null,
    security_controls_summary: null,
    middleware_application_ids: [],
    owners: [],
    companies: [],
    dependencies: [],
    key_identifiers: [],
    data_residency: [],
    links: [],
    attachments: [],
    legs: [],
  };
}

function buildCreatePayload(current: Partial<InterfaceDetail>) {
  return {
    interface_id: String(current.interface_id || '').trim(),
    name: String(current.name || '').trim(),
    specification_markdown: String(current.specification_markdown || '').trim() || null,
    business_process_id: current.business_process_id || null,
    business_purpose: String(current.business_purpose || '').trim(),
    source_application_id: current.source_application_id,
    target_application_id: current.target_application_id,
    data_category: current.data_category,
    integration_route_type: current.integration_route_type || 'direct',
    lifecycle: current.lifecycle || 'active',
    criticality: current.criticality || 'medium',
    data_class: current.data_class || 'internal',
    contains_pii: !!current.contains_pii,
    pii_description: current.pii_description ?? null,
    middleware_application_ids: (current.middleware_application_ids || []) as string[],
  };
}

function buildEditorPayload(current: Partial<InterfaceDetail>) {
  void current;
  return {};
}

export default function InterfaceWorkspacePage() {
  const { t } = useTranslation(['it', 'common']);
  const { labelFor } = useItOpsEnumOptions();
  const { hasLevel } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToRecent } = useRecentlyViewed();

  const canManage = hasLevel('applications', 'member');
  const idParam = String(params.id || '');
  const isCreate = idParam === 'new';
  const id = idParam;
  const rawRouteTab = (params.tab as RouteTabKey | undefined) || 'specification';
  const currentSection = searchParams.get('section');
  const propertyPanelFocusSection = (
    currentSection && FOCUS_SECTIONS.has(currentSection as InterfacePropertyPanelSection)
      ? currentSection as InterfacePropertyPanelSection
      : null
  );
  const routeTab: WorkspaceTabKey = WORKSPACE_TABS.has(rawRouteTab as WorkspaceTabKey)
    ? rawRouteTab as WorkspaceTabKey
    : LEGACY_ROUTE_MAP[rawRouteTab as LegacyTabKey]?.tab || 'specification';

  const [createForm, setCreateForm] = React.useState<Partial<InterfaceDetail>>(createInitialForm);
  const [data, setData] = React.useState<InterfaceDetail | null>(null);
  const dataRef = React.useRef<InterfaceDetail | null>(null);
  const specificationEditorRef = React.useRef<IntegratedDocumentEditorHandle>(null);
  const mappingEditorRef = React.useRef<InterfaceMappingTabHandle>(null);
  const [editorDirty, setEditorDirty] = React.useState(false);
  const [createDirty, setCreateDirty] = React.useState(false);
  const [managedSpecificationDirty, setManagedSpecificationDirty] = React.useState(false);
  const [mappingDirty, setMappingDirty] = React.useState(false);
  const [mappingActivated, setMappingActivated] = React.useState(() => rawRouteTab === 'mapping');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setMappingDirty(false);
    setMappingActivated(rawRouteTab === 'mapping');
  }, [id]);

  React.useEffect(() => {
    if (routeTab === 'mapping') {
      setMappingActivated(true);
    }
  }, [routeTab]);

  const replaceCurrent = React.useCallback((next: Partial<InterfaceDetail> | InterfaceDetail | null) => {
    if (isCreate) {
      setCreateForm((next || createInitialForm()) as Partial<InterfaceDetail>);
      return;
    }
    dataRef.current = (next || null) as InterfaceDetail | null;
    setData((next || null) as InterfaceDetail | null);
  }, [isCreate]);

  const applyLocalUpdater = React.useCallback((
    updater: (prev: Partial<InterfaceDetail>) => Partial<InterfaceDetail>,
    options?: { markCreateDirty?: boolean },
  ) => {
    if (isCreate) {
      setCreateForm((prev) => updater((prev || {}) as Partial<InterfaceDetail>));
      if (options?.markCreateDirty) {
        setCreateDirty(true);
      }
      return;
    }
    const base = (dataRef.current || data || {}) as Partial<InterfaceDetail>;
    const next = updater(base);
    dataRef.current = next as InterfaceDetail;
    setData(next as InterfaceDetail);
  }, [data, isCreate]);

  const applyLocalPatch = React.useCallback((
    patch: Partial<InterfaceDetail>,
    options?: { markCreateDirty?: boolean },
  ) => {
    applyLocalUpdater((prev) => ({ ...prev, ...patch }), options);
  }, [applyLocalUpdater]);

  const getCurrentState = React.useCallback(() => (
    (isCreate ? createForm : (dataRef.current || data || {})) as Partial<InterfaceDetail>
  ), [createForm, data, isCreate]);

  const load = React.useCallback(async () => {
    if (isCreate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<InterfaceDetail>(`/interfaces/${id}`, {
        params: { include: 'relations,legs' },
      });
      setData(response.data);
      dataRef.current = response.data;
      setEditorDirty(false);
      setManagedSpecificationDirty(false);
    } catch (loadError: any) {
      setError(getApiErrorMessage(loadError, t, t('messages.loadInterfaceFailed')));
      setData(null);
      dataRef.current = null;
      setManagedSpecificationDirty(false);
    } finally {
      setLoading(false);
    }
  }, [id, isCreate, t]);

  React.useEffect(() => {
    if (!params.tab) {
      navigate(`/it/interfaces/${id}/specification`, { replace: true });
      return;
    }

    const legacyRoute = !WORKSPACE_TABS.has(rawRouteTab as WorkspaceTabKey)
      ? LEGACY_ROUTE_MAP[rawRouteTab as LegacyTabKey]
      : null;
    if (legacyRoute) {
      const nextSearch = new URLSearchParams(searchParams);
      if (legacyRoute.section) {
        nextSearch.set('section', legacyRoute.section);
      } else {
        nextSearch.delete('section');
      }
      const nextQuery = nextSearch.toString();
      navigate(
        `/it/interfaces/${id}/${legacyRoute.tab}${nextQuery ? `?${nextQuery}` : ''}`,
        { replace: true },
      );
      return;
    }

    if (!WORKSPACE_TABS.has(rawRouteTab as WorkspaceTabKey)) {
      navigate(`/it/interfaces/${id}/specification`, { replace: true });
      return;
    }

    if (isCreate && rawRouteTab !== 'specification') {
      navigate(`/it/interfaces/${id}/specification`, { replace: true });
    }
  }, [id, isCreate, navigate, params.tab, rawRouteTab, searchParams]);

  React.useEffect(() => {
    if (!isCreate) {
      void load();
    }
  }, [isCreate, load]);

  React.useEffect(() => {
    if (data?.id && data?.name) {
      addToRecent('interface', data.id, data.name);
    }
  }, [addToRecent, data?.id, data?.name]);

  const persistPanelPatch = React.useCallback(async (patch: Partial<InterfaceDetail>) => {
    if (isCreate) {
      applyLocalPatch(patch, { markCreateDirty: true });
      return;
    }
    if (!canManage) {
      throw new Error(t('messages.saveInterfaceFailed'));
    }

    const previous = cloneState(getCurrentState());
    applyLocalPatch(patch);

    try {
      await api.patch(`/interfaces/${id}`, patch);
      const needsDetailRefresh = ['integration_route_type', 'source_application_id', 'target_application_id', 'business_process_id']
        .some((key) => Object.prototype.hasOwnProperty.call(patch, key));
      if (needsDetailRefresh) {
        const response = await api.get<InterfaceDetail>(`/interfaces/${id}`, { params: { include: 'legs' } });
        applyLocalPatch({
          source_application_name: response.data.source_application_name ?? null,
          target_application_name: response.data.target_application_name ?? null,
          business_process_name: response.data.business_process_name ?? null,
          legs: response.data.legs || [],
        });
      }
    } catch (panelError) {
      replaceCurrent(previous);
      throw panelError;
    }
  }, [applyLocalPatch, canManage, getCurrentState, id, isCreate, replaceCurrent, t]);

  const persistOwners = React.useCallback(async (ownerType: 'business' | 'it', userIds: string[]) => {
    const current = getCurrentState();
    const otherOwners = ((current.owners || []) as InterfaceOwner[]).filter((owner) => owner.owner_type !== ownerType);
    const nextOwners: InterfaceOwner[] = [
      ...otherOwners,
      ...Array.from(new Set(userIds.filter(Boolean))).map((userId) => ({ owner_type: ownerType, user_id: userId })),
    ];

    if (isCreate) {
      applyLocalPatch({ owners: nextOwners }, { markCreateDirty: true });
      return;
    }
    if (!canManage) {
      throw new Error(t('messages.saveInterfaceFailed'));
    }

    const previous = cloneState(current);
    applyLocalPatch({ owners: nextOwners });
    try {
      const payload = nextOwners
        .filter((owner) => owner.user_id)
        .map((owner) => ({ user_id: owner.user_id, owner_type: owner.owner_type }));
      await api.post(`/interfaces/${id}/owners/bulk-replace`, { owners: payload });
    } catch (panelError) {
      replaceCurrent(previous);
      throw panelError;
    }
  }, [applyLocalPatch, canManage, getCurrentState, id, isCreate, replaceCurrent, t]);

  const persistDataResidency = React.useCallback(async (codes: string[]) => {
    const uniqueCodes = Array.from(new Set(
      codes.map((code) => String(code || '').trim().toUpperCase()).filter((code) => code.length === 2),
    ));
    const nextRows: InterfaceDataResidency[] = uniqueCodes.map((country_iso) => ({ country_iso }));

    if (isCreate) {
      applyLocalPatch({ data_residency: nextRows }, { markCreateDirty: true });
      return;
    }
    if (!canManage) {
      throw new Error(t('messages.saveInterfaceFailed'));
    }

    const previous = cloneState(getCurrentState());
    applyLocalPatch({ data_residency: nextRows });
    try {
      await api.post(`/interfaces/${id}/data-residency/bulk-replace`, { countries: uniqueCodes });
    } catch (panelError) {
      replaceCurrent(previous);
      throw panelError;
    }
  }, [applyLocalPatch, canManage, getCurrentState, id, isCreate, replaceCurrent, t]);

  const updateEditor = React.useCallback((patch: Partial<InterfaceDetail>) => {
    if (isCreate) {
      applyLocalPatch(patch, { markCreateDirty: true });
      return;
    }
    applyLocalPatch(patch);
  }, [applyLocalPatch, isCreate]);

  const markEditorDirty = React.useCallback(() => {
    if (isCreate) {
      setCreateDirty(true);
      return;
    }
    setEditorDirty(true);
  }, [isCreate]);

  const persistAdditionalState = React.useCallback(async (interfaceId: string, current: Partial<InterfaceDetail>) => {
    const companies = Array.from(new Set(
      ((current.companies || []) as InterfaceCompany[])
        .map((item) => item.company_id)
        .filter((item) => typeof item === 'string' && item.trim() !== ''),
    ));

    const dependencies = (current.dependencies || []) as InterfaceDependency[];
    const upstreamIds = dependencies
      .filter((item) => item.direction === 'upstream')
      .map((item) => item.related_interface_id)
      .filter((item) => typeof item === 'string' && item.trim() !== '');
    const downstreamIds = dependencies
      .filter((item) => item.direction === 'downstream')
      .map((item) => item.related_interface_id)
      .filter((item) => typeof item === 'string' && item.trim() !== '');

    const keyIdentifiers = ((current.key_identifiers || []) as InterfaceKeyIdentifier[])
      .filter((item) => String(item.source_identifier || '').trim() || String(item.destination_identifier || '').trim())
      .map((item) => ({
        source_identifier: String(item.source_identifier || '').trim(),
        destination_identifier: String(item.destination_identifier || '').trim(),
        identifier_notes: String(item.identifier_notes || '').trim() || null,
      }))
      .filter((item) => item.source_identifier || item.destination_identifier);

    const countries = Array.from(new Set(
      ((current.data_residency || []) as InterfaceDataResidency[])
        .map((item) => String(item.country_iso || '').toUpperCase())
        .filter((item) => item.length === 2),
    ));

    const links = ((current.links || []) as InterfaceLink[])
      .filter((item) => String(item.url || '').trim())
      .map((item) => ({
        kind: String(item.kind || 'functional').trim() || 'functional',
        description: String(item.description || '').trim() || null,
        url: normalizeUrl(item.url),
      }));

    await Promise.all([
      api.post(`/interfaces/${interfaceId}/companies/bulk-replace`, { company_ids: companies }),
      api.post(`/interfaces/${interfaceId}/dependencies/bulk-replace`, {
        upstream_ids: upstreamIds,
        downstream_ids: downstreamIds,
      }),
      api.post(`/interfaces/${interfaceId}/key-identifiers/bulk-replace`, { items: keyIdentifiers }),
      api.post(`/interfaces/${interfaceId}/data-residency/bulk-replace`, { countries }),
      api.post(`/interfaces/${interfaceId}/links/bulk-replace`, { links }),
    ]);
  }, []);

  const handleSave = React.useCallback(async () => {
    setError(null);
    if (!isCreate && !canManage) {
      setError(t('messages.saveInterfaceFailed'));
      return false;
    }

    try {
      const current = getCurrentState();

      if (isCreate) {
        const payload = buildCreatePayload(current);
        if (!payload.interface_id || !payload.name || !payload.business_purpose) {
          setError('Interface ID, Name, and Business purpose are required');
          return false;
        }
        if (!payload.source_application_id || !payload.target_application_id) {
          setError('Select source and target applications');
          return false;
        }
        if (!payload.data_category) {
          setError('Select data category');
          return false;
        }

        const response = await api.post('/interfaces', payload);
        const newId = (response.data as any)?.id as string | undefined;
        if (!newId) {
          setError('Interface was created but no identifier was returned');
          return false;
        }

        await persistAdditionalState(newId, current);
        setCreateDirty(false);
        setEditorDirty(false);
        setManagedSpecificationDirty(false);
        navigate(`/it/interfaces/${newId}/specification`);
        return true;
      }

      const editorPayload = buildEditorPayload(current);
      if (Object.keys(editorPayload).length > 0) {
        await api.patch(`/interfaces/${id}`, editorPayload);
      }

      const legs = (current.legs || []) as InterfaceLeg[];
      if (legs.length > 0) {
        await api.patch(`/interfaces/${id}/legs`, {
          items: legs.map((leg) => ({
            id: leg.id,
            trigger_type: leg.trigger_type,
            integration_pattern: leg.integration_pattern,
            data_format: leg.data_format,
            job_name: leg.job_name,
          })),
        });
      }

      await persistAdditionalState(id, current);

      if (specificationEditorRef.current?.isDirty()) {
        const ok = await specificationEditorRef.current.save();
        if (!ok) {
          return false;
        }
      }

      if (mappingEditorRef.current?.isDirty()) {
        const ok = await mappingEditorRef.current.save();
        if (!ok) {
          return false;
        }
      }

      setEditorDirty(false);
      setManagedSpecificationDirty(false);
      setMappingDirty(false);
      await load();
      return true;
    } catch (saveError: any) {
      setError(getApiErrorMessage(saveError, t, t('messages.saveInterfaceFailed')));
      return false;
    }
  }, [canManage, getCurrentState, id, isCreate, load, navigate, persistAdditionalState, t]);

  const handleReset = React.useCallback(async () => {
    if (isCreate) {
      replaceCurrent(createInitialForm());
      setCreateDirty(false);
      setEditorDirty(false);
      setManagedSpecificationDirty(false);
      return;
    }

    await specificationEditorRef.current?.reset?.();
    await mappingEditorRef.current?.reset?.();
    await load();
    setEditorDirty(false);
    setManagedSpecificationDirty(false);
    setMappingDirty(false);
  }, [isCreate, load, replaceCurrent]);

  const hasUnsavedChanges = editorDirty || managedSpecificationDirty || mappingDirty || (isCreate && createDirty);

  const confirmSaveBeforeNavigate = React.useCallback(async () => {
    if (!hasUnsavedChanges) return true;
    const shouldSave = window.confirm(t('confirmations.unsavedSave'));
    if (!shouldSave) return true;
    return handleSave();
  }, [handleSave, hasUnsavedChanges, t]);

  const handleClose = React.useCallback(async () => {
    const canContinue = await confirmSaveBeforeNavigate();
    if (!canContinue) return;
    navigate('/it/interfaces');
  }, [confirmSaveBeforeNavigate, navigate]);

  const handleTabChange = React.useCallback(async (nextTab: string) => {
    const canContinue = await confirmSaveBeforeNavigate();
    if (!canContinue) return;
    navigate(`/it/interfaces/${id}/${nextTab}`);
  }, [confirmSaveBeforeNavigate, id, navigate]);

  const current = (isCreate ? createForm : data) as InterfaceDetail | null;

  const tabs = React.useMemo(() => [
    { key: 'specification', label: 'Specification', disabled: false },
    { key: 'technical', label: 'Technical', disabled: isCreate },
    { key: 'environments', label: 'Environments', disabled: isCreate },
    { key: 'mapping', label: 'Mapping', disabled: isCreate },
    { key: 'relations', label: 'Relations', disabled: isCreate },
  ], [isCreate]);

  const criticalityLabel = React.useCallback((value?: string) => {
    switch (String(value || '')) {
      case 'business_critical': return t('enums.criticality.businessCritical');
      case 'high': return t('enums.criticality.high');
      case 'medium': return t('enums.criticality.medium');
      case 'low': return t('enums.criticality.low');
      default: return String(value || '');
    }
  }, [t]);

  return (
    <Box sx={{ p: 2 }}>
      {!!error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      <PortfolioWorkspaceShell
        activeTab={routeTab}
        tabs={tabs}
        onTabChange={handleTabChange}
        sidebarCollapsible
        sidebarStorageKey="interfaceWorkspaceSidebarWidth"
        sidebarTitle="Interface properties"
        headerContent={(
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {current?.interface_id ? (
                <Typography component="span" variant="body2" sx={{ fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', monospace", color: 'text.secondary' }}>
                  {current.interface_id}
                </Typography>
              ) : null}
              <Typography variant="h6" sx={{ minWidth: 0 }}>
                {isCreate ? t('workspace.interface.newTitle') : current?.name || t('workspace.interface.title')}
              </Typography>
            </Stack>
            {!isCreate && (
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                {current?.lifecycle ? (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {labelFor('lifecycleStatus', current.lifecycle) || current.lifecycle}
                  </Typography>
                ) : null}
                {current?.criticality ? (
                  <Typography component="span" variant="body2" color="text.secondary">
                    {criticalityLabel(current.criticality)}
                  </Typography>
                ) : null}
                {current?.source_application_name && current?.target_application_name ? (
                  <Typography variant="body2" color="text.secondary">
                    {current.source_application_name} {'->'} {current.target_application_name}
                  </Typography>
                ) : null}
              </Stack>
            )}
          </Stack>
        )}
        headerActions={(
          <>
            {loading && !isCreate ? (
              <Typography variant="body2" color="text.disabled">Loading</Typography>
            ) : null}
            <Button
              onClick={() => { void handleReset(); }}
              disabled={loading || (!editorDirty && !managedSpecificationDirty && !mappingDirty && !(isCreate && createDirty))}
              size="small"
            >
              {t('common:buttons.reset')}
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleSave()}
              disabled={loading || (!isCreate && !editorDirty && !managedSpecificationDirty && !mappingDirty) || !canManage}
              size="small"
            >
              {t('common:buttons.save')}
            </Button>
            <IconButton
              aria-label={t('common:buttons.close')}
              title={t('common:buttons.close')}
              onClick={() => void handleClose()}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </>
        )}
        sidebar={(
          <InterfacePropertyPanel
            canManage={canManage}
            data={current}
            focusSection={propertyPanelFocusSection}
            isCreate={isCreate}
            onPatch={persistPanelPatch}
            onReplaceDataResidency={persistDataResidency}
            onReplaceOwners={persistOwners}
          />
        )}
      >
        {loading && !isCreate ? <LinearProgress sx={{ mb: 2 }} /> : null}

        {routeTab === 'specification' && (
          <InterfaceSpecificationTab
            canManage={canManage}
            data={current}
            isCreate={isCreate}
            specificationEditorRef={specificationEditorRef}
            onManagedDocumentDirtyChange={setManagedSpecificationDirty}
            update={updateEditor}
            markDirty={markEditorDirty}
          />
        )}

        {!isCreate && mappingActivated && (
          <Box sx={{ display: routeTab === 'mapping' ? 'block' : 'none' }}>
            <InterfaceMappingTab
              ref={mappingEditorRef}
              canManage={canManage}
              interfaceId={id}
              data={current}
              onDirtyChange={setMappingDirty}
            />
          </Box>
        )}

        {routeTab === 'relations' && !isCreate && (
          <InterfaceRelationsTab
            canManage={canManage}
            data={current}
            update={updateEditor}
            markDirty={markEditorDirty}
          />
        )}

        {routeTab === 'technical' && !isCreate && (
          <InterfaceTechnicalTab
            data={current}
            update={updateEditor}
            markDirty={markEditorDirty}
          />
        )}

        {routeTab === 'environments' && (
          !isCreate && current?.source_application_id && current?.target_application_id ? (
            <InterfaceBindingsMatrix
              interfaceId={current.id}
              interfaceName={current.name}
              sourceApplicationId={current.source_application_id}
              targetApplicationId={current.target_application_id}
              sourceApplicationName={current.source_application_name}
              targetApplicationName={current.target_application_name}
              middlewareApplicationIds={(current.middleware_application_ids || []) as string[]}
              legs={(current.legs || []) as InterfaceLeg[]}
              integrationRouteType={current.integration_route_type || 'direct'}
            />
          ) : !isCreate ? (
            <Alert severity="info">{t('workspace.interface.selectSourceTarget')}</Alert>
          ) : (
            <Alert severity="info">Save the interface first to manage environment bindings.</Alert>
          )
        )}
      </PortfolioWorkspaceShell>
    </Box>
  );
}
