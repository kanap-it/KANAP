import React from 'react';
import { Alert } from '@mui/material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import { ServerOption } from '../../components/fields/ServerSelect';
import { WorkspaceLayout, WorkspaceActions } from '../../components/workspace/WorkspaceLayout';
import {
  OverviewTab,
  LayersTab,
  ComplianceTab,
  InterfacesTab,
  ConnectionDetail,
  ConnectionLeg,
  LinkedInterfaceBinding,
  TabKey,
} from './components/connection-workspace';

export default function ConnectionWorkspacePage() {
  const { id: idParam, tab: tabParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tab: TabKey = (tabParam as TabKey) || 'overview';
  const isCreate = (idParam || '') === 'new';
  const id = idParam || 'new';

  const [data, setData] = React.useState<ConnectionDetail | null>(null);
  const [createForm, setCreateForm] = React.useState<ConnectionDetail>({
    id: 'new',
    connection_id: '',
    name: '',
    purpose: '',
    topology: 'server_to_server',
    source_server_id: null,
    source_entity_code: null,
    destination_server_id: null,
    destination_entity_code: null,
    lifecycle: 'active',
    notes: '',
    protocol_codes: [],
    servers: [],
    criticality: 'medium',
    data_class: 'internal',
    contains_pii: false,
    risk_mode: 'manual',
  });
  const [dirty, setDirty] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [legsDraft, setLegsDraft] = React.useState<ConnectionLeg[]>([]);
  const [legsDirty, setLegsDirty] = React.useState(false);
  const [legsSaving, setLegsSaving] = React.useState(false);
  const [legsError, setLegsError] = React.useState<string | null>(null);
  const [linkedBindings, setLinkedBindings] = React.useState<LinkedInterfaceBinding[]>([]);
  const [linkedBindingsLoading, setLinkedBindingsLoading] = React.useState(false);
  const [linkedBindingsError, setLinkedBindingsError] = React.useState<string | null>(null);
  const [multiServerOptions, setMultiServerOptions] = React.useState<ServerOption[]>([]);
  const [multiServerSearch, setMultiServerSearch] = React.useState('');
  const [multiServerLoading, setMultiServerLoading] = React.useState(false);
  const [sourceServerOptions, setSourceServerOptions] = React.useState<ServerOption[]>([]);
  const [destinationServerOptions, setDestinationServerOptions] = React.useState<ServerOption[]>([]);
  const [legServerOptions, setLegServerOptions] = React.useState<ServerOption[]>([]);
  const [sourceServerSearch, setSourceServerSearch] = React.useState('');
  const [destinationServerSearch, setDestinationServerSearch] = React.useState('');
  const [sourceServerLoading, setSourceServerLoading] = React.useState(false);
  const [destinationServerLoading, setDestinationServerLoading] = React.useState(false);

  const createContext = React.useMemo(() => {
    if (!isCreate) return null;
    const params = new URLSearchParams(location.search || '');
    return {
      interfaceId: params.get('interfaceId'),
      bindingId: params.get('bindingId'),
      environment: params.get('environment'),
      legType: params.get('legType'),
    };
  }, [isCreate, location.search]);

  const linkBindingId = React.useMemo(() => {
    if (isCreate) return null;
    const params = new URLSearchParams(location.search || '');
    return params.get('linkBindingId');
  }, [isCreate, location.search]);

  const attemptedAutoLinksRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (!isCreate || !createContext) return;
    if (createContext.environment) {
      setCreateForm((prev) => ({
        ...prev,
        name: prev.name || `Connection ${createContext.environment?.toUpperCase()}`,
        connection_id: prev.connection_id || `CONN-${createContext.environment?.toUpperCase()}`,
      }));
    }
  }, [createContext, isCreate]);

  React.useEffect(() => {
    let cancelled = false;
    const prefillFromBinding = async () => {
      if (!isCreate || !createContext?.interfaceId || !createContext.bindingId) return;
      try {
        const bindingsRes = await api.get<{ items: any[] }>(`/interfaces/${createContext.interfaceId}/bindings`);
        if (cancelled) return;
        const binding = (bindingsRes.data.items || []).find((b: any) => b.id === createContext.bindingId);
        if (!binding) return;

        const fetchAssignments = async (instanceId: string) => {
          try {
            const res = await api.get<{ items: Array<{ server: ServerOption }> }>(`/app-instances/${instanceId}/servers`);
            const first = res.data.items?.[0]?.server;
            return first || null;
          } catch {
            return null;
          }
        };

        const [sourceAssignment, targetAssignment] = await Promise.all([
          fetchAssignments(binding.source_instance_id),
          fetchAssignments(binding.target_instance_id),
        ]);
        if (cancelled) return;

        if (sourceAssignment) {
          setSourceServerOptions((prev) => (prev.some((s) => s.id === sourceAssignment.id) ? prev : [...prev, sourceAssignment]));
        }
        if (targetAssignment) {
          setDestinationServerOptions((prev) =>
            prev.some((s) => s.id === targetAssignment.id) ? prev : [...prev, targetAssignment],
          );
        }

        setCreateForm((prev) => ({
          ...prev,
          topology: prev.topology || 'server_to_server',
          source_server_id: prev.source_server_id || sourceAssignment?.id || null,
          destination_server_id: prev.destination_server_id || targetAssignment?.id || null,
        }));
      } catch {
        // Best effort; ignore errors
      }
    };
    void prefillFromBinding();
    return () => {
      cancelled = true;
    };
  }, [createContext, isCreate]);

  // Server search effects
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setMultiServerLoading(true);
      try {
        const res = await api.get<{ items: ServerOption[] }>('/assets', {
          params: { q: multiServerSearch || undefined, limit: 50, sort: 'name:ASC' },
        });
        if (!cancelled) setMultiServerOptions(res.data.items || []);
      } catch {
        if (!cancelled) setMultiServerOptions([]);
      } finally {
        if (!cancelled) setMultiServerLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [multiServerSearch]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setSourceServerLoading(true);
      try {
        const res = await api.get<{ items: ServerOption[] }>('/assets', {
          params: { q: sourceServerSearch || undefined, limit: 50, sort: 'name:ASC' },
        });
        if (!cancelled) setSourceServerOptions(res.data.items || []);
      } catch {
        if (!cancelled) setSourceServerOptions([]);
      } finally {
        if (!cancelled) setSourceServerLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [sourceServerSearch]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setDestinationServerLoading(true);
      try {
        const res = await api.get<{ items: ServerOption[] }>('/assets', {
          params: { q: destinationServerSearch || undefined, limit: 50, sort: 'name:ASC' },
        });
        if (!cancelled) setDestinationServerOptions(res.data.items || []);
      } catch {
        if (!cancelled) setDestinationServerOptions([]);
      } finally {
        if (!cancelled) setDestinationServerLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [destinationServerSearch]);

  const current = (isCreate ? createForm : data) as ConnectionDetail | null;

  const addServerOption = React.useCallback((list: ServerOption[], toAdd?: ServerOption | null) => {
    if (!toAdd) return list;
    if (list.some((s) => s.id === toAdd.id)) return list;
    return [...list, toAdd];
  }, []);

  React.useEffect(() => {
    if (!current) return;
    setSourceServerOptions((prev) => addServerOption(prev, current.source_server));
    setDestinationServerOptions((prev) => addServerOption(prev, current.destination_server));
  }, [addServerOption, current]);

  React.useEffect(() => {
    const bindingId = linkBindingId;
    if (!bindingId || isCreate || !id || id === 'new') return;
    const key = `${id}:${bindingId}`;
    if (attemptedAutoLinksRef.current.has(key)) return;
    attemptedAutoLinksRef.current.add(key);
    let cancelled = false;
    const link = async () => {
      try {
        await api.post(`/interface-bindings/${bindingId}/connection-links`, { connection_id: id });
      } catch {
        // best effort; ignore errors
      } finally {
        if (!cancelled && linkBindingId) {
          const params = new URLSearchParams(location.search);
          params.delete('linkBindingId');
          navigate(`/it/connections/${id}/${tab}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true });
        }
      }
    };
    void link();
    return () => { cancelled = true; };
  }, [attemptedAutoLinksRef, id, isCreate, linkBindingId, location.search, navigate, tab]);

  const sortLegs = React.useCallback(
    (list: ConnectionLeg[]) =>
      [...list].sort((a, b) => a.order_index - b.order_index || (a.id || '').localeCompare(b.id || '')),
    [],
  );

  const sortedLegs = React.useMemo(() => sortLegs(legsDraft), [legsDraft, sortLegs]);

  React.useEffect(() => {
    if (sortedLegs.length === 0) return;
    const existingIds = new Set(
      [...sourceServerOptions, ...destinationServerOptions, ...legServerOptions].map((s) => s.id),
    );
    const missing = Array.from(
      new Set(
        sortedLegs
          .flatMap((leg) => [leg.source_server_id, leg.destination_server_id])
          .filter((v): v is string => !!v && !existingIds.has(v)),
      ),
    );
    if (missing.length === 0) return;
    let cancelled = false;
    const fetchMissing = async () => {
      const fetched: ServerOption[] = [];
      for (const idVal of missing) {
        try {
          const res = await api.get<ServerOption>(`/assets/${idVal}`);
          if (!cancelled && res.data) {
            fetched.push(res.data as any);
          }
        } catch {
          // ignore missing
        }
      }
      if (cancelled || fetched.length === 0) return;
      setSourceServerOptions((prev) => {
        let next = prev;
        fetched.forEach((s) => { next = addServerOption(next, s); });
        return next;
      });
      setDestinationServerOptions((prev) => {
        let next = prev;
        fetched.forEach((s) => { next = addServerOption(next, s); });
        return next;
      });
      setLegServerOptions((prev) => {
        let next = prev;
        fetched.forEach((s) => { next = addServerOption(next, s); });
        return next;
      });
    };
    void fetchMissing();
    return () => { cancelled = true; };
  }, [addServerOption, destinationServerOptions, legServerOptions, sortedLegs, sourceServerOptions]);

  const load = React.useCallback(async () => {
    if (isCreate) return;
    setLoading(true);
    setError(null);
    setLinkedBindingsLoading(true);
    setLinkedBindingsError(null);
    try {
      const res = await api.get<ConnectionDetail>(`/connections/${id}`, { params: { include: 'legs' } });
      setData(res.data);
      setLegsDraft(sortLegs(res.data.legs || []));
      setLegsDirty(false);
      setLegsError(null);
      setDirty(false);
      try {
        const linksRes = await api.get<{ items: LinkedInterfaceBinding[] }>(`/connections/${id}/interface-links`);
        setLinkedBindings(linksRes.data.items || []);
      } catch (e: any) {
        setLinkedBindingsError(e?.response?.data?.message || e?.message || 'Failed to load linked interfaces');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load connection');
      setData(null);
      setLegsDraft([]);
      setLegsDirty(false);
      setLinkedBindings([]);
    } finally {
      setLoading(false);
      setLinkedBindingsLoading(false);
    }
  }, [id, isCreate, sortLegs]);

  React.useEffect(() => {
    if (!isCreate) {
      void load();
    }
  }, [isCreate, load]);

  const update = React.useCallback(
    (patch: Partial<ConnectionDetail>) => {
      setDirty(true);
      if (isCreate) {
        setCreateForm((prev) => ({ ...prev, ...patch }));
      } else {
        setData((prev) => ({ ...(prev || ({} as any)), ...patch }) as ConnectionDetail);
      }
    },
    [isCreate],
  );

  const resetCreateForm = React.useCallback(() => {
    setCreateForm({
      id: 'new',
      connection_id: '',
      name: '',
      purpose: '',
      topology: 'server_to_server',
      source_server_id: null,
      source_entity_code: null,
      destination_server_id: null,
      destination_entity_code: null,
      lifecycle: 'active',
      notes: '',
      protocol_codes: [],
      servers: [],
      criticality: 'medium',
      data_class: 'internal',
      contains_pii: false,
      risk_mode: 'manual',
    });
    setDirty(false);
  }, []);

  React.useEffect(() => {
    if (isCreate) {
      resetCreateForm();
      setLinkedBindings([]);
      setLinkedBindingsError(null);
      setLinkedBindingsLoading(false);
      setLegsDraft([]);
      setLegsDirty(false);
      setLegsError(null);
    }
  }, [isCreate, resetCreateForm]);

  const validate = (): string | null => {
    const record = current;
    if (!record) return 'Missing form data';
    if (!record.connection_id.trim()) return 'Connection ID is required';
    if (!record.name.trim()) return 'Name is required';
    if (!record.protocol_codes || record.protocol_codes.length === 0) return 'Select at least one protocol';
    if (record.topology === 'server_to_server') {
      const hasSourceServer = !!record.source_server_id;
      const hasSourceEntity = !!record.source_entity_code;
      const hasDestServer = !!record.destination_server_id;
      const hasDestEntity = !!record.destination_entity_code;
      if (hasSourceServer && hasSourceEntity) return 'Source: choose a server or an entity, not both';
      if (!hasSourceServer && !hasSourceEntity) return 'Source server or entity is required';
      if (hasDestServer && hasDestEntity) return 'Destination: choose a server or an entity, not both';
      if (!hasDestServer && !hasDestEntity) return 'Destination server or entity is required';
    } else {
      const servers = record.servers || [];
      if (servers.length < 2) return 'Select at least two servers for a multi-server connection';
    }
    return null;
  };

  const validateLegs = (legs: ConnectionLeg[]): string | null => {
    if (!legs || legs.length === 0) return null;
    if (legs.length > 3) return 'Up to 3 layers are supported';
    const orders = new Set<number>();
    for (const leg of legs) {
      const order = Number(leg.order_index);
      if (!Number.isInteger(order) || order < 1 || order > 3) return 'Layer order must be between 1 and 3';
      if (orders.has(order)) return 'Layer order_index must be unique';
      orders.add(order);
      if (!String(leg.layer_type || '').trim()) return 'Layer type is required';
      if (!leg.protocol_codes || leg.protocol_codes.length === 0) return 'Select at least one protocol for each layer';
      const srcServer = !!leg.source_server_id;
      const srcEntity = !!leg.source_entity_code;
      const dstServer = !!leg.destination_server_id;
      const dstEntity = !!leg.destination_entity_code;
      if (srcServer && srcEntity) return 'Layer source: choose a server or an entity, not both';
      if (!srcServer && !srcEntity) return 'Layer source is required';
      if (dstServer && dstEntity) return 'Layer destination: choose a server or an entity, not both';
      if (!dstServer && !dstEntity) return 'Layer destination is required';
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      connection_id: current?.connection_id.trim(),
      name: current?.name.trim(),
      purpose: current?.purpose || null,
      topology: current?.topology,
      source_server_id: current?.topology === 'server_to_server' ? current?.source_server_id : null,
      source_entity_code: current?.topology === 'server_to_server' ? current?.source_entity_code : null,
      destination_server_id: current?.topology === 'server_to_server' ? current?.destination_server_id : null,
      destination_entity_code: current?.topology === 'server_to_server' ? current?.destination_entity_code : null,
      servers: current?.topology === 'multi_server' ? (current?.servers || []).map((s) => s.id) : undefined,
      protocol_codes: current?.protocol_codes || [],
      lifecycle: current?.lifecycle || 'active',
      notes: current?.notes || null,
      criticality: current?.criticality || 'medium',
      data_class: current?.data_class || 'internal',
      contains_pii: !!current?.contains_pii,
      risk_mode: current?.risk_mode || 'manual',
    };
    try {
      if (isCreate) {
        const res = await api.post('/connections', payload);
        const newId = (res.data as any)?.id as string;
        setDirty(false);
        if (newId) {
          const linkParam = createContext?.bindingId ? `?linkBindingId=${encodeURIComponent(createContext.bindingId)}` : '';
          navigate(`/it/connections/${newId}/overview${linkParam}`);
        }
      } else {
        await api.patch(`/connections/${id}`, payload);
        setDirty(false);
        await load();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save connection');
    } finally {
      setSaving(false);
    }
  };

  const makeEmptyLeg = React.useCallback(
    (orderIndex: number): ConnectionLeg => ({
      order_index: orderIndex,
      layer_type: '',
      source_server_id: null,
      source_entity_code: null,
      destination_server_id: null,
      destination_entity_code: null,
      protocol_codes: (current?.protocol_codes && current.protocol_codes.length > 0) ? [...current.protocol_codes] : [],
      port_override: null,
      notes: null,
    }),
    [current?.protocol_codes],
  );

  const handleAddLeg = () => {
    if (sortedLegs.length >= 3) return;
    const used = new Set(sortedLegs.map((l) => l.order_index));
    let nextOrder = 1;
    while (used.has(nextOrder) && nextOrder < 3) {
      nextOrder += 1;
    }
    const newLeg = makeEmptyLeg(nextOrder);
    setLegsDraft((prev) => sortLegs([...prev, newLeg]));
    setLegsDirty(true);
  };

  const handleLegChange = (leg: ConnectionLeg, patch: Partial<ConnectionLeg>) => {
    setLegsDraft((prev) => sortLegs(prev.map((item) => (item === leg ? { ...item, ...patch } : item))));
    setLegsDirty(true);
  };

  const handleRemoveLeg = (leg: ConnectionLeg) => {
    setLegsDraft((prev) => prev.filter((item) => item !== leg));
    setLegsDirty(true);
  };

  const handleSaveLegs = async () => {
    if (isCreate) {
      setLegsError('Save the connection first, then add layers.');
      return;
    }
    const validationError = validateLegs(sortedLegs);
    if (validationError) {
      setLegsError(validationError);
      return;
    }
    setLegsSaving(true);
    setLegsError(null);
    try {
      const payload = sortedLegs.map((leg) => ({
        order_index: Number(leg.order_index),
        layer_type: String(leg.layer_type || '').trim().toLowerCase(),
        source_server_id: leg.source_server_id || null,
        source_entity_code: leg.source_entity_code ? String(leg.source_entity_code).trim() : null,
        destination_server_id: leg.destination_server_id || null,
        destination_entity_code: leg.destination_entity_code ? String(leg.destination_entity_code).trim() : null,
        protocol_codes: (leg.protocol_codes || []).map((p) => String(p || '').trim().toLowerCase()).filter((p) => p.length > 0),
        port_override: leg.port_override ? String(leg.port_override).trim() : null,
        notes: leg.notes ? String(leg.notes).trim() : null,
      }));
      const res = await api.put<ConnectionLeg[]>(`/connections/${id}/legs`, payload);
      const nextLegs = sortLegs(res.data || []);
      setLegsDraft(nextLegs);
      setLegsDirty(false);
      setData((prev) => (prev ? { ...prev, legs: nextLegs } as ConnectionDetail : prev));
    } catch (e: any) {
      setLegsError(e?.response?.data?.message || e?.message || 'Failed to save layers');
    } finally {
      setLegsSaving(false);
    }
  };

  const handleResetLegs = () => {
    setLegsDraft(sortLegs((data?.legs as ConnectionLeg[] | undefined) || []));
    setLegsDirty(false);
    setLegsError(null);
  };

  const handleReset = () => {
    if (isCreate) {
      resetCreateForm();
      setLegsDraft([]);
      setLegsDirty(false);
      setLegsError(null);
    } else {
      void load();
    }
  };

  const handleClose = async () => {
    if (dirty || legsDirty) {
      const confirm = window.confirm('You have unsaved changes. Do you want to leave without saving?');
      if (!confirm) return;
    }
    navigate('/it/connections');
  };

  const handleTabChange = (newTab: string) => {
    if (dirty || legsDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Leave this tab?');
      if (!confirmLeave) return;
    }
    navigate(`/it/connections/${id}/${newTab}`);
  };

  const actions = (
    <WorkspaceActions
      onClose={handleClose}
      onReset={handleReset}
      onSave={() => void handleSave()}
      dirty={dirty}
      loading={loading || saving}
      showReset={dirty || legsDirty}
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
          isCreate={isCreate}
          loading={loading}
          sourceServerOptions={sourceServerOptions}
          destinationServerOptions={destinationServerOptions}
          multiServerOptions={multiServerOptions}
          sourceServerLoading={sourceServerLoading}
          destinationServerLoading={destinationServerLoading}
          multiServerLoading={multiServerLoading}
          setSourceServerSearch={setSourceServerSearch}
          setDestinationServerSearch={setDestinationServerSearch}
          setMultiServerSearch={setMultiServerSearch}
          multiServerSearch={multiServerSearch}
        />
      ),
    },
    {
      id: 'layers',
      label: 'Layers',
      content: (
        <LayersTab
          data={current}
          isCreate={isCreate}
          loading={loading}
          legsDraft={legsDraft}
          legsDirty={legsDirty}
          legsError={legsError}
          legsSaving={legsSaving}
          sourceServerOptions={sourceServerOptions}
          destinationServerOptions={destinationServerOptions}
          multiServerOptions={multiServerOptions}
          legServerOptions={legServerOptions}
          onAddLeg={handleAddLeg}
          onLegChange={handleLegChange}
          onRemoveLeg={handleRemoveLeg}
          onSaveLegs={() => void handleSaveLegs()}
          onResetLegs={handleResetLegs}
        />
      ),
    },
    {
      id: 'compliance',
      label: 'Criticality & Compliance',
      content: (
        <ComplianceTab
          data={current}
          update={update}
          isCreate={isCreate}
          loading={loading}
        />
      ),
    },
    {
      id: 'interfaces',
      label: 'Related Interfaces',
      disabled: isCreate,
      content: !isCreate ? (
        <InterfacesTab
          linkedBindings={linkedBindings}
          linkedBindingsLoading={linkedBindingsLoading}
          linkedBindingsError={linkedBindingsError}
        />
      ) : null,
    },
  ];

  const sidebar = isCreate && createContext && (createContext.bindingId || createContext.interfaceId) ? (
    <Alert severity="info">
      Creating from interface binding context
      {createContext.environment ? ` - Env ${createContext.environment.toUpperCase()}` : ''}
      {createContext.legType ? ` - Leg ${createContext.legType.toUpperCase()}` : ''}
    </Alert>
  ) : undefined;

  return (
    <WorkspaceLayout
      title={isCreate ? 'New Connection' : current?.name || 'Connection'}
      tabs={tabs}
      currentTab={tab}
      onTabChange={handleTabChange}
      actions={actions}
      sidebar={sidebar}
      error={error}
      onErrorClose={() => setError(null)}
      loading={loading}
    />
  );
}
