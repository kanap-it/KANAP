import React from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

type ApplicationOption = {
  id: string;
  name: string;
  lifecycle: string;
  criticality: string;
};

type ApplicationSelectProps = {
  label?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  placeholder?: string;
  // When true, only applications with Data Integration / ETL enabled are listed.
  onlyEtl?: boolean;
};

function assignRef<T>(target: React.Ref<T | null> | undefined, value: T | null) {
  if (!target) return;
  if (typeof target === 'function') {
    target(value);
  } else {
    (target as React.MutableRefObject<T | null>).current = value;
  }
}

const ApplicationSelect = React.forwardRef<HTMLInputElement, ApplicationSelectProps>(function ApplicationSelect(
  {
    label = 'Application',
    value,
    onChange,
    disabled,
    helperText,
    required,
    placeholder,
    onlyEtl,
  },
  ref,
) {
  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications', 'select', onlyEtl ? 'etl' : 'all'],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 500, sort: 'name:ASC' };
      if (onlyEtl) {
        params.filters = JSON.stringify({ etl_enabled: { type: 'equals', filter: true } });
      }
      const res = await api.get<{ items: ApplicationOption[] }>('/applications', { params });
      return res.data.items || [];
    },
  });

  const needSelectedFetch = !!value && !(applications || []).some((a) => a.id === value);
  const { data: selected, isLoading: loadingSelected } = useQuery({
    queryKey: ['applications', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      const res = await api.get<ApplicationOption>(`/applications/${value}`);
      return res.data as unknown as ApplicationOption;
    },
  });

  const mergedOptions = React.useMemo(() => {
    const list = applications ? [...applications] : [];
    if (selected && !list.some((app) => app.id === selected.id)) {
      list.unshift(selected);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [applications, selected]);

  const selectedOption = mergedOptions.find((app) => app.id === value) || null;

  return (
    <Autocomplete
      options={mergedOptions}
      value={selectedOption}
      disabled={disabled || isLoading || loadingSelected}
      onChange={(_, newValue) => onChange(newValue?.id || null)}
      getOptionLabel={(option) => option.name}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <div>
            <div style={{ fontWeight: 500 }}>{option.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              {option.lifecycle ? option.lifecycle : '—'} · {option.criticality || '—'}
            </div>
          </div>
        </li>
      )}
      filterOptions={(options, { inputValue }) => {
        const term = inputValue.toLowerCase();
        return options.filter((opt) => opt.name.toLowerCase().includes(term));
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          helperText={helperText}
          inputRef={(node) => {
            assignRef((params.inputProps as any)?.ref, node);
            assignRef(ref, node ?? null);
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {(isLoading || loadingSelected) ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      loading={isLoading || loadingSelected}
      noOptionsText={isLoading ? 'Loading…' : 'No applications found'}
      fullWidth
    />
  );
});

export default ApplicationSelect;
