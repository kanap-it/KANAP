import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { useAuth } from '../../auth/AuthContext';
import PortfolioDetailWorkspaceShell, {
  type PortfolioDetailWorkspaceTab,
} from '../portfolio/workspace/PortfolioDetailWorkspaceShell';
import KanapDialog from '../../components/design/KanapDialog';
import { PropertyRow } from '../../components/design/PropertyRow';
import SendLinkButton from '../../components/workspace/SendLinkButton';
import ConnectionMetadataBar from './workspace/ConnectionMetadataBar';
import ConnectionPropertiesDrawer from './workspace/ConnectionPropertiesDrawer';
import ConnectionOverviewTab from './workspace/ConnectionOverviewTab';
import ConnectionPathTab from './workspace/ConnectionPathTab';
import { useConnectionItemNav } from '../../hooks/useModuleItemNav';
import {
  drawerSelectSx,
  drawerMenuItemSx,
  drawerFieldValueSx,
  dialogBorderedFieldSx,
} from '../../theme/formSx';
import { getApiErrorMessage } from '../../utils/apiErrorMessage';
import type { ConnectionPathHop } from './workspace/ConnectionPathSection';

type TabKey = 'overview' | 'path';
const TAB_KEYS: TabKey[] = ['overview', 'path'];

type LinkedInterfaceRow = {
  id: string;
  binding_id: string;
  interface_id: string;
  interface_code: string;
  interface_name: string;
  environment: string;
  leg_type: string;
  source_endpoint: string | null;
  target_endpoint: string | null;
  pattern: string;
  binding_status: string;
  interface_criticality?: string;
  interface_data_class?: string;
  interface_contains_pii?: boolean;
};

type AssetSummary = { id: string; name: string; asset_reference?: string | null };

type ConnectionDetail = {
  id: string;
  connection_reference: string;
  name: string;
  description: string | null;
  topology: 'server_to_server' | 'multi_server';
  source_asset_id: string | null;
  source_entity_code: string | null;
  destination_asset_id: string | null;
  destination_entity_code: string | null;
  source_server: AssetSummary | null;
  destination_server: AssetSummary | null;
  servers: AssetSummary[];
  protocol_codes: string[];
  lifecycle: string;
  criticality: string;
  data_class: string;
  contains_pii: boolean;
  risk_mode: 'manual' | 'derived';
  effective_criticality: string;
  effective_data_class: string;
  effective_contains_pii: boolean;
  derived_interface_count: number;
  legs?: ConnectionPathHop[];
  created_at: string;
  updated_at: string;
};

export default function ConnectionWorkspacePage() {
  const { t } = useTranslation(['it', 'common']);
  const { hasLevel } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const routeId = String(params.id || '');
  const isCreate = routeId === 'new';
  const isConnectionReferenceRoute = /^CONN-\d+(?:-.+)?$/i.test(routeId);
  const rawTab = (params.tab as TabKey) || 'overview';
  const validTab: TabKey = TAB_KEYS.includes(rawTab) ? rawTab : 'overview';

  const canManage = hasLevel('infrastructure', 'member');
  const canDelete = hasLevel('infrastructure', 'member');

  const [data, setData] = React.useState<ConnectionDetail | null>(null);
  const [legs, setLegs] = React.useState<ConnectionPathHop[]>([]);
  const [linkedInterfaces, setLinkedInterfaces] = React.useState<LinkedInterfaceRow[]>([]);
  const [linkedInterfacesLoading, setLinkedInterfacesLoading] = React.useState(false);
  const [linkedInterfacesError, setLinkedInterfacesError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(!isCreate);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [pendingTopology, setPendingTopology] = React.useState<'server_to_server' | 'multi_server' | null>(null);

  const [createName, setCreateName] = React.useState('');
  const [createTopology, setCreateTopology] = React.useState<'server_to_server' | 'multi_server'>('server_to_server');
  const [createSubmitting, setCreateSubmitting] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const connectionId = React.useMemo(() => {
    if (isCreate) return '';
    if (data?.id) return data.id;
    return isConnectionReferenceRoute ? '' : routeId;
  }, [data?.id, isConnectionReferenceRoute, isCreate, routeId]);
  const workspaceRouteId = data?.connection_reference || (isCreate ? 'new' : routeId);
  const routeMatchesLoadedConnection = React.useMemo(() => {
    if (isCreate || !data) return false;
    if (routeId === data.id) return true;
    const routeKey = routeId.toUpperCase();
    const reference = data.connection_reference?.toUpperCase();
    return !!reference && (routeKey === reference || routeKey.startsWith(`${reference}-`));
  }, [data, isCreate, routeId]);

  const load = React.useCallback(async () => {
    if (isCreate || !routeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ConnectionDetail>(`/connections/${routeId}`, { params: { include: 'legs' } });
      setData(res.data);
      setLegs(res.data.legs || []);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.loadConnectionFailed') || 'Failed to load connection'));
    } finally {
      setLoading(false);
    }
  }, [isCreate, routeId, t]);

  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    if (isCreate || !data?.connection_reference) return;
    if (!routeMatchesLoadedConnection) return;
    if (routeId.toUpperCase() === data.connection_reference.toUpperCase()) return;
    const qs = searchParams.toString();
    navigate(`/it/connections/${data.connection_reference}/${validTab}${qs ? `?${qs}` : ''}`, { replace: true });
  }, [data?.connection_reference, isCreate, navigate, routeId, routeMatchesLoadedConnection, searchParams, validTab]);

  const reloadLinkedInterfaces = React.useCallback(async () => {
    if (!connectionId) return;
    setLinkedInterfacesLoading(true);
    setLinkedInterfacesError(null);
    try {
      const res = await api.get<{ items: LinkedInterfaceRow[] }>(`/connections/${connectionId}/interface-links`);
      setLinkedInterfaces(res.data.items || []);
    } catch (e: any) {
      setLinkedInterfacesError(
        getApiErrorMessage(e, t, t('messages.loadLinkedInterfacesFailed') || 'Failed to load linked interfaces'),
      );
      setLinkedInterfaces([]);
    } finally {
      setLinkedInterfacesLoading(false);
    }
  }, [connectionId, t]);

  React.useEffect(() => {
    if (!connectionId) return;
    void reloadLinkedInterfaces();
  }, [connectionId, reloadLinkedInterfaces]);

  const handleLinkedInterfacesChanged = React.useCallback(async () => {
    await reloadLinkedInterfaces();
    // Reload connection too, since effective_criticality/data_class/contains_pii may change
    // when bindings are linked/unlinked under derived risk mode.
    await load();
  }, [reloadLinkedInterfaces, load]);

  const patchConnection = React.useCallback(
    async (patch: Partial<ConnectionDetail> | Record<string, any>) => {
      if (!connectionId) return;
      setSaving(true);
      setData((prev) => (prev ? { ...prev, ...(patch as any) } as ConnectionDetail : prev));
      try {
        const res = await api.patch<ConnectionDetail>(`/connections/${connectionId}`, patch);
        setData((prev) => (prev ? { ...prev, ...res.data } : res.data));
        setError(null);
      } catch (e: any) {
        setError(getApiErrorMessage(e, t, t('messages.saveConnectionFailed') || 'Failed to save connection'));
        await load();
      } finally {
        setSaving(false);
      }
    },
    [connectionId, load, t],
  );

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

  const handleClose = React.useCallback(() => {
    const qs = listContextParams.toString();
    navigate(`/it/connections${qs ? `?${qs}` : ''}`);
  }, [listContextParams, navigate]);

  const handleTabChange = React.useCallback(
    (nextTab: string) => {
      if (nextTab === validTab) return;
      const qs = searchParams.toString();
      const targetId = workspaceRouteId;
      navigate(`/it/connections/${targetId}/${nextTab}${qs ? `?${qs}` : ''}`);
    },
    [navigate, searchParams, validTab, workspaceRouteId],
  );

  const handleTitleSave = React.useCallback(
    (next: string) => {
      const trimmed = next.trim();
      if (!trimmed || !data || trimmed === data.name) return;
      void patchConnection({ name: trimmed });
    },
    [data, patchConnection],
  );

  const handleTopologyChange = React.useCallback(
    (next: 'server_to_server' | 'multi_server') => {
      if (!data || next === data.topology) return;
      const hasContent =
        legs.length > 0 ||
        !!data.source_asset_id || !!data.source_entity_code ||
        !!data.destination_asset_id || !!data.destination_entity_code ||
        (data.servers || []).length > 0;
      if (hasContent) {
        setPendingTopology(next);
        return;
      }
      void patchConnection({ topology: next });
    },
    [data, legs.length, patchConnection],
  );

  const handleConfirmTopology = React.useCallback(() => {
    if (!pendingTopology) return;
    const next = pendingTopology;
    setPendingTopology(null);
    if (next === 'multi_server') {
      void patchConnection({
        topology: next,
        source_asset_id: null, source_entity_code: null,
        destination_asset_id: null, destination_entity_code: null,
        servers: (data?.servers ?? []).map((s) => s.id),
      });
    } else {
      void patchConnection({ topology: next });
    }
  }, [data, patchConnection, pendingTopology]);

  const handleEndpointChange = React.useCallback(
    (side: 'source' | 'destination', next: { asset_id: string | null; entity_code: string | null }) => {
      if (side === 'source') {
        void patchConnection({
          source_asset_id: next.asset_id,
          source_entity_code: next.entity_code,
        });
      } else {
        void patchConnection({
          destination_asset_id: next.asset_id,
          destination_entity_code: next.entity_code,
        });
      }
    },
    [patchConnection],
  );

  const handleMultiServerChange = React.useCallback(
    (nextIds: string[]) => {
      void patchConnection({ servers: nextIds });
    },
    [patchConnection],
  );

  const handleProtocolsChange = React.useCallback(
    (next: string[]) => {
      if (next.length === 0) return;
      void patchConnection({ protocol_codes: next });
    },
    [patchConnection],
  );

  const handleLifecycleChange = React.useCallback(
    (next: string) => {
      if (!data || next === data.lifecycle) return;
      void patchConnection({ lifecycle: next });
    },
    [data, patchConnection],
  );

  const handleCriticalityChange = React.useCallback(
    (next: string) => {
      if (!data || next === data.criticality) return;
      void patchConnection({ criticality: next });
    },
    [data, patchConnection],
  );

  const handleDataClassChange = React.useCallback(
    (next: string) => {
      if (!data || next === data.data_class) return;
      void patchConnection({ data_class: next });
    },
    [data, patchConnection],
  );

  const handleContainsPiiChange = React.useCallback(
    (next: boolean) => {
      if (!data || next === data.contains_pii) return;
      void patchConnection({ contains_pii: next });
    },
    [data, patchConnection],
  );

  const handleRiskModeChange = React.useCallback(
    (next: 'manual' | 'derived') => {
      if (!data || next === data.risk_mode) return;
      void patchConnection({ risk_mode: next });
    },
    [data, patchConnection],
  );

  const handleCreate = async () => {
    if (!canManage) return;
    const name = createName.trim();
    if (!name) {
      setCreateError('Name is required.');
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const res = await api.post('/connections', {
        name,
        topology: createTopology,
        protocol_codes: ['https'],
      });
      const saved = res.data as ConnectionDetail;
      navigate(`/it/connections/${saved.connection_reference || saved.id}/overview`, { replace: true });
    } catch (e: any) {
      setCreateError(getApiErrorMessage(e, t, t('messages.saveConnectionFailed') || 'Failed to create connection'));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!connectionId || !canDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/connections/${connectionId}`);
      handleClose();
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.deleteConnectionFailed') || 'Failed to delete connection'));
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const navSort = searchParams.get('sort') || '';
  const navQ = searchParams.get('q') || '';
  const navFilters = searchParams.get('filters') || '';
  const navState = useConnectionItemNav({
    id: connectionId,
    sort: navSort,
    q: navQ,
    filters: navFilters,
  });
  const { total, index, hasPrev, hasNext, prevId, nextId } = isCreate || !connectionId
    ? { total: 0, index: 0, hasPrev: false, hasNext: false, prevId: null as string | null, nextId: null as string | null }
    : navState;

  const goToConnection = React.useCallback(
    (targetId: string | null) => {
      if (!targetId) return;
      const qs = searchParams.toString();
      navigate(`/it/connections/${targetId}/${validTab}${qs ? `?${qs}` : ''}`);
    },
    [navigate, searchParams, validTab],
  );

  const workspaceTabs: PortfolioDetailWorkspaceTab[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'path', label: 'Path', badge: legs.length || undefined },
  ];

  const title = isCreate ? createName : data?.name || '';

  const assetMap = React.useMemo(() => {
    const map: Record<string, AssetSummary> = {};
    if (!data) return map;
    if (data.source_server) map[data.source_server.id] = data.source_server;
    if (data.destination_server) map[data.destination_server.id] = data.destination_server;
    (data.servers || []).forEach((s) => { if (s) map[s.id] = s; });
    return map;
  }, [data]);

  const endpointsLabel = (() => {
    if (!data) return 'Endpoints missing';
    if (data.topology === 'server_to_server') {
      const fmt = (assetId: string | null, entityCode: string | null, asset: AssetSummary | null) => {
        if (assetId && asset) return asset.asset_reference || asset.name;
        if (assetId) return 'Server';
        if (entityCode) return `entity:${entityCode}`;
        return '?';
      };
      const src = fmt(data.source_asset_id, data.source_entity_code, data.source_server);
      const dst = fmt(data.destination_asset_id, data.destination_entity_code, data.destination_server);
      return `${src} → ${dst}`;
    }
    const count = (data.servers || []).length;
    return count > 0 ? `${count} servers` : 'No servers';
  })();

  const drawerProperties = data ? (
    <ConnectionPropertiesDrawer
      lifecycle={data.lifecycle}
      topology={data.topology}
      topologyDisabled={legs.length > 0}
      riskMode={data.risk_mode}
      criticality={data.criticality}
      dataClass={data.data_class}
      containsPii={data.contains_pii}
      effectiveCriticality={data.effective_criticality}
      effectiveDataClass={data.effective_data_class}
      effectiveContainsPii={data.effective_contains_pii}
      derivedInterfaceCount={data.derived_interface_count || 0}
      derivedAvailable={linkedInterfaces.length > 0}
      createdAt={data.created_at}
      updatedAt={data.updated_at}
      disabled={!canManage || saving}
      onLifecycleChange={handleLifecycleChange}
      onTopologyChange={handleTopologyChange}
      onRiskModeChange={handleRiskModeChange}
      onCriticalityChange={handleCriticalityChange}
      onDataClassChange={handleDataClassChange}
      onContainsPiiChange={handleContainsPiiChange}
    />
  ) : (
    <Box />
  );

  const metadata = !isCreate && data ? (
    <ConnectionMetadataBar
      lifecycle={data.lifecycle}
      topology={data.topology}
      topologyDisabled={legs.length > 0}
      criticality={data.criticality}
      effectiveCriticality={data.effective_criticality}
      riskMode={data.risk_mode}
      derivedInterfaceCount={data.derived_interface_count || 0}
      protocolCodes={data.protocol_codes}
      protocolLabels={data.protocol_codes}
      endpointsLabel={endpointsLabel}
      disabled={!canManage || saving}
      onLifecycleChange={handleLifecycleChange}
      onTopologyChange={handleTopologyChange}
      onCriticalityChange={handleCriticalityChange}
      onProtocolCodesChange={handleProtocolsChange}
    />
  ) : undefined;

  const actions = (
    <>
      {isCreate && (
        <Button
          variant="contained"
          onClick={() => void handleCreate()}
          disabled={createSubmitting || !canManage}
          size="small"
        >
          Create
        </Button>
      )}
      {!isCreate && data && (
        <>
          <Button
            variant="action"
            startIcon={<HubOutlinedIcon sx={{ fontSize: '14px !important' }} />}
            size="small"
            onClick={() => navigate(`/it/connection-map?focusConnectionId=${data.id}`)}
          >
            View in map
          </Button>
          <SendLinkButton
            itemType={'connection' as any}
            itemId={data.id}
            itemRef={data.connection_reference || null}
            itemName={data.name || 'Untitled connection'}
          />
        </>
      )}
      {!isCreate && canDelete && (
        <Button
          variant="action-danger"
          startIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
          size="small"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={deleting}
        >
          Delete
        </Button>
      )}
    </>
  );

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {error && <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
      <PortfolioDetailWorkspaceShell
        activeTab={validTab}
        tabs={workspaceTabs}
        onTabChange={handleTabChange}
        drawerStorageKey="kanap.connections.drawerOpen"
        backLabel="Connections"
        onBack={handleClose}
        itemReference={!isCreate ? data?.connection_reference || null : null}
        onCopyReference={
          !isCreate && data?.connection_reference
            ? () => { void navigator.clipboard?.writeText(data.connection_reference); }
            : undefined
        }
        title={title}
        titleFallback={isCreate ? 'New connection' : 'Untitled connection'}
        canEditTitle={canManage && !isCreate}
        onTitleSave={handleTitleSave}
        isCreate={isCreate}
        nav={!isCreate && total > 0 ? {
          currentIndex: index + 1,
          totalCount: total,
          hasPrev,
          hasNext,
          onPrev: () => goToConnection(prevId),
          onNext: () => goToConnection(nextId),
          previousLabel: 'Previous connection',
          nextLabel: 'Next connection',
        } : undefined}
        metadata={metadata}
        actions={actions}
        properties={drawerProperties}
      >
        {isCreate ? (
          <Stack spacing={1.5} sx={{ maxWidth: 560 }}>
            <PropertyRow label="Name" required valueSx={{ maxWidth: 520 }}>
              <TextField
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g., App tier to DB tier"
                required
                size="small"
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={[drawerFieldValueSx, dialogBorderedFieldSx]}
              />
            </PropertyRow>
            <PropertyRow label="Topology" required valueSx={{ maxWidth: 520 }}>
              <TextField
                select
                value={createTopology}
                onChange={(e) => setCreateTopology(e.target.value as 'server_to_server' | 'multi_server')}
                size="small"
                variant="standard"
                InputProps={{ disableUnderline: true }}
                sx={[drawerSelectSx, dialogBorderedFieldSx]}
              >
                <MenuItem value="server_to_server" sx={drawerMenuItemSx}>Server to server</MenuItem>
                <MenuItem value="multi_server" sx={drawerMenuItemSx}>Multi-server</MenuItem>
              </TextField>
            </PropertyRow>
            {createError && <Alert severity="error">{createError}</Alert>}
            <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary' }}>
              Endpoints, protocols and network path can be configured after creating the connection.
            </Typography>
          </Stack>
        ) : !data ? null : validTab === 'path' ? (
          <ConnectionPathTab
            connectionId={data.id}
            hops={legs}
            canManage={canManage}
            defaultProtocolCodes={data.protocol_codes || []}
            assetMap={Object.fromEntries(
              Object.entries(assetMap).map(([id, a]) => [id, { name: a.name, reference: a.asset_reference || null }]),
            )}
            sourceLabel={(() => {
              if (data.source_asset_id && data.source_server) return data.source_server.asset_reference ? `${data.source_server.asset_reference} · ${data.source_server.name}` : data.source_server.name;
              if (data.source_entity_code) return `entity:${data.source_entity_code}`;
              if (data.topology === 'multi_server') return `${(data.servers || []).length} servers (multi-server)`;
              return 'Source missing';
            })()}
            destinationLabel={(() => {
              if (data.destination_asset_id && data.destination_server) return data.destination_server.asset_reference ? `${data.destination_server.asset_reference} · ${data.destination_server.name}` : data.destination_server.name;
              if (data.destination_entity_code) return `entity:${data.destination_entity_code}`;
              if (data.topology === 'multi_server') return `${(data.servers || []).length} servers (multi-server)`;
              return 'Destination missing';
            })()}
            onChange={setLegs}
          />
        ) : (
          <ConnectionOverviewTab
            connectionId={data.id}
            topology={data.topology}
            initialDescription={data.description || ''}
            canManage={canManage}
            source={{ asset_id: data.source_asset_id, entity_code: data.source_entity_code }}
            destination={{ asset_id: data.destination_asset_id, entity_code: data.destination_entity_code }}
            multiServerIds={(data.servers || []).map((s) => s.id)}
            assetMap={assetMap}
            protocolCodes={data.protocol_codes || []}
            riskMode={data.risk_mode}
            linkedInterfaces={linkedInterfaces}
            linkedInterfacesLoading={linkedInterfacesLoading}
            linkedInterfacesError={linkedInterfacesError}
            derivedInterfaceCount={data.derived_interface_count || 0}
            onDescriptionSaved={(next) => setData((prev) => prev ? { ...prev, description: next } : prev)}
            onEndpointChange={handleEndpointChange}
            onMultiServerChange={handleMultiServerChange}
            onProtocolCodesChange={handleProtocolsChange}
            onLinkedInterfacesChanged={handleLinkedInterfacesChanged}
          />
        )}
      </PortfolioDetailWorkspaceShell>

      <KanapDialog
        open={deleteDialogOpen}
        title="Delete connection?"
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        onSave={handleDelete}
        saveLabel="Delete"
        saveDisabled={deleting}
        saveLoading={deleting}
      >
        <Stack spacing={1}>
          <Box sx={{ fontSize: 13, color: 'kanap.text.primary' }}>
            {linkedInterfaces.length > 0
              ? `This will permanently delete this connection and unlink it from ${linkedInterfaces.length} interface ${linkedInterfaces.length === 1 ? 'binding' : 'bindings'}. The interfaces themselves are not deleted.`
              : 'This will permanently delete this connection.'}
          </Box>
        </Stack>
      </KanapDialog>

      <KanapDialog
        open={!!pendingTopology}
        title="Change topology?"
        onClose={() => setPendingTopology(null)}
        onSave={handleConfirmTopology}
        saveLabel="Continue"
        saveDisabled={saving}
        saveLoading={saving}
      >
        <Stack spacing={1}>
          <Typography sx={{ fontSize: 13, color: 'kanap.text.primary' }}>
            {pendingTopology === 'multi_server'
              ? 'Switching to multi-server will clear the source and destination endpoints.'
              : 'Switching to server-to-server will clear the multi-server list.'}
          </Typography>
          {legs.length > 0 && (
            <Typography sx={{ fontSize: 12, color: 'kanap.text.tertiary' }}>
              Existing layers ({legs.length}) are kept; review their endpoints after the change.
            </Typography>
          )}
        </Stack>
      </KanapDialog>
    </Box>
  );
}
