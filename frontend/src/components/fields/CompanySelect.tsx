import React from 'react';
import { TextField, CircularProgress, Autocomplete, Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { drawerAutocompleteListboxSx } from '../../theme/formSx';

type Company = { id: string; name: string };

export default function CompanySelect({
  label = 'Company',
  value,
  onChange,
  disabled,
  error,
  helperText,
  required,
  size = 'medium',
  excludeCompanyIds,
  hideLabel = false,
  textFieldSx,
}: {
  label?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  size?: 'small' | 'medium';
  excludeCompanyIds?: string[];
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
}) {
  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies', 'active'],
    queryFn: async () => {
      const res = await api.get<{ items: Company[] }>('/companies', { 
        params: { limit: 1000 } 
      });
      return res.data.items;
    },
  });

  const sorted = React.useMemo(() => {
    const list = companies ? [...companies] : [];
    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [companies]);

  // Ensure currently selected company is present even if not in list (disabled or off-page)
  const needSelectedFetch = !!value && !sorted.some((c) => c.id === value);
  const { data: selectedById, isLoading: isLoadingSelected } = useQuery({
    queryKey: ['companies', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      const res = await api.get<Company>(`/companies/${value}`);
      return res.data as unknown as Company;
    },
  });

  const mergedOptions = React.useMemo(() => {
    const base = [...sorted];
    if (selectedById && !base.some((c) => c.id === selectedById.id)) base.unshift(selectedById);
    return base;
  }, [sorted, selectedById]);

  const filteredOptions = React.useMemo(() => {
    if (!excludeCompanyIds || excludeCompanyIds.length === 0) return mergedOptions;
    const exclude = new Set(excludeCompanyIds);
    // Keep the currently selected company visible even if excluded
    return mergedOptions.filter((c) => !exclude.has(c.id) || (value ? c.id === value : false));
  }, [excludeCompanyIds, mergedOptions, value]);

  const selected = mergedOptions.find((c) => c.id === value) || null;

  return (
    <Box sx={{ position: 'relative' }}>
      <Autocomplete
        options={filteredOptions}
        value={selected}
        onChange={(_, v) => onChange(v?.id || null)}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label={hideLabel ? undefined : label}
            placeholder={hideLabel ? label : undefined}
            error={error}
            helperText={helperText}
            required={required}
            size={size}
            variant={hideLabel ? 'standard' : undefined}
            sx={textFieldSx}
            InputLabelProps={hideLabel ? undefined : { shrink: true }}
            InputProps={{
              ...params.InputProps,
              ...(hideLabel ? { disableUnderline: true } : {}),
              endAdornment: (
                <>
                  {(isLoading || isLoadingSelected) ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        filterOptions={(opts, { inputValue }) => {
          const s = inputValue.toLowerCase();
          return opts.filter((o) => o.name.toLowerCase().includes(s));
        }}
        disabled={disabled || isLoading}
        loading={isLoading || isLoadingSelected}
        ListboxProps={hideLabel ? { sx: drawerAutocompleteListboxSx } : undefined}
        size={size}
        fullWidth
      />
    </Box>
  );
}
