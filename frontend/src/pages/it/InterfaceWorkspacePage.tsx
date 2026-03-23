import React from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { WorkspaceLayout, WorkspaceActions } from '../../components/workspace/WorkspaceLayout';
import InterfaceBindingsMatrix from './components/InterfaceBindingsMatrix';
import {
  OverviewTab,
  OwnershipTab,
  FunctionalTab,
  TechnicalTab,
  ComplianceTab,
  InterfaceDetail,
  InterfaceLeg,
  InterfaceOwner,
  InterfaceCompany,
  InterfaceDependency,
  InterfaceKeyIdentifier,
  InterfaceDataResidency,
  TabKey,
} from './components/interface-workspace';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';

export default function InterfaceWorkspacePage() {
  const { t } = useTranslation(['it', 'common']);
  const params = useParams();
  const navigate = useNavigate();
  const idParam = String(params.id || '');
  const id = idParam;
  const isCreate = idParam === 'new';
  const tab = (params.tab as TabKey) || 'overview';

  const [createForm, setCreateForm] = React.useState<Partial<InterfaceDetail>>({
    interface_id: '',
    name: '',
    business_purpose: '',
    lifecycle: 'active',
    criticality: 'medium',
    data_class: 'internal',
    contains_pii: false,
    data_category: '',
    integration_route_type: 'direct',
  });
  const [data, setData] = React.useState<InterfaceDetail | null>(null);
  const dataRef = React.useRef<InterfaceDetail | null>(null);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    if (isCreate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<InterfaceDetail>(`/interfaces/${id}`, {
        params: { include: 'relations,legs' },
      });
      setData(res.data);
      dataRef.current = res.data;
      setDirty(false);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.loadInterfaceFailed')));
      setData(null);
      dataRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [id, isCreate]);

  React.useEffect(() => {
    if (!isCreate) {
      void load();
    }
  }, [isCreate, load]);

  const update = React.useCallback(
    (patch: Partial<InterfaceDetail>) => {
      setDirty(true);
      if (isCreate) {
        setCreateForm((prev) => ({ ...prev, ...patch }));
        return;
      }
      const base = dataRef.current ?? data ?? null;
      const next = { ...(base || {}), ...patch } as InterfaceDetail;
      dataRef.current = next;
      setData((prev) => ({ ...(prev || ({} as any)), ...patch }));
    },
    [data, isCreate],
  );

  const handleSave = async () => {
    setError(null);
    try {
      if (isCreate) {
        const payload = {
          interface_id: String(createForm.interface_id || '').trim(),
          name: String(createForm.name || '').trim(),
          business_purpose: String(createForm.business_purpose || '').trim(),
          business_process_id: createForm.business_process_id || null,
          source_application_id: createForm.source_application_id,
          target_application_id: createForm.target_application_id,
          data_category: createForm.data_category,
          integration_route_type: createForm.integration_route_type || 'direct',
          lifecycle: createForm.lifecycle || 'active',
          overview_notes: createForm.overview_notes || null,
          criticality: createForm.criticality || 'medium',
          impact_of_failure: createForm.impact_of_failure || null,
          data_class: createForm.data_class || 'internal',
          contains_pii: !!createForm.contains_pii,
          pii_description: createForm.pii_description || null,
          typical_data: createForm.typical_data || null,
          audit_logging: createForm.audit_logging || null,
          security_controls_summary: createForm.security_controls_summary || null,
          middleware_application_ids: (createForm.middleware_application_ids || []) as string[],
        };
        if (!payload.interface_id || !payload.name || !payload.business_purpose) {
          setError('Interface ID, Name, and Business purpose are required');
          return;
        }
        if (!payload.source_application_id || !payload.target_application_id) {
          setError('Select source and target applications');
          return;
        }
        if (!payload.data_category) {
          setError('Select data category');
          return;
        }
        const res = await api.post('/interfaces', payload);
        const newId = (res.data as any)?.id as string;
        setDirty(false);
        if (newId) {
          navigate(`/it/interfaces/${newId}/overview`);
        }
        return;
      }

      const current = (dataRef.current || data || {}) as InterfaceDetail;
      const body: any = {
        interface_id: current.interface_id,
        name: current.name,
        business_process_id: current.business_process_id || null,
        business_purpose: current.business_purpose,
        source_application_id: current.source_application_id,
        target_application_id: current.target_application_id,
        data_category: current.data_category,
        integration_route_type: current.integration_route_type,
        lifecycle: current.lifecycle,
        overview_notes: current.overview_notes ?? null,
        criticality: current.criticality,
        impact_of_failure: current.impact_of_failure ?? null,
        business_objects: current.business_objects ?? null,
        main_use_cases: current.main_use_cases ?? null,
        functional_rules: current.functional_rules ?? null,
        core_transformations_summary: current.core_transformations_summary ?? null,
        error_handling_summary: current.error_handling_summary ?? null,
        data_class: current.data_class,
        contains_pii: !!current.contains_pii,
        pii_description: current.pii_description ?? null,
        typical_data: current.typical_data ?? null,
        audit_logging: current.audit_logging ?? null,
        security_controls_summary: current.security_controls_summary ?? null,
        middleware_application_ids: (current.middleware_application_ids || []) as string[],
      };
      await api.patch(`/interfaces/${id}`, body);

      const legsRaw = (current.legs || []) as InterfaceLeg[];
      if (legsRaw && legsRaw.length > 0) {
        const items = legsRaw.map((leg) => ({
          id: leg.id,
          trigger_type: leg.trigger_type,
          integration_pattern: leg.integration_pattern,
          data_format: leg.data_format,
          job_name: leg.job_name,
        }));
        await api.patch(`/interfaces/${id}/legs`, { items });
      }

      const ownersRaw = (current.owners || []) as InterfaceOwner[];
      const seenOwners = new Set<string>();
      const ownersPayload = ownersRaw
        .filter((o) => typeof o.user_id === 'string' && o.user_id.trim() !== '')
        .filter((o) => {
          const k = `${o.owner_type}:${o.user_id}`;
          if (seenOwners.has(k)) return false;
          seenOwners.add(k);
          return true;
        })
        .map((o) => ({ user_id: o.user_id, owner_type: o.owner_type }));

      const companiesRaw = (current.companies || []) as InterfaceCompany[];
      const companyIds = Array.from(
        new Set(
          companiesRaw
            .map((c) => c.company_id)
            .filter((cid) => typeof cid === 'string' && cid.trim() !== ''),
        ),
      );

      const depsRaw = (current.dependencies || []) as InterfaceDependency[];
      const upstreamIds = depsRaw.filter((d) => d.direction === 'upstream').map((d) => d.related_interface_id);
      const downstreamIds = depsRaw.filter((d) => d.direction === 'downstream').map((d) => d.related_interface_id);

      const keyIdsRaw = (current.key_identifiers || []) as InterfaceKeyIdentifier[];
      const keyItems = keyIdsRaw.map((k) => ({
        source_identifier: k.source_identifier,
        destination_identifier: k.destination_identifier,
        identifier_notes: k.identifier_notes ?? null,
      }));

      const residencyRaw = (current.data_residency || []) as InterfaceDataResidency[];
      const countries = Array.from(
        new Set(
          residencyRaw
            .map((r) => (r.country_iso || '').toUpperCase())
            .filter((c) => !!c && c.length === 2),
        ),
      );

      await Promise.all([
        api.post(`/interfaces/${id}/owners/bulk-replace`, { owners: ownersPayload }),
        api.post(`/interfaces/${id}/companies/bulk-replace`, { company_ids: companyIds }),
        api.post(`/interfaces/${id}/dependencies/bulk-replace`, { upstream_ids: upstreamIds, downstream_ids: downstreamIds }),
        api.post(`/interfaces/${id}/key-identifiers/bulk-replace`, { items: keyItems }),
        api.post(`/interfaces/${id}/data-residency/bulk-replace`, { countries }),
      ]);

      setDirty(false);
      await load();
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveInterfaceFailed')));
    }
  };

  const handleReset = () => {
    if (isCreate) {
      setCreateForm({
        interface_id: '',
        name: '',
        business_purpose: '',
        lifecycle: 'active',
        criticality: 'medium',
        data_class: 'internal',
        contains_pii: false,
        data_category: '',
        integration_route_type: 'direct',
      });
      setDirty(false);
    } else {
      void load();
      setDirty(false);
    }
  };

  const handleClose = async () => {
    if (dirty) {
      const save = window.confirm(t('confirmations.unsavedSave'));
      if (save) {
        try {
          await handleSave();
        } catch {
          // ignore, error already surfaced
        }
      }
    }
    navigate('/it/interfaces');
  };

  const handleTabChange = async (newTab: string) => {
    if (dirty) {
      const save = window.confirm(t('confirmations.unsavedSave'));
      if (save) {
        try {
          await handleSave();
        } catch {
          // ignore, error already surfaced
        }
      }
    }
    navigate(`/it/interfaces/${id}/${newTab}`);
  };

  const current = (isCreate ? createForm : data) as InterfaceDetail | null;
  const markDirty = () => setDirty(true);

  const showReset = tab !== 'overview' && tab !== 'ownership' && tab !== 'functional';

  const actions = (
    <WorkspaceActions
      onClose={handleClose}
      onReset={handleReset}
      onSave={() => void handleSave()}
      dirty={dirty}
      loading={loading}
      showReset={showReset}
    />
  );

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <OverviewTab
          data={current}
          update={update}
          markDirty={markDirty}
          isCreate={isCreate}
        />
      ),
    },
    {
      id: 'ownership',
      label: 'Ownership & Criticality',
      disabled: isCreate,
      content: !isCreate ? (
        <OwnershipTab data={current} update={update} markDirty={markDirty} />
      ) : null,
    },
    {
      id: 'functional',
      label: 'Functional Definition',
      disabled: isCreate,
      content: !isCreate ? (
        <FunctionalTab data={current} update={update} markDirty={markDirty} />
      ) : null,
    },
    {
      id: 'technical',
      label: 'Technical Definition',
      disabled: isCreate,
      content: !isCreate ? (
        <TechnicalTab data={current} update={update} markDirty={markDirty} />
      ) : null,
    },
    {
      id: 'environments',
      label: 'Bindings & Connections',
      disabled: isCreate,
      content: !isCreate && current?.source_application_id && current?.target_application_id ? (
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
      ) : !isCreate && (!current?.source_application_id || !current?.target_application_id) ? (
        <Alert severity="info">Select source and target applications to manage bindings.</Alert>
      ) : null,
    },
    {
      id: 'compliance',
      label: 'Data & Compliance',
      disabled: isCreate,
      content: !isCreate ? (
        <ComplianceTab data={current} update={update} markDirty={markDirty} />
      ) : null,
    },
  ];

  return (
    <WorkspaceLayout
      title={isCreate ? t('workspace.interface.newTitle') : current?.name || t('workspace.interface.title')}
      tabs={tabs}
      currentTab={tab}
      onTabChange={handleTabChange}
      actions={actions}
      error={error}
      onErrorClose={() => setError(null)}
      loading={loading}
    />
  );
}
