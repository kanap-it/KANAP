import React from 'react';
import {
  Autocomplete,
  Stack,
  TextField,
} from '@mui/material';
import EnumAutocomplete from '../../../../components/fields/EnumAutocomplete';
import ApplicationSelect from '../../../../components/fields/ApplicationSelect';
import BusinessProcessSelect from '../../../../components/fields/BusinessProcessSelect';
import useItOpsEnumOptions from '../../../../hooks/useItOpsEnumOptions';
import { useQuery } from '@tanstack/react-query';
import api from '../../../../api';
import type { InterfaceDetail, ApplicationOption } from './types';

interface OverviewTabProps {
  data: InterfaceDetail | null;
  update: (patch: Partial<InterfaceDetail>) => void;
  markDirty: () => void;
  isCreate: boolean;
}

export default function OverviewTab({ data, update, markDirty, isCreate }: OverviewTabProps) {
  const { byField } = useItOpsEnumOptions();

  const { data: etlAppsData, isLoading: loadingEtlApps } = useQuery({
    queryKey: ['applications', 'select', 'etl-middleware'],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 500, sort: 'name:ASC' };
      params.filters = JSON.stringify({ etl_enabled: { type: 'equals', filter: true } });
      const res = await api.get<{ items: ApplicationOption[] }>('/applications', { params });
      return res.data.items || [];
    },
  });

  const etlApps = React.useMemo(() => (etlAppsData || []) as ApplicationOption[], [etlAppsData]);

  const dataClassOptions = React.useMemo(() => {
    const list = byField.dataClass || [];
    const base = list.filter((o) => !o.deprecated).map((o) => ({ label: o.label, value: o.code }));
    const current = data?.data_class || 'internal';
    const hasCurrent = list.some((o) => o.code === current);
    if (!hasCurrent && current) {
      return [...base, { label: current, value: current }];
    }
    return base;
  }, [byField.dataClass, data?.data_class]);

  const dataCategoryOptions = React.useMemo(() => {
    const list = byField.interfaceDataCategory || [];
    const base = list.filter((o) => !o.deprecated).map((o) => ({ label: o.label, value: o.code }));
    const current = data?.data_category || '';
    const hasCurrent = list.some((o) => o.code === current);
    if (!hasCurrent && current) {
      return [...base, { label: current, value: current }];
    }
    return base;
  }, [byField.interfaceDataCategory, data?.data_category]);

  const LIFECYCLE_OPTIONS = React.useMemo(() => {
    const list = byField.lifecycleStatus || [];
    const current = data?.lifecycle;
    const opts = list.map((item) => ({
      label: item.deprecated ? `${item.label} (deprecated)` : item.label,
      value: item.code,
      deprecated: !!item.deprecated,
    }));
    if (current && !opts.some((opt) => opt.value === current)) {
      opts.push({ label: current, value: current, deprecated: false });
    }
    return opts.filter((opt) => !opt.deprecated || opt.value === current);
  }, [byField.lifecycleStatus, data?.lifecycle]);

  const ROUTE_OPTIONS = React.useMemo(
    () => [
      { label: 'Direct', value: 'direct' },
      { label: 'Via middleware', value: 'via_middleware' },
    ] as const,
    [],
  );

  const handleUpdate = (patch: Partial<InterfaceDetail>) => {
    markDirty();
    update(patch);
  };

  return (
    <Stack spacing={2} maxWidth={720}>
      <TextField
        label="Interface ID"
        value={data?.interface_id || ''}
        onChange={(e) => handleUpdate({ interface_id: e.target.value })}
        required
      />
      <TextField
        label="Name"
        value={data?.name || ''}
        onChange={(e) => handleUpdate({ name: e.target.value })}
        required
      />
      <BusinessProcessSelect
        label="Business process"
        value={data?.business_process_id || null}
        onChange={(v) => handleUpdate({ business_process_id: v || null })}
      />
      <TextField
        label="Business purpose"
        value={data?.business_purpose || ''}
        onChange={(e) => handleUpdate({ business_purpose: e.target.value })}
        multiline
        minRows={3}
        required
      />
      <ApplicationSelect
        label="Source application"
        value={data?.source_application_id || null}
        onChange={(v) => handleUpdate({ source_application_id: v || '' })}
        required
      />
      <ApplicationSelect
        label="Target application"
        value={data?.target_application_id || null}
        onChange={(v) => handleUpdate({ target_application_id: v || '' })}
        required
      />
      <EnumAutocomplete
        label="Data category"
        value={data?.data_category || ''}
        onChange={(v) => handleUpdate({ data_category: v })}
        options={dataCategoryOptions as any}
        required
      />
      <EnumAutocomplete
        label="Integration route type"
        value={data?.integration_route_type || 'direct'}
        onChange={(v) => handleUpdate({ integration_route_type: v as any })}
        options={ROUTE_OPTIONS as any}
      />
      {data?.integration_route_type === 'via_middleware' && (
        <Autocomplete
          multiple
          options={etlApps}
          value={etlApps.filter((app) =>
            (data?.middleware_application_ids || []).includes(app.id),
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Middleware applications"
            />
          )}
          getOptionLabel={(option) => option.name}
          onChange={(_, value) => {
            const ids = (value || []).map((v) => v.id);
            handleUpdate({ middleware_application_ids: ids as any });
          }}
          loading={loadingEtlApps}
        />
      )}
      <EnumAutocomplete
        label="Lifecycle"
        value={data?.lifecycle || 'proposed'}
        onChange={(v) => handleUpdate({ lifecycle: v })}
        options={LIFECYCLE_OPTIONS as any}
      />
      <TextField
        label="Overview notes"
        value={data?.overview_notes || ''}
        onChange={(e) => handleUpdate({ overview_notes: e.target.value })}
        multiline
        minRows={2}
        helperText="Short summary or key context for this interface."
      />
    </Stack>
  );
}
