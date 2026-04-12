import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';
import ApplicationSelect from '../../../components/fields/ApplicationSelect';
import useItOpsEnumOptions from '../../../hooks/useItOpsEnumOptions';

import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '../../../utils/apiErrorMessage';
const ENVIRONMENTS = ['prod', 'pre_prod', 'qa', 'test', 'dev', 'sandbox'] as const;

type InterfaceLeg = {
  id: string;
  interface_id: string;
  leg_type: 'extract' | 'transform' | 'load' | 'direct';
  from_role: string;
  to_role: string;
  trigger_type: string;
  integration_pattern: string;
  data_format: string;
  job_name: string | null;
  order_index: number;
};

type BindingRow = {
  id: string;
  interface_id: string;
  interface_leg_id: string;
  leg_type: string;
  order_index: number;
  environment: string;
  source_instance_id: string;
  target_instance_id: string;
  status: string;
  source_endpoint: string | null;
  target_endpoint: string | null;
  trigger_details: string | null;
  env_job_name: string | null;
  authentication_mode: string | null;
  monitoring_url: string | null;
  env_notes: string | null;
  integration_tool_application_id: string | null;
  created_at: string;
  updated_at: string;
  source_application_id: string;
  target_application_id: string;
};

type AppInstanceOption = {
  id: string;
  application_id: string;
  environment: string;
};

type BindingConnection = {
  id: string;
  interface_binding_id: string;
  connection_id: string;
  notes: string | null;
  connection: {
    id: string;
    connection_id: string;
    name: string;
    topology: 'server_to_server' | 'multi_server';
    lifecycle: string;
    criticality: string;
    data_class: string;
    contains_pii: boolean;
  };
};

type Props = {
  interfaceId: string;
  interfaceName?: string | null;
  sourceApplicationId: string;
  targetApplicationId: string;
  sourceApplicationName?: string | null;
  targetApplicationName?: string | null;
  middlewareApplicationIds: string[];
  legs: InterfaceLeg[];
  integrationRouteType: 'direct' | 'via_middleware';
};

type BindingDialogState = {
  mode: 'create' | 'edit';
  environment: string;
  leg: InterfaceLeg;
  bindingId?: string;
  source_instance_id: string | null;
  target_instance_id: string | null;
  status: string;
  source_endpoint: string;
  target_endpoint: string;
  trigger_details: string;
  env_job_name: string;
  authentication_mode: string | null;
  monitoring_url: string;
  env_notes: string;
  integration_tool_application_id: string | null;
};

type ManageConnectionsState = {
  binding: BindingRow;
} | null;

function getRoleLabel(role: string, sourceName?: string | null, targetName?: string | null): string {
  const r = String(role || '').toLowerCase();
  if (r === 'source') return sourceName || 'Source';
  if (r === 'target') return targetName || 'Target';
  if (r === 'middleware') return 'Middleware';
  return role || '';
}

export default function InterfaceBindingsMatrix({
  interfaceId,
  interfaceName,
  sourceApplicationId,
  targetApplicationId,
  sourceApplicationName,
  targetApplicationName,
  middlewareApplicationIds,
  legs,
  integrationRouteType,
}: Props) {
  const { t } = useTranslation(['it', 'common']);
  const { byField, labelFor } = useItOpsEnumOptions();
  const lifecycleOptions = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    if (list.length === 0) return [{ label: 'Active', value: 'active' }];
    return list.map((item) => ({
      value: item.code,
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
    }));
  }, [byField.lifecycleStatus]);
  const navigate = useNavigate();
  const [bindings, setBindings] = React.useState<BindingRow[]>([]);
  const [instancesByAppId, setInstancesByAppId] = React.useState<Record<string, AppInstanceOption[]>>({});
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [linksByBindingId, setLinksByBindingId] = React.useState<Record<string, BindingConnection[]>>({});
  const [linksLoadingBindingId, setLinksLoadingBindingId] = React.useState<string | null>(null);
  const [linksError, setLinksError] = React.useState<string | null>(null);
  const [manageConnections, setManageConnections] = React.useState<ManageConnectionsState>(null);
  const [connectionSearch, setConnectionSearch] = React.useState('');
  const [connectionOptions, setConnectionOptions] = React.useState<Array<{ id: string; name: string; connection_id: string }>>([]);
  const [connectionLoading, setConnectionLoading] = React.useState(false);
  const [selectedConnection, setSelectedConnection] = React.useState<{ id: string; name: string; connection_id: string } | null>(null);
  const [linkSaving, setLinkSaving] = React.useState(false);
  const [unlinkingLinkId, setUnlinkingLinkId] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogState, setDialogState] = React.useState<BindingDialogState | null>(null);
  const [manualEnvs, setManualEnvs] = React.useState<string[]>([]);
  const [envDialogOpen, setEnvDialogOpen] = React.useState(false);
  const [envDraft, setEnvDraft] = React.useState<string>('');

  const appIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (sourceApplicationId) ids.add(sourceApplicationId);
    if (targetApplicationId) ids.add(targetApplicationId);
    for (const mid of middlewareApplicationIds || []) {
      if (mid) ids.add(mid);
    }
    return Array.from(ids);
  }, [sourceApplicationId, targetApplicationId, middlewareApplicationIds]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bindingsRes, ...instanceRes] = await Promise.all([
        api.get<{ items: BindingRow[] }>(`/interfaces/${interfaceId}/bindings`),
        ...appIds.map((appId) => api.get<AppInstanceOption[]>(`/applications/${appId}/instances`).then((r) => r.data as any)),
      ]);
      setBindings((bindingsRes.data?.items || []) as BindingRow[]);
      const nextInstances: Record<string, AppInstanceOption[]> = {};
      appIds.forEach((appId, idx) => {
        const list = instanceRes[idx] || [];
        nextInstances[appId] = list;
      });
      setInstancesByAppId(nextInstances);
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.loadBindingsFailed')));
    } finally {
      setLoading(false);
    }
  }, [interfaceId, appIds]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadLinksForBinding = React.useCallback(
    async (bindingId: string) => {
      setLinksLoadingBindingId(bindingId);
      setLinksError(null);
      try {
        const res = await api.get<{ items: BindingConnection[] }>(`/interface-bindings/${bindingId}/connection-links`);
        setLinksByBindingId((prev) => ({ ...prev, [bindingId]: res.data.items || [] }));
      } catch (e: any) {
        setLinksError(getApiErrorMessage(e, t, t('messages.loadConnectionsFailed')));
      } finally {
        setLinksLoadingBindingId((prev) => (prev === bindingId ? null : prev));
      }
    },
    [],
  );

  const usedEnvs = React.useMemo(() => {
    const set = new Set<string>();
    for (const env of manualEnvs) {
      if (env) set.add(env);
    }
    for (const b of bindings) {
      if (b.environment) set.add(b.environment);
    }
    return set;
  }, [bindings, manualEnvs]);

  const candidateEnvs = React.useMemo(() => {
    const envsByAppId: Record<string, Set<string>> = {};
    for (const [appId, list] of Object.entries(instancesByAppId)) {
      const envSet = new Set<string>();
      for (const inst of list) {
        if (inst.environment) envSet.add(inst.environment);
      }
      envsByAppId[appId] = envSet;
    }

    const sourceEnvs = envsByAppId[sourceApplicationId] || new Set<string>();
    const targetEnvs = envsByAppId[targetApplicationId] || new Set<string>();

    const result = new Set<string>();

    if (!sourceApplicationId || !targetApplicationId) {
      return [] as string[];
    }

    if (integrationRouteType === 'direct') {
      for (const env of sourceEnvs) {
        if (targetEnvs.has(env)) result.add(env);
      }
    } else {
      const middlewareEnvUnion = new Set<string>();
      for (const mid of middlewareApplicationIds || []) {
        const envs = envsByAppId[mid];
        if (!envs) continue;
        for (const env of envs) {
          middlewareEnvUnion.add(env);
        }
      }
      for (const env of sourceEnvs) {
        if (targetEnvs.has(env) && middlewareEnvUnion.has(env)) {
          result.add(env);
        }
      }
    }

    const ordered: string[] = ENVIRONMENTS.filter((e) => result.has(e));
    for (const e of Array.from(result)) {
      if (!ENVIRONMENTS.includes(e as any)) ordered.push(e);
    }
    return ordered;
  }, [instancesByAppId, integrationRouteType, middlewareApplicationIds, sourceApplicationId, targetApplicationId]);

  const selectableEnvs = React.useMemo(
    () => candidateEnvs.filter((env) => !usedEnvs.has(env)),
    [candidateEnvs, usedEnvs],
  );

  const allEnvs = React.useMemo(() => {
    const envList: string[] = ENVIRONMENTS.filter((e) => usedEnvs.has(e));
    for (const e of Array.from(usedEnvs)) {
      if (!ENVIRONMENTS.includes(e as any)) envList.push(e);
    }
    return envList;
  }, [usedEnvs]);

  const instancesById = React.useMemo(() => {
    const map: Record<string, AppInstanceOption> = {};
    for (const list of Object.values(instancesByAppId)) {
      for (const inst of list) {
        map[inst.id] = inst;
      }
    }
    return map;
  }, [instancesByAppId]);

  const bindingsByLegEnv = React.useMemo(() => {
    const map: Record<string, Record<string, BindingRow>> = {};
    for (const b of bindings) {
      if (!map[b.interface_leg_id]) map[b.interface_leg_id] = {};
      map[b.interface_leg_id][b.environment] = b;
    }
    return map;
  }, [bindings]);

  React.useEffect(() => {
    if (!manageConnections) return;
    let cancelled = false;
    const load = async () => {
      setConnectionLoading(true);
      try {
        const res = await api.get<{ items: any[] }>('/connections', {
          params: { q: connectionSearch || undefined, limit: 20 },
        });
        if (!cancelled) {
          const items =
            (res.data?.items || []).map((item: any) => ({
              id: item.id,
              name: item.name,
              connection_id: item.connection_id,
            })) || [];
          setConnectionOptions(items);
        }
      } catch {
        if (!cancelled) setConnectionOptions([]);
      } finally {
        if (!cancelled) setConnectionLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [connectionSearch, manageConnections]);

  React.useEffect(() => {
    const bindingId = manageConnections?.binding.id;
    if (bindingId && linksByBindingId[bindingId] === undefined) {
      void loadLinksForBinding(bindingId);
    }
  }, [manageConnections, linksByBindingId, loadLinksForBinding]);

  // Prefetch connection links for all loaded bindings so chips are visible without opening the dialog
  React.useEffect(() => {
    const ids = bindings.map((b) => b.id);
    ids.forEach((id) => {
      if (linksByBindingId[id] === undefined) {
        void loadLinksForBinding(id);
      }
    });
  }, [bindings, linksByBindingId, loadLinksForBinding]);

  React.useEffect(() => {
    if (!manageConnections) {
      setSelectedConnection(null);
      setConnectionSearch('');
      setConnectionOptions([]);
      setLinksError(null);
    }
  }, [manageConnections]);

  const instanceOptionsFor = React.useCallback(
    (role: string, environment: string): AppInstanceOption[] => {
      const roleLower = String(role || '').toLowerCase();
      const apps: string[] = [];
      if (roleLower === 'source') apps.push(sourceApplicationId);
      else if (roleLower === 'target') apps.push(targetApplicationId);
      else if (roleLower === 'middleware') apps.push(...middlewareApplicationIds);
      if (apps.length === 0) return [];
      const opts: AppInstanceOption[] = [];
      for (const appId of apps) {
        const list = instancesByAppId[appId] || [];
        for (const inst of list) {
          if (inst.environment === environment) opts.push(inst);
        }
      }
      return opts;
    },
    [instancesByAppId, middlewareApplicationIds, sourceApplicationId, targetApplicationId],
  );

  const defaultIntegrationToolId = React.useMemo(() => {
    const ids = middlewareApplicationIds || [];
    if (!ids || ids.length === 0) return null;
    return ids[0] || null;
  }, [middlewareApplicationIds]);

  const openCreate = (env: string, leg: InterfaceLeg) => {
    const sourceOptions = instanceOptionsFor(leg.from_role, env);
    const targetOptions = instanceOptionsFor(leg.to_role, env);
    setDialogState({
      mode: 'create',
      environment: env,
      leg,
      source_instance_id: sourceOptions[0]?.id || null,
      target_instance_id: targetOptions[0]?.id || null,
      status: 'active',
      source_endpoint: '',
      target_endpoint: '',
      trigger_details: '',
      env_job_name: leg.job_name || '',
      authentication_mode: null,
      monitoring_url: '',
      env_notes: '',
      integration_tool_application_id: defaultIntegrationToolId,
    });
    setDialogOpen(true);
    setError(null);
  };

  const openEdit = (env: string, leg: InterfaceLeg, binding: BindingRow) => {
    setDialogState({
      mode: 'edit',
      environment: env,
      leg,
      bindingId: binding.id,
      source_instance_id: binding.source_instance_id,
      target_instance_id: binding.target_instance_id,
      status: binding.status || 'proposed',
      source_endpoint: binding.source_endpoint || '',
      target_endpoint: binding.target_endpoint || '',
      trigger_details: binding.trigger_details || '',
      env_job_name: binding.env_job_name || '',
      authentication_mode: binding.authentication_mode || null,
      monitoring_url: binding.monitoring_url || '',
      env_notes: binding.env_notes || '',
      integration_tool_application_id: binding.integration_tool_application_id || null,
    });
    setDialogOpen(true);
    setError(null);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setDialogState(null);
  };

  const handleSaveDialog = async () => {
    if (!dialogState) return;
    if (!dialogState.source_instance_id || !dialogState.target_instance_id) {
      setError('Select source and target instances');
      return;
    }
    const payload: any = {
      source_instance_id: dialogState.source_instance_id,
      target_instance_id: dialogState.target_instance_id,
      source_endpoint: dialogState.source_endpoint || null,
      target_endpoint: dialogState.target_endpoint || null,
      trigger_details: dialogState.trigger_details || null,
      env_job_name: dialogState.env_job_name || null,
      authentication_mode: dialogState.authentication_mode || null,
      monitoring_url: dialogState.monitoring_url || null,
      env_notes: dialogState.env_notes || null,
      status: dialogState.status || 'proposed',
      integration_tool_application_id: dialogState.integration_tool_application_id || null,
    };
    try {
      if (dialogState.mode === 'create') {
        await api.post(`/interfaces/${interfaceId}/bindings`, {
          interface_leg_id: dialogState.leg.id,
          ...payload,
        });
      } else if (dialogState.bindingId) {
        await api.patch(`/interface-bindings/${dialogState.bindingId}`, payload);
      }
      closeDialog();
      await load();
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.saveBindingFailed')));
    }
  };

  const handleDeleteBinding = async (binding: BindingRow) => {
    if (!window.confirm(t('confirmations.removeBinding'))) return;
    setError(null);
    try {
      await api.delete(`/interface-bindings/${binding.id}`);
      await load();
    } catch (e: any) {
      setError(getApiErrorMessage(e, t, t('messages.deleteBindingFailed')));
    }
  };

  const handleLinkConnection = React.useCallback(async () => {
    if (!manageConnections || !selectedConnection) return;
    setLinkSaving(true);
    setLinksError(null);
    try {
      await api.post(`/interface-bindings/${manageConnections.binding.id}/connection-links`, {
        connection_id: selectedConnection.id,
      });
      await loadLinksForBinding(manageConnections.binding.id);
      setSelectedConnection(null);
    } catch (e: any) {
      setLinksError(getApiErrorMessage(e, t, t('messages.linkConnectionFailed')));
    } finally {
      setLinkSaving(false);
    }
  }, [manageConnections, selectedConnection, loadLinksForBinding]);

  const handleUnlinkConnection = React.useCallback(
    async (linkId: string, bindingId: string) => {
      setUnlinkingLinkId(linkId);
      setLinksError(null);
      try {
        await api.delete(`/interface-bindings/${bindingId}/connection-links/${linkId}`);
        await loadLinksForBinding(bindingId);
      } catch (e: any) {
        setLinksError(getApiErrorMessage(e, t, t('messages.unlinkConnectionFailed')));
      } finally {
        setUnlinkingLinkId((prev) => (prev === linkId ? null : prev));
      }
    },
    [loadLinksForBinding],
  );

  const authOptions = byField.interfaceAuthMode || [];

  const renderLegRow = (env: string, leg: InterfaceLeg, binding: BindingRow | undefined) => {
    const hasBinding = !!binding;
    const links = binding ? linksByBindingId[binding.id] : undefined;
    const formatInstance = (id: string | null | undefined): string => {
      if (!id) return '—';
      const inst = instancesById[id];
      if (!inst) return id;
      let appLabel = 'Middleware';
      if (inst.application_id === sourceApplicationId) appLabel = sourceApplicationName || 'Source';
      else if (inst.application_id === targetApplicationId) appLabel = targetApplicationName || 'Target';
      const envLabel = (inst.environment || '').toUpperCase();
      return `${appLabel} · ${envLabel}`;
    };
    return (
      <TableRow key={`env-${env}-${leg.id}`}>
        <TableCell sx={{ fontWeight: 500 }}>
          {String(leg.leg_type || '').toUpperCase()}
        </TableCell>
        <TableCell>
          <Stack spacing={0.25}>
            <Typography variant="body2">
              Trigger:{' '}
              {labelFor('interfaceTriggerType', leg.trigger_type) || leg.trigger_type}
            </Typography>
            <Typography variant="body2">
              Pattern:{' '}
              {labelFor('interfacePattern', leg.integration_pattern) || leg.integration_pattern}
            </Typography>
            <Typography variant="body2">
              Format:{' '}
              {labelFor('interfaceFormat', leg.data_format) || leg.data_format}
            </Typography>
            <Typography variant="body2">
              Job name: {leg.job_name || '—'}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell>
          {hasBinding ? (
            <Stack spacing={0.5}>
              <Typography variant="body2">
                Source instance:{' '}
                <strong>{formatInstance(binding.source_instance_id)}</strong>
              </Typography>
              <Typography variant="body2">
                Target instance:{' '}
                <strong>{formatInstance(binding.target_instance_id)}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status:{' '}
                {labelFor('lifecycleStatus', binding.status) || binding.status || '—'}
                {binding.authentication_mode
                  ? ` · Auth: ${
                    labelFor('interfaceAuthMode', binding.authentication_mode) || binding.authentication_mode
                  }`
                  : ''}
              </Typography>
              {binding.source_endpoint && (
                <Typography variant="body2" color="text.secondary">
                  Source endpoint: {binding.source_endpoint}
                </Typography>
              )}
              {binding.target_endpoint && (
                <Typography variant="body2" color="text.secondary">
                  Target endpoint: {binding.target_endpoint}
                </Typography>
              )}
              {binding.monitoring_url && (
                <Typography variant="body2" color="text.secondary">
                  Monitoring: {binding.monitoring_url}
                </Typography>
              )}
              {binding.env_notes && (
                <Typography variant="body2" color="text.secondary">
                  Notes: {binding.env_notes}
                </Typography>
              )}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No binding defined for this leg in {env.toUpperCase()}.
            </Typography>
          )}
          {binding && (
            <Box sx={{ mt: 0.5 }}>
            </Box>
          )}
        </TableCell>
        <TableCell sx={{ minWidth: 200 }}>
          {binding && (
            <Box sx={{ mt: 0.5 }}>
              {linksLoadingBindingId === binding.id && (
                <Typography variant="caption" color="text.secondary">
                  Loading infra connections…
                </Typography>
              )}
              {linksError && (
                <Typography variant="caption" color="error">
                  {linksError}
                </Typography>
              )}
              {links && links.length > 0 && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {links.map((link) => (
                    <Typography key={link.id} variant="body2" color="text.secondary" sx={{ mr: 0.5, mb: 0.5 }}>
                      {link.connection.name || link.connection.connection_id}
                    </Typography>
                  ))}
                </Stack>
              )}
              {links && links.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No infra connections linked
                </Typography>
              )}
              {links && links.length === 0 && binding.status === 'active' && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                  Active binding without infra connection
                </Typography>
              )}
            </Box>
          )}
          {!binding && (
            <Typography variant="caption" color="text.secondary">
              —
            </Typography>
          )}
          {hasBinding && (
            <Tooltip title="Manage infra connections">
              <span>
                <Button
                  size="small"
                  onClick={() => {
                    setManageConnections({ binding: binding! });
                    if (!linksByBindingId[binding!.id]) {
                      void loadLinksForBinding(binding!.id);
                    }
                  }}
                  sx={{ mt: 1 }}
                >
                  Manage Connection
                </Button>
              </span>
            </Tooltip>
          )}
        </TableCell>
        <TableCell align="right">
          <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
            <Tooltip title={hasBinding ? 'Edit binding' : 'Add binding'}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => {
                    if (hasBinding && binding) openEdit(env, leg, binding);
                    else openCreate(env, leg);
                  }}
                >
                  {hasBinding ? <EditIcon fontSize="small" /> : <AddIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            {hasBinding && (
              <Tooltip title="Delete binding">
                <span>
                  <IconButton size="small" onClick={() => void handleDeleteBinding(binding!)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        sx={{ mb: 2 }}
        spacing={1}
      >
        <Stack>
          <Typography variant="h6">Environments & bindings</Typography>
          <Typography variant="body2" color="text.secondary">
            For each environment, configure which instances are connected for each leg of the interface.
          </Typography>
          {integrationRouteType === 'via_middleware' && (
            <Typography variant="body2" color="text.secondary">
              Route type: via middleware — legs: EXTRACT, TRANSFORM, LOAD.
            </Typography>
          )}
          {integrationRouteType === 'direct' && (
            <Typography variant="body2" color="text.secondary">
              Route type: direct — single DIRECT leg between source and target.
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => {
              const first = selectableEnvs[0] || '';
              setEnvDraft(first);
              setEnvDialogOpen(true);
            }}
            disabled={selectableEnvs.length === 0}
          >
            Add environment
          </Button>
        </Stack>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Loading bindings…
        </Typography>
      )}
      {allEnvs.length === 0 && !loading && (
        <Alert severity="info">
          No environments defined yet. Click &quot;Add environment&quot; to start documenting bindings. You will need
          application instances for each environment in the Applications workspace to create bindings.
        </Alert>
      )}
      {allEnvs.map((env) => (
        <Box key={env} sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1">
              Environment: {env.toUpperCase()}
            </Typography>
            <Button
              size="small"
              color="error"
              onClick={async () => {
                const envBindings = bindings.filter((b) => b.environment === env);
                if (envBindings.length > 0) {
                  const ok = window.confirm(
                    `Delete all bindings for environment ${env.toUpperCase()}? This cannot be undone.`,
                  );
                  if (!ok) return;
                  setError(null);
                  try {
                    await Promise.all(
                      envBindings.map((b) => api.delete(`/interface-bindings/${b.id}`)),
                    );
                    setManualEnvs((prev) => prev.filter((e) => e !== env));
                    await load();
                  } catch (e: any) {
                    setError(
                      getApiErrorMessage(e, t, t('messages.deleteEnvBindingsFailed')),
                    );
                  }
                } else {
                  setManualEnvs((prev) => prev.filter((e) => e !== env));
                }
              }}
            >
              Delete environment
            </Button>
          </Stack>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Leg</TableCell>
                <TableCell>Technical template</TableCell>
                <TableCell>{`Binding in ${env.toUpperCase()}`}</TableCell>
                <TableCell>Connections</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {legs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      No legs defined for this interface yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {legs.map((leg) => {
                const byEnv = bindingsByLegEnv[leg.id] || {};
                const binding = byEnv[env];
                return renderLegRow(env, leg, binding);
              })}
            </TableBody>
          </Table>
        </Box>
      ))}

      <Dialog open={!!manageConnections} onClose={() => setManageConnections(null)} maxWidth="md" fullWidth>
        <DialogTitle>Manage infra connections</DialogTitle>
        <DialogContent dividers>
          {linksError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {linksError}
            </Alert>
          )}
          {manageConnections && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Env: {manageConnections.binding.environment.toUpperCase()} · Leg: {manageConnections.binding.leg_type.toUpperCase()}
              </Typography>
              {linksLoadingBindingId === manageConnections.binding.id && (
                <Typography variant="body2" color="text.secondary">
                  Loading infra connections…
                </Typography>
              )}
              {linksByBindingId[manageConnections.binding.id] && (
                <Stack spacing={1}>
                  {linksByBindingId[manageConnections.binding.id].length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No infra connections linked yet.
                    </Typography>
                  )}
                  {linksByBindingId[manageConnections.binding.id].map((link) => (
                    <Box
                      key={link.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1,
                      }}
                    >
                      <Box sx={{ pr: 1, flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {link.connection.name || link.connection.connection_id}{' '}
                          <Typography component="span" variant="caption" color="text.secondary">
                            ({link.connection.connection_id})
                          </Typography>
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            {link.connection.topology === 'multi_server' ? 'Multi-server' : 'Server to server'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {`Lifecycle: ${link.connection.lifecycle}`}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {`Criticality: ${link.connection.criticality}`}
                          </Typography>
                          <Typography variant="body2" color={link.connection.contains_pii ? 'warning.main' : 'text.secondary'}>
                            {link.connection.contains_pii ? 'Contains PII' : 'No PII'}
                          </Typography>
                        </Stack>
                        {link.notes && (
                          <Typography variant="caption" color="text.secondary">
                            Notes: {link.notes}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => navigate(`/it/connections/${link.connection.id}/overview`)}
                        >
                          Open connection
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => void handleUnlinkConnection(link.id, manageConnections.binding.id)}
                          disabled={unlinkingLinkId === link.id}
                        >
                          {unlinkingLinkId === link.id ? 'Unlinking…' : 'Unlink'}
                        </Button>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Link existing connection
                </Typography>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <Autocomplete
                    options={connectionOptions}
                    loading={connectionLoading}
                    value={selectedConnection}
                    inputValue={connectionSearch}
                    onInputChange={(_, v) => setConnectionSearch(v)}
                    onChange={(_, val) => setSelectedConnection(val)}
                    getOptionLabel={(opt) => (opt?.name ? `${opt.name} (${opt.connection_id})` : opt?.connection_id || '')}
                    isOptionEqualToValue={(opt, val) => opt.id === val.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Search connections"
                        placeholder="Name or ID"
                        InputLabelProps={{ shrink: true }}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {connectionLoading ? <CircularProgress size={16} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    sx={{ minWidth: 280, flex: 1 }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => void handleLinkConnection()}
                    disabled={!selectedConnection || linkSaving}
                  >
                    {linkSaving ? 'Linking…' : 'Link'}
                  </Button>
                </Stack>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const b = manageConnections.binding;
                    const params = new URLSearchParams({
                      interfaceId,
                      bindingId: b.id,
                      environment: b.environment,
                      legType: b.leg_type,
                    });
                    setManageConnections(null);
                    navigate(`/it/connections/new/overview?${params.toString()}`);
                  }}
                >
                  Create connection…
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageConnections(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogState?.mode === 'edit' ? 'Edit binding' : 'Add binding'}</DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {dialogState && (
            <Stack spacing={2}>
              <TextField
                label="Environment"
                value={dialogState.environment.toUpperCase()}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="Leg"
                value={`${String(dialogState.leg.leg_type || '').toUpperCase()} — ${
                  getRoleLabel(dialogState.leg.from_role, sourceApplicationName, targetApplicationName)
                } → ${
                  getRoleLabel(dialogState.leg.to_role, sourceApplicationName, targetApplicationName)
                }`}
                InputProps={{ readOnly: true }}
              />
              <TextField
                select
                label="Source instance"
                value={dialogState.source_instance_id || ''}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, source_instance_id: e.target.value || null } : prev))
                }
                required
              >
                {instanceOptionsFor(dialogState.leg.from_role, dialogState.environment).map((inst) => (
                  <MenuItem key={inst.id} value={inst.id}>
                    {dialogState.environment.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Target instance"
                value={dialogState.target_instance_id || ''}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, target_instance_id: e.target.value || null } : prev))
                }
                required
              >
                {instanceOptionsFor(dialogState.leg.to_role, dialogState.environment).map((inst) => (
                  <MenuItem key={inst.id} value={inst.id}>
                    {dialogState.environment.toUpperCase()}
                  </MenuItem>
                ))}
              </TextField>
              {integrationRouteType === 'via_middleware' && (
                <ApplicationSelect
                  label="Integration tool"
                  value={dialogState.integration_tool_application_id}
                  onChange={(v) =>
                    setDialogState((prev) => (prev ? { ...prev, integration_tool_application_id: v } : prev))
                  }
                  onlyEtl
                />
              )}
              <TextField
                select
                label="Status"
                value={dialogState.status}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, status: e.target.value } : prev))
                }
              >
                {lifecycleOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Authentication mode"
                value={dialogState.authentication_mode || ''}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, authentication_mode: e.target.value || null } : prev))
                }
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {authOptions.map((opt) => (
                  <MenuItem key={opt.code} value={opt.code}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Source endpoint"
                value={dialogState.source_endpoint}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, source_endpoint: e.target.value } : prev))
                }
                helperText="File path, URL, queue name, etc."
              />
              <TextField
                label="Target endpoint"
                value={dialogState.target_endpoint}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, target_endpoint: e.target.value } : prev))
                }
                helperText="File path, URL, queue name, etc."
              />
              <TextField
                label="Trigger details"
                value={dialogState.trigger_details}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, trigger_details: e.target.value } : prev))
                }
                helperText="Cron expression, event description, batch window…"
                multiline
                minRows={2}
              />
              <TextField
                label="Job name (env-specific)"
                value={dialogState.env_job_name}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, env_job_name: e.target.value } : prev))
                }
              />
              <TextField
                label="Monitoring URL"
                value={dialogState.monitoring_url}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, monitoring_url: e.target.value } : prev))
                }
              />
              <TextField
                label="Notes"
                value={dialogState.env_notes}
                onChange={(e) =>
                  setDialogState((prev) => (prev ? { ...prev, env_notes: e.target.value } : prev))
                }
                multiline
                minRows={3}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>{t('common:buttons.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveDialog()}
            disabled={!dialogState?.source_instance_id || !dialogState?.target_instance_id}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={envDialogOpen} onClose={() => setEnvDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add environment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              select
              label="Environment"
              value={envDraft}
              onChange={(e) => setEnvDraft(e.target.value)}
              fullWidth
            >
              {selectableEnvs.map((env) => (
                <MenuItem key={env} value={env}>
                  {env.toUpperCase()}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnvDialogOpen(false)}>{t('common:buttons.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => {
              const env = envDraft.trim();
              if (!env || usedEnvs.has(env)) {
                setEnvDialogOpen(false);
                return;
              }
              setManualEnvs((prev) => (prev.includes(env) ? prev : [...prev, env]));
              setEnvDialogOpen(false);
            }}
            disabled={!envDraft}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
