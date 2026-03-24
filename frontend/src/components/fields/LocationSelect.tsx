import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Autocomplete, Box, CircularProgress, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../../api';

type LocationOption = { id: string; code: string; name: string };

type Props = {
  label?: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  size?: 'small' | 'medium';
};

export default function LocationSelect({
  label: labelProp,
  value,
  onChange,
  disabled,
  error,
  helperText,
  required,
  size = 'medium',
}: Props) {
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.location');
  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', 'options'],
    queryFn: async () => {
      const res = await api.get<{ items: LocationOption[] }>('/locations', {
        params: { limit: 200, sort: 'code:ASC' },
      });
      return (res.data?.items || []) as LocationOption[];
    },
  });

  const sorted = React.useMemo(() => {
    const list = locations ? [...locations] : [];
    return list.sort((a, b) => a.code.localeCompare(b.code, undefined, { sensitivity: 'base' }));
  }, [locations]);

  const needSelectedFetch = !!value && !sorted.some((loc) => loc.id === value);
  const { data: selectedById, isLoading: loadingSelected } = useQuery({
    queryKey: ['locations', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      if (!value) return null;
      const res = await api.get(`/locations/${value}`);
      const loc = res.data as any;
      return { id: loc.id, code: loc.code, name: loc.name } as LocationOption;
    },
  });

  const options = React.useMemo(() => {
    const list = [...sorted];
    if (selectedById && !list.some((loc) => loc.id === selectedById.id)) {
      list.unshift(selectedById);
    }
    return list;
  }, [sorted, selectedById]);

  const selectedOption = options.find((opt) => opt.id === value) || null;

  return (
    <Box sx={{ position: 'relative' }}>
      <Autocomplete
        options={options}
        value={selectedOption}
        onChange={(_, option) => onChange(option?.id ?? null)}
        getOptionLabel={(opt) => opt?.code || ''}
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2">{option.code}</Typography>
              {option.name && (
                <Typography variant="caption" color="text.secondary">
                  {option.name}
                </Typography>
              )}
            </Box>
          </li>
        )}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        disabled={disabled}
        loading={isLoading || loadingSelected}
        filterOptions={(opts, { inputValue }) => {
          const s = inputValue.toLowerCase();
          return opts.filter(
            (opt) =>
              opt.code.toLowerCase().includes(s) ||
              opt.name.toLowerCase().includes(s),
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            size={size}
            error={error}
            helperText={helperText}
            required={required}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {(isLoading || loadingSelected) && <CircularProgress size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        fullWidth
      />
    </Box>
  );
}
