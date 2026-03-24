import React from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../api';

type BusinessProcessOption = {
  id: string;
  name: string;
};

type BusinessProcessSelectProps = {
  label?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  placeholder?: string;
};

function assignRef<T>(target: React.Ref<T | null> | undefined, value: T | null) {
  if (!target) return;
  if (typeof target === 'function') {
    target(value);
  } else {
    (target as React.MutableRefObject<T | null>).current = value;
  }
}

const BusinessProcessSelect = React.forwardRef<HTMLInputElement, BusinessProcessSelectProps>(function BusinessProcessSelect(
  {
    label: labelProp,
    value,
    onChange,
    disabled,
    helperText,
    required,
    placeholder,
  },
  ref,
) {
  const { t } = useTranslation('common');
  const label = labelProp ?? t('selects.businessProcess');
  const { data: processes, isLoading } = useQuery({
    queryKey: ['business-processes', 'select', 'enabled'],
    queryFn: async () => {
      const res = await api.get<{ items: BusinessProcessOption[] }>('/business-processes', {
        params: {
          page: 1,
          limit: 500,
          sort: 'name:ASC',
          status: 'enabled',
        },
      });
      return res.data.items || [];
    },
  });

  const needSelectedFetch = !!value && !(processes || []).some((p) => p.id === value);
  const { data: selected, isLoading: loadingSelected } = useQuery({
    queryKey: ['business-processes', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      const res = await api.get<BusinessProcessOption>(`/business-processes/${value}`);
      return res.data as unknown as BusinessProcessOption;
    },
  });

  const mergedOptions = React.useMemo(() => {
    const list = processes ? [...processes] : [];
    if (selected && !list.some((p) => p.id === selected.id)) {
      list.unshift(selected);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [processes, selected]);

  const selectedOption = mergedOptions.find((p) => p.id === value) || null;

  return (
    <Autocomplete
      options={mergedOptions}
      value={selectedOption}
      disabled={disabled || isLoading || loadingSelected}
      onChange={(_, newValue) => onChange(newValue?.id || null)}
      getOptionLabel={(option) => option.name}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {option.name}
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
      noOptionsText={isLoading ? t('selects.loadingEllipsis') : t('selects.noBusinessProcessesFound')}
      fullWidth
    />
  );
});

export default BusinessProcessSelect;

