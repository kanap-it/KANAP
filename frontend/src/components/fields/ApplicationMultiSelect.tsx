import React from 'react';
import { Autocomplete, Box, Chip, CircularProgress, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { FieldLabel, mergeSx } from '../design';
import { drawerAutocompleteListboxSx, nakedControlHoverSx, nakedFieldPlaceholderSx } from '../../theme/formSx';

type ApplicationOption = {
  id: string;
  name: string;
  lifecycle?: string | null;
  criticality?: string | null;
};

type ApplicationMultiSelectProps = {
  label?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: 'small' | 'medium';
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
};

export default function ApplicationMultiSelect({
  label: labelProp,
  value,
  onChange,
  disabled,
  placeholder,
  size,
  hideLabel = false,
  textFieldSx,
}: ApplicationMultiSelectProps) {
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.applications', { defaultValue: 'Applications' });
  const naked = hideLabel || label === '';
  const ids = Array.isArray(value) ? value : [];

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['applications', 'multi-select'],
    queryFn: async () => {
      const res = await api.get<{ items: ApplicationOption[] }>('/applications', {
        params: { limit: 500, sort: 'name:ASC' },
      });
      return res.data.items || [];
    },
  });

  const missingIds = ids.filter((id) => !applications.some((app) => app.id === id));
  const { data: missingApplications = [], isLoading: isLoadingMissing } = useQuery({
    queryKey: ['applications', 'multi-select', 'missing', missingIds],
    enabled: missingIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        missingIds.map((id) => api.get<ApplicationOption>(`/applications/${id}`).then((res) => res.data).catch(() => null)),
      );
      return results.filter((item): item is ApplicationOption => !!item);
    },
  });

  const options = React.useMemo(() => {
    const merged = [...applications];
    for (const app of missingApplications) {
      if (!merged.some((item) => item.id === app.id)) merged.push(app);
    }
    return merged.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }));
  }, [applications, missingApplications]);

  const selected = options.filter((option) => ids.includes(option.id));
  const loading = isLoading || isLoadingMissing;

  const control = (
    <Autocomplete
      multiple
      options={options}
      value={selected}
      onChange={(_, next) => onChange(Array.from(new Set(next.map((item) => item.id))))}
      getOptionLabel={(option) => option.name || option.id}
      ListboxProps={naked ? { sx: drawerAutocompleteListboxSx } : undefined}
      size={size}
      disabled={disabled || loading}
      loading={loading}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {option.name || option.id}
        </li>
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip {...getTagProps({ index })} key={option.id} label={option.name || option.id} size="small" />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          sx={naked ? mergeSx(nakedControlHoverSx, nakedFieldPlaceholderSx, textFieldSx) : textFieldSx}
          placeholder={placeholder ?? (naked && selected.length === 0 ? t('selects.notSet') : undefined)}
          size={size}
          InputProps={{
            ...params.InputProps,
            ...(naked ? { disableUnderline: true } : {}),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText={loading ? t('selects.loadingEllipsis') : t('selects.noApplicationsFound')}
      fullWidth
    />
  );

  if (naked || !label) return control;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
      <FieldLabel>{label}</FieldLabel>
      {control}
    </Box>
  );
}
