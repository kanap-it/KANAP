import React from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ServerOption } from '../../../../components/fields/ServerSelect';
import useItOpsEnumOptions from '../../../../hooks/useItOpsEnumOptions';
import type { ConnectionDetail, ConnectionLeg, EntityOption, SourceTargetOption } from './types';

import { useTranslation } from 'react-i18next';
interface LayersTabProps {
  data: ConnectionDetail | null;
  isCreate: boolean;
  loading: boolean;
  legsDraft: ConnectionLeg[];
  legsDirty: boolean;
  legsError: string | null;
  legsSaving: boolean;
  sourceServerOptions: ServerOption[];
  destinationServerOptions: ServerOption[];
  multiServerOptions: ServerOption[];
  legServerOptions: ServerOption[];
  onAddLeg: () => void;
  onLegChange: (leg: ConnectionLeg, patch: Partial<ConnectionLeg>) => void;
  onRemoveLeg: (leg: ConnectionLeg) => void;
  onSaveLegs: () => void;
  onResetLegs: () => void;
}

export default function LayersTab({
  data,
  isCreate,
  loading,
  legsDraft,
  legsDirty,
  legsError,
  legsSaving,
  sourceServerOptions,
  destinationServerOptions,
  multiServerOptions,
  legServerOptions,
  onAddLeg,
  onLegChange,
  onRemoveLeg,
  onSaveLegs,
  onResetLegs,
}: LayersTabProps) {
  const { t } = useTranslation(['it', 'common']);
  const { settings } = useItOpsEnumOptions();

  const entityOptions: EntityOption[] = React.useMemo(
    () => (settings?.entities || []).map((e: any) => ({ code: e.code, label: e.label || e.code })),
    [settings?.entities],
  );

  const protocolOptions = React.useMemo(
    () => {
      const list =
        (settings?.connectionTypes || []).map((ct: any) => ({
          label: ct.category ? `${ct.category}, ${ct.label}` : ct.label,
          value: ct.code,
          sortKey: `${ct.category || ''}-${ct.label || ''}-${ct.code}`,
          typicalPorts: ct.typicalPorts || ct.typical_ports || '',
        })) || [];
      const dedup = Array.from(new Map(list.map((o) => [o.value, o])).values());
      dedup.sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { sensitivity: 'base' }));
      return dedup;
    },
    [settings?.connectionTypes],
  );

  const protocolPortMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of protocolOptions) {
      map.set(opt.value, opt.typicalPorts || '');
    }
    return map;
  }, [protocolOptions]);

  const groupKeyForKind = React.useCallback((kind: SourceTargetOption['kind']) => {
    switch (kind) {
      case 'entity': return '1 Entities';
      case 'cluster': return '2 Clusters';
      default: return '3 Servers';
    }
  }, []);

  const displayGroupLabel = React.useCallback((groupKey: string) => groupKey.replace(/^\d+\s*/, ''), []);

  const combinedOptions = React.useCallback(
    (serverList: ServerOption[], entityList: EntityOption[]): SourceTargetOption[] => {
      const entities = [...entityList]
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
        .map((e) => ({ label: e.label, value: e.code, kind: 'entity' as const }));

      const clusters = serverList
        .filter((s) => !!s.is_cluster)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        .map((s) => ({
          label: `Cluster: ${s.name}`,
          value: s.id,
          kind: 'cluster' as const,
          isCluster: true,
        }));

      const servers = serverList
        .filter((s) => !s.is_cluster)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
        .map((s) => ({
          label: s.name,
          value: s.id,
          kind: 'server' as const,
          isCluster: false,
        }));

      return [...entities, ...clusters, ...servers];
    },
    [],
  );

  const legEndpointOptions = React.useMemo(
    () =>
      combinedOptions(
        Array.from(
          new Map(
            [...sourceServerOptions, ...destinationServerOptions, ...multiServerOptions, ...legServerOptions].map((s) => [s.id, s]),
          ).values(),
        ),
        entityOptions,
      ),
    [combinedOptions, destinationServerOptions, entityOptions, legServerOptions, multiServerOptions, sourceServerOptions],
  );

  const sortedLegs = React.useMemo(
    () => [...legsDraft].sort((a, b) => a.order_index - b.order_index || (a.id || '').localeCompare(b.id || '')),
    [legsDraft],
  );

  return (
    <Stack spacing={2} sx={{ maxWidth: 960 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Layers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Document up to three ordered legs. Each leg needs one source and one destination (server or entity).
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
          <Button
            onClick={onResetLegs}
            disabled={isCreate || loading || !legsDirty}
          >
            Reset layers
          </Button>
          <Button
            variant="outlined"
            onClick={onAddLeg}
            disabled={isCreate || sortedLegs.length >= 3 || loading}
          >
            Add layer
          </Button>
          <Button
            variant="contained"
            onClick={onSaveLegs}
            disabled={isCreate || legsSaving || !legsDirty}
          >
            {legsSaving ? 'Saving...' : 'Save layers'}
          </Button>
        </Stack>
      </Stack>

      {isCreate && (
        <Alert severity="info">Save the connection first to add layers.</Alert>
      )}
      {legsError && (
        <Alert severity="error">{legsError}</Alert>
      )}
      {!isCreate && !loading && sortedLegs.length === 0 && (
        <Alert severity="info">
          No layers yet. Add reverse proxies, firewalls, or hops as legs (max 3).
        </Alert>
      )}

      {sortedLegs.map((leg, idx) => (
        <Box
          key={leg.id || `leg-${idx}`}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2 }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            sx={{ mb: 1 }}
            spacing={1}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Layer {leg.order_index || idx + 1}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => onRemoveLeg(leg)} disabled={isCreate}>
                Remove
              </Button>
            </Stack>
          </Stack>

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Order"
                type="number"
                value={leg.order_index}
                onChange={(e) => onLegChange(leg, { order_index: Number(e.target.value) })}
                InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: '100%', md: 140 } }}
                disabled={isCreate}
                required
                helperText="1 = first hop, up to 3"
              />
              <TextField
                label="Name"
                value={leg.layer_type || ''}
                onChange={(e) => onLegChange(leg, { layer_type: e.target.value })}
                InputLabelProps={{ shrink: true }}
                placeholder="direct, reverse_proxy, firewall..."
                disabled={isCreate}
                sx={{ flex: 1 }}
                required
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Autocomplete
                options={legEndpointOptions}
                value={
                  leg.source_server_id
                    ? legEndpointOptions.find(
                        (o) => (o.kind === 'server' || o.kind === 'cluster') && o.value === leg.source_server_id,
                      ) || null
                    : leg.source_entity_code
                      ? legEndpointOptions.find((o) => o.kind === 'entity' && o.value === leg.source_entity_code) || null
                      : null
                }
                onChange={(_, val) => {
                  if (!val) {
                    onLegChange(leg, { source_server_id: null, source_entity_code: null });
                    return;
                  }
                  if (val.kind === 'entity') {
                    onLegChange(leg, { source_entity_code: val.value, source_server_id: null });
                  } else {
                    onLegChange(leg, { source_server_id: val.value, source_entity_code: null });
                  }
                }}
                groupBy={(opt) => groupKeyForKind(opt.kind)}
                getOptionLabel={(opt) => opt.label}
                renderGroup={(params) => (
                  <li key={params.key}>
                    <Typography variant="caption" sx={{ pl: 1.5, pt: 0.5, color: 'text.secondary' }}>
                      {displayGroupLabel(params.group)}
                    </Typography>
                    <ul style={{ padding: 0 }}>{params.children}</ul>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Source"
                    placeholder="Entity or server"
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                )}
                disabled={isCreate}
                fullWidth
              />
              <Autocomplete
                options={legEndpointOptions}
                value={
                  leg.destination_server_id
                    ? legEndpointOptions.find(
                        (o) => (o.kind === 'server' || o.kind === 'cluster') && o.value === leg.destination_server_id,
                      ) || null
                    : leg.destination_entity_code
                      ? legEndpointOptions.find((o) => o.kind === 'entity' && o.value === leg.destination_entity_code) || null
                      : null
                }
                onChange={(_, val) => {
                  if (!val) {
                    onLegChange(leg, { destination_server_id: null, destination_entity_code: null });
                    return;
                  }
                  if (val.kind === 'entity') {
                    onLegChange(leg, { destination_entity_code: val.value, destination_server_id: null });
                  } else {
                    onLegChange(leg, { destination_server_id: val.value, destination_entity_code: null });
                  }
                }}
                groupBy={(opt) => groupKeyForKind(opt.kind)}
                getOptionLabel={(opt) => opt.label}
                renderGroup={(params) => (
                  <li key={params.key}>
                    <Typography variant="caption" sx={{ pl: 1.5, pt: 0.5, color: 'text.secondary' }}>
                      {displayGroupLabel(params.group)}
                    </Typography>
                    <ul style={{ padding: 0 }}>{params.children}</ul>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Destination"
                    placeholder="Entity or server"
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                )}
                disabled={isCreate}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <Autocomplete
                multiple
                options={protocolOptions}
                value={protocolOptions.filter((opt) => (leg.protocol_codes || []).includes(opt.value))}
                onChange={(_, vals) => {
                  const codes = (vals || []).map((v) => v.value);
                  const prevCodes = leg.protocol_codes || [];
                  const currentPort = (leg.port_override || '').trim();
                  let parts = currentPort
                    ? currentPort.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
                    : [];

                  const removedCodes = prevCodes.filter((c) => !codes.includes(c));
                  const removedPorts = removedCodes
                    .map((c) => protocolPortMap.get(c))
                    .filter((p): p is string => !!p && p.trim().length > 0)
                    .map((p) => p.trim());
                  if (removedPorts.length > 0 && parts.length > 0) {
                    parts = parts.filter((p) => !removedPorts.includes(p));
                  }

                  const addedCodes = codes.filter((c) => !prevCodes.includes(c));
                  const addedPorts = addedCodes
                    .map((c) => protocolPortMap.get(c))
                    .filter((p): p is string => !!p && p.trim().length > 0)
                    .map((p) => p.trim());
                  for (const ap of addedPorts) {
                    if (!parts.includes(ap)) parts.push(ap);
                  }

                  if (parts.length === 0 && codes.length > 0) {
                    const seed = protocolPortMap.get(codes[0]);
                    if (seed && seed.trim().length > 0) parts.push(seed.trim());
                  }

                  const nextPort = parts.join(', ');
                  onLegChange(leg, {
                    protocol_codes: codes,
                    port_override: nextPort,
                  });
                }}
                isOptionEqualToValue={(opt, val) => opt.value === val.value}
                getOptionLabel={(opt) => opt.label}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Protocols"
                    placeholder="Select protocols"
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                )}
                disabled={isCreate}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Port override"
                value={leg.port_override || ''}
                onChange={(e) => onLegChange(leg, { port_override: e.target.value })}
                InputLabelProps={{ shrink: true }}
                disabled={isCreate}
                sx={{ minWidth: 160 }}
              />
            </Stack>

            <TextField
              label="Notes"
              value={leg.notes || ''}
              onChange={(e) => onLegChange(leg, { notes: e.target.value })}
              InputLabelProps={{ shrink: true }}
              multiline
              minRows={2}
              disabled={isCreate}
            />
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
