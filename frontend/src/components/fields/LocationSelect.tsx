import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Autocomplete, Box, CircularProgress, TextField, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import api from '../../api';
import { MONO_FONT_FAMILY } from '../../config/ThemeContext';
import { FieldLabel, mergeSx } from '../design';
import { drawerAutocompleteListboxSx, nakedControlHoverSx, nakedFieldPlaceholderSx } from '../../theme/formSx';

type LocationOption = { id: string; location_reference: string; name: string };

type Props = {
  label?: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  hideLabel?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: 'small' | 'medium';
  textFieldSx?: SxProps<Theme>;
};

export default function LocationSelect({
  label: labelProp,
  value,
  onChange,
  disabled,
  error,
  helperText,
  hideLabel,
  required,
  placeholder,
  size = 'medium',
  textFieldSx,
}: Props) {
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.location');
  const naked = hideLabel || label === '';
  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations', 'options'],
    queryFn: async () => {
      const res = await api.get<{ items: LocationOption[] }>('/locations', {
        params: { limit: 200, sort: 'location_reference:ASC' },
      });
      return (res.data?.items || []) as LocationOption[];
    },
  });

  const sorted = React.useMemo(() => {
    const list = locations ? [...locations] : [];
    return list.sort((a, b) => a.location_reference.localeCompare(
      b.location_reference,
      undefined,
      { sensitivity: 'base', numeric: true },
    ));
  }, [locations]);

  const needSelectedFetch = !!value && !sorted.some((loc) => loc.id === value);
  const { data: selectedById, isLoading: loadingSelected } = useQuery({
    queryKey: ['locations', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      if (!value) return null;
      const res = await api.get(`/locations/${value}`);
      const loc = res.data as any;
      return { id: loc.id, location_reference: loc.location_reference, name: loc.name } as LocationOption;
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

  const control = (
    <Box sx={{ position: 'relative' }}>
      <Autocomplete
        options={options}
        value={selectedOption}
        onChange={(_, option) => onChange(option?.id ?? null)}
        getOptionLabel={(opt) =>
          opt ? `${opt.location_reference}${opt.name ? ` · ${opt.name}` : ''}` : ''
        }
        renderOption={(props, option) => (
          <li {...props} key={option.id}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                <Typography
                  variant="caption"
                  sx={{ fontFamily: MONO_FONT_FAMILY, color: 'kanap.text.secondary' }}
                >
                  {option.location_reference}
                </Typography>
                {option.name && (
                  <Typography variant="body2">{option.name}</Typography>
                )}
              </Box>
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
              opt.location_reference.toLowerCase().includes(s) ||
              opt.name.toLowerCase().includes(s),
          );
        }}
        ListboxProps={naked ? { sx: drawerAutocompleteListboxSx } : undefined}
        renderInput={(params) => (
          <TextField
            {...params}
            size={size}
            error={error}
            helperText={helperText}
            required={required}
            variant="standard"
            placeholder={placeholder ?? (naked ? t('selects.notSet') : undefined)}
            InputProps={{
              ...params.InputProps,
              ...(naked ? { disableUnderline: true } : {}),
              endAdornment: (
                <>
                  {(isLoading || loadingSelected) && <CircularProgress size={18} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={naked ? mergeSx(nakedControlHoverSx, nakedFieldPlaceholderSx, textFieldSx) : textFieldSx}
          />
        )}
        fullWidth
      />
    </Box>
  );

  if (naked || !label) return control;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {control}
    </Box>
  );
}
