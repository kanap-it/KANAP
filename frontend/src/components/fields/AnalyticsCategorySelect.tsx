import React from 'react';
import { Autocomplete, Box, CircularProgress, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

type AnalyticsCategory = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
};

type Props = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  label?: string;
  helperText?: React.ReactNode;
  error?: boolean;
  disabled?: boolean;
};

export default function AnalyticsCategorySelect({ value, onChange, label = 'Analytics Category', helperText, error, disabled }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-categories', 'all'],
    queryFn: async () => {
      const res = await api.get<{ items: AnalyticsCategory[] }>('/analytics-categories', {
        params: { limit: 1000, sort: 'name:ASC' },
      });
      return res.data.items;
    },
  });

  const options = React.useMemo(() => {
    const list = data ? [...data] : [];
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Ensure selected category appears even if not in the preloaded list (disabled or off-page)
  const needSelectedFetch = !!value && !options.some((c) => c.id === value);
  const { data: selectedById, isLoading: isLoadingSelected } = useQuery({
    queryKey: ['analytics-categories', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      const res = await api.get<AnalyticsCategory>(`/analytics-categories/${value}`);
      return res.data as unknown as AnalyticsCategory;
    },
  });

  const mergedOptions = React.useMemo(() => {
    const base = [...options];
    if (selectedById && !base.some((c) => c.id === selectedById.id)) base.unshift(selectedById);
    return base;
  }, [options, selectedById]);

  const selected = React.useMemo(() => mergedOptions.find((cat) => cat.id === value) ?? null, [mergedOptions, value]);

  return (
    <Autocomplete
      options={mergedOptions}
      value={selected}
      onChange={(_, newValue) => onChange(newValue?.id ?? null)}
      getOptionLabel={(option) => option.name}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box>
            <Box sx={{ fontWeight: 500 }}>{option.name}</Box>
            {option.description && (
              <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                {option.description}
              </Box>
            )}
            {option.status === 'disabled' && (
              <Box sx={{ fontSize: '0.75rem', color: 'warning.main' }}>
                Disabled
              </Box>
            )}
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {(isLoading || isLoadingSelected) ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      disabled={disabled || isLoading}
      loading={isLoading || isLoadingSelected}
      clearOnBlur
      clearOnEscape
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      noOptionsText={isLoading ? 'Loading…' : 'No analytics categories found'}
      fullWidth
    />
  );
}
