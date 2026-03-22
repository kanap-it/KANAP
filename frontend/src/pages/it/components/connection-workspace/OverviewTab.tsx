import React from 'react';
import {
  Autocomplete,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import api from '../../../../api';
import { ServerOption } from '../../../../components/fields/ServerSelect';
import useItOpsEnumOptions from '../../../../hooks/useItOpsEnumOptions';
import EnumAutocomplete from '../../../../components/fields/EnumAutocomplete';
import type { ConnectionDetail, EntityOption, SourceTargetOption, ConnectionTabProps } from './types';

interface OverviewTabProps extends ConnectionTabProps {
  sourceServerOptions: ServerOption[];
  destinationServerOptions: ServerOption[];
  multiServerOptions: ServerOption[];
  sourceServerLoading: boolean;
  destinationServerLoading: boolean;
  multiServerLoading: boolean;
  setSourceServerSearch: (v: string) => void;
  setDestinationServerSearch: (v: string) => void;
  setMultiServerSearch: (v: string) => void;
  multiServerSearch: string;
}

export default function OverviewTab({
  data,
  update,
  isCreate,
  loading,
  sourceServerOptions,
  destinationServerOptions,
  multiServerOptions,
  sourceServerLoading,
  destinationServerLoading,
  multiServerLoading,
  setSourceServerSearch,
  setDestinationServerSearch,
  setMultiServerSearch,
  multiServerSearch,
}: OverviewTabProps) {
  const { settings, byField } = useItOpsEnumOptions();

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

  const lifecycleOptions = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    const current = data?.lifecycle;
    const opts = list.map((item) => ({
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
      value: item.code,
      deprecated: !!item.deprecated,
    }));
    if (current && !opts.some((o) => o.value === current)) {
      opts.push({ label: current, value: current, deprecated: false });
    }
    return opts.filter((o) => !o.deprecated || o.value === current);
  }, [byField.lifecycleStatus, data?.lifecycle]);

  const protocolPortMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of protocolOptions) {
      map.set(opt.value, opt.typicalPorts || '');
    }
    return map;
  }, [protocolOptions]);

  const topologyOptions = [
    { label: 'Server to Server', value: 'server_to_server' },
    { label: 'Multi-server', value: 'multi_server' },
  ] as const;

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

  const sourceOptionsCombined = React.useMemo(() => {
    const combined = combinedOptions(sourceServerOptions, entityOptions);
    if (data?.source_server_id && data.source_server && !combined.some((o) => o.value === data.source_server_id)) {
      combined.push({
        label: data.source_server.is_cluster ? `Cluster: ${data.source_server.name}` : data.source_server.name,
        value: data.source_server.id,
        kind: data.source_server.is_cluster ? 'cluster' : 'server',
        isCluster: !!data.source_server.is_cluster,
      });
    }
    if (data?.source_entity_code && !combined.some((o) => o.kind === 'entity' && o.value === data.source_entity_code)) {
      combined.push({ label: data.source_entity_code, value: data.source_entity_code, kind: 'entity' });
    }
    return combined;
  }, [combinedOptions, sourceServerOptions, entityOptions, data]);
  const destinationOptionsCombined = React.useMemo(() => {
    const combined = combinedOptions(destinationServerOptions, entityOptions);
    if (data?.destination_server_id && data.destination_server && !combined.some((o) => o.value === data.destination_server_id)) {
      combined.push({
        label: data.destination_server.is_cluster ? `Cluster: ${data.destination_server.name}` : data.destination_server.name,
        value: data.destination_server.id,
        kind: data.destination_server.is_cluster ? 'cluster' : 'server',
        isCluster: !!data.destination_server.is_cluster,
      });
    }
    if (data?.destination_entity_code && !combined.some((o) => o.kind === 'entity' && o.value === data.destination_entity_code)) {
      combined.push({ label: data.destination_entity_code, value: data.destination_entity_code, kind: 'entity' });
    }
    return combined;
  }, [combinedOptions, destinationServerOptions, entityOptions, data]);

  const serversValue = (data?.servers || []) as ServerOption[];
  const multiServerOptionsMerged = React.useMemo(() => {
    const map = new Map<string, ServerOption>();
    serversValue.forEach((s) => map.set(s.id, s));
    multiServerOptions.forEach((s) => {
      if (!map.has(s.id)) map.set(s.id, s);
    });
    return Array.from(map.values());
  }, [multiServerOptions, serversValue]);

  const selectedSourceOption = React.useMemo(() => {
    if (!data) return null;
    if (data.source_server_id) {
      return sourceOptionsCombined.find(
        (o) => (o.kind === 'server' || o.kind === 'cluster') && o.value === data.source_server_id,
      ) || null;
    }
    if (data.source_entity_code) {
      return sourceOptionsCombined.find((o) => o.kind === 'entity' && o.value === data.source_entity_code) || null;
    }
    return null;
  }, [data, sourceOptionsCombined]);

  const selectedDestinationOption = React.useMemo(() => {
    if (!data) return null;
    if (data.destination_server_id) {
      return destinationOptionsCombined.find(
        (o) => (o.kind === 'server' || o.kind === 'cluster') && o.value === data.destination_server_id,
      ) || null;
    }
    if (data.destination_entity_code) {
      return destinationOptionsCombined.find((o) => o.kind === 'entity' && o.value === data.destination_entity_code) || null;
    }
    return null;
  }, [data, destinationOptionsCombined]);

  const sourceIsCluster = React.useMemo(() => {
    if (!data?.source_server_id) return false;
    const match = sourceServerOptions.find((s) => s.id === data.source_server_id);
    return !!match?.is_cluster;
  }, [data?.source_server_id, sourceServerOptions]);

  const destinationIsCluster = React.useMemo(() => {
    if (!data?.destination_server_id) return false;
    const match = destinationServerOptions.find((s) => s.id === data.destination_server_id);
    return !!match?.is_cluster;
  }, [data?.destination_server_id, destinationServerOptions]);

  const multiHasCluster = React.useMemo(() => {
    const servers = data?.servers || [];
    return servers.some((s) => (s as any).is_cluster);
  }, [data?.servers]);

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Stack spacing={2}>
        <TextField
          label="Connection ID"
          value={data?.connection_id || ''}
          onChange={(e) => update({ connection_id: e.target.value })}
          required
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Name"
          value={data?.name || ''}
          onChange={(e) => update({ name: e.target.value })}
          required
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="Purpose"
          value={data?.purpose || ''}
          onChange={(e) => update({ purpose: e.target.value })}
          multiline
          minRows={3}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>

      <Stack spacing={2}>
        <EnumAutocomplete
          label="Connection type"
          value={data?.topology || 'server_to_server'}
          onChange={(v) => {
            const next = v as 'server_to_server' | 'multi_server';
            update({
              topology: next,
              source_server_id: next === 'server_to_server' ? data?.source_server_id || null : null,
              source_entity_code: next === 'server_to_server' ? data?.source_entity_code || null : null,
              destination_server_id: next === 'server_to_server' ? data?.destination_server_id || null : null,
              destination_entity_code: next === 'server_to_server' ? data?.destination_entity_code || null : null,
              servers: next === 'multi_server' ? [] : [],
            });
          }}
          options={topologyOptions as any}
        />

        {data?.topology === 'server_to_server' && (
          <Stack spacing={2}>
            <Autocomplete
              options={sourceOptionsCombined}
              loading={sourceServerLoading}
              value={selectedSourceOption}
              onInputChange={(_, v, reason) => {
                if (reason === 'input') setSourceServerSearch(v);
              }}
              onChange={(_, val) => {
                if (!val) {
                  update({ source_server_id: null, source_entity_code: null });
                  return;
                }
                if (val.kind === 'entity') {
                  update({ source_entity_code: val.value, source_server_id: null });
                } else {
                  update({ source_server_id: val.value, source_entity_code: null });
                }
              }}
              isOptionEqualToValue={(opt, val) => opt.kind === val.kind && opt.value === val.value}
              getOptionLabel={(opt) => opt.label}
              groupBy={(opt) => groupKeyForKind(opt.kind)}
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
                  label="Select a source entity or server"
                  placeholder="Search"
                  required
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {sourceServerLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              fullWidth
            />
            {sourceIsCluster && (
              <Typography variant="caption" color="text.secondary">
                Source endpoint is a cluster. Member hosts are listed in the Servers workspace.
              </Typography>
            )}
            <Autocomplete
              options={destinationOptionsCombined}
              loading={destinationServerLoading}
              value={selectedDestinationOption}
              onInputChange={(_, v, reason) => {
                if (reason === 'input') setDestinationServerSearch(v);
              }}
              onChange={(_, val) => {
                if (!val) {
                  update({ destination_server_id: null, destination_entity_code: null });
                  return;
                }
                if (val.kind === 'entity') {
                  update({ destination_entity_code: val.value, destination_server_id: null });
                } else {
                  update({ destination_server_id: val.value, destination_entity_code: null });
                }
              }}
              isOptionEqualToValue={(opt, val) => opt.kind === val.kind && opt.value === val.value}
              getOptionLabel={(opt) => opt.label}
              groupBy={(opt) => groupKeyForKind(opt.kind)}
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
                  label="Select a destination entity or server"
                  placeholder="Search"
                  required
                  InputLabelProps={{ shrink: true }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {destinationServerLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              fullWidth
            />
            {destinationIsCluster && (
              <Typography variant="caption" color="text.secondary">
                Destination endpoint is a cluster. Member hosts are listed in the Servers workspace.
              </Typography>
            )}
          </Stack>
        )}

        {data?.topology === 'multi_server' && (
          <Stack spacing={1}>
            <Autocomplete
              multiple
              options={multiServerOptionsMerged}
              loading={multiServerLoading}
              value={serversValue}
              inputValue={multiServerSearch}
              onInputChange={(_, v, reason) => {
                if (reason === 'input') setMultiServerSearch(v);
              }}
              onChange={(_, vals) => {
                const selected = (vals || []) as ServerOption[];
                update({ servers: selected });
              }}
              filterSelectedOptions
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              getOptionLabel={(opt) => (opt.is_cluster ? `Cluster: ${opt.name}` : opt.name)}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {option.is_cluster ? 'Cluster: ' : ''}
                      {option.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      {option.environment?.toUpperCase()} · {option.kind}
                      {option.is_cluster ? ' · cluster' : ''}
                      {' · '}
                      {option.provider}
                    </div>
                  </div>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Connected servers"
                  placeholder="Search and select servers"
                  InputLabelProps={{ shrink: true }}
                  helperText="Select at least two servers."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {multiServerLoading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              fullWidth
            />
            {multiHasCluster && (
              <Typography variant="caption" color="text.secondary">
                One or more selected endpoints are clusters. Their member hosts are managed in the Servers workspace.
              </Typography>
            )}
          </Stack>
        )}
      </Stack>

      <Stack spacing={2}>
        <Autocomplete
          multiple
          options={protocolOptions}
          value={protocolOptions.filter((o) => (data?.protocol_codes || []).includes(o.value))}
          onChange={(_, vals) => update({ protocol_codes: (vals || []).map((v) => v.value) })}
          isOptionEqualToValue={(opt, val) => opt.value === val.value}
          getOptionLabel={(opt) => opt.label}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Protocols"
              placeholder="Select protocols (from Connection Types)"
              InputLabelProps={{ shrink: true }}
              required
            />
          )}
          fullWidth
        />
        {data?.protocol_codes && data.protocol_codes.length > 0 && (
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">Typical ports</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {data.protocol_codes
                .map((code) => ({ code, ports: protocolPortMap.get(code) || '' }))
                .map(({ code, ports }) => (
                  <Chip key={code} label={`${code}${ports ? `: ${ports}` : ''}`} />
                ))}
            </Stack>
          </Stack>
        )}
        <EnumAutocomplete
          label="Lifecycle"
          value={data?.lifecycle || 'active'}
          onChange={(v) => update({ lifecycle: v })}
          options={lifecycleOptions as any}
        />
        <TextField
          label="Notes"
          value={data?.notes || ''}
          onChange={(e) => update({ notes: e.target.value })}
          multiline
          minRows={3}
          InputLabelProps={{ shrink: true }}
        />
      </Stack>
    </Stack>
  );
}
