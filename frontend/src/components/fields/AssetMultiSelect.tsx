import React from 'react';
import { Autocomplete, Chip, CircularProgress, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';

type AssetOption = {
  id: string;
  name: string;
  asset_reference?: string | null;
  hostname?: string | null;
  environment?: string | null;
  kind?: string | null;
  provider?: string | null;
};

type AssetMultiSelectProps = {
  label?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: 'small' | 'medium';
};

function assetLabel(asset: AssetOption): string {
  return asset.name || asset.hostname || asset.id;
}

export default function AssetMultiSelect({
  label: labelProp,
  value,
  onChange,
  disabled,
  placeholder,
  size,
}: AssetMultiSelectProps) {
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.assets', { defaultValue: 'Assets' });
  const ids = Array.isArray(value) ? value : [];

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', 'multi-select'],
    queryFn: async () => {
      const res = await api.get<{ items: AssetOption[] }>('/assets', {
        params: { limit: 500, sort: 'name:ASC' },
      });
      return res.data.items || [];
    },
  });

  const missingIds = ids.filter((id) => !assets.some((asset) => asset.id === id));
  const { data: missingAssets = [], isLoading: isLoadingMissing } = useQuery({
    queryKey: ['assets', 'multi-select', 'missing', missingIds],
    enabled: missingIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        missingIds.map((id) => api.get<AssetOption>(`/assets/${id}`).then((res) => res.data).catch(() => null)),
      );
      return results.filter((item): item is AssetOption => !!item);
    },
  });

  const options = React.useMemo(() => {
    const merged = [...assets];
    for (const asset of missingAssets) {
      if (!merged.some((item) => item.id === asset.id)) merged.push(asset);
    }
    return merged.sort((a, b) => assetLabel(a).localeCompare(assetLabel(b), undefined, { sensitivity: 'base' }));
  }, [assets, missingAssets]);

  const selected = options.filter((option) => ids.includes(option.id));
  const loading = isLoading || isLoadingMissing;

  return (
    <Autocomplete
      multiple
      options={options}
      value={selected}
      onChange={(_, next) => onChange(Array.from(new Set(next.map((item) => item.id))))}
      getOptionLabel={assetLabel}
      size={size}
      disabled={disabled || loading}
      loading={loading}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {assetLabel(option)}
        </li>
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip {...getTagProps({ index })} key={option.id} label={assetLabel(option)} size="small" />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText={loading ? t('selects.loadingEllipsis') : t('selects.noServersFound')}
      fullWidth
    />
  );
}
