import React from 'react';
import { useTranslation } from 'react-i18next';
import { TextField, CircularProgress, Autocomplete, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

type Department = { id: string; name: string; company_id?: string | null };

type DepartmentSelectProps = {
  label?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  companyId?: string | null;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  size?: 'small' | 'medium';
  year?: number;
};

function assignRef<T>(target: React.Ref<T | null> | undefined, value: T | null) {
  if (!target) return;
  if (typeof target === 'function') {
    target(value);
  } else {
    (target as React.MutableRefObject<T | null>).current = value;
  }
}

const DepartmentSelect = React.forwardRef<HTMLInputElement, DepartmentSelectProps>(function DepartmentSelect(
  {
    label = 'Department',
    value,
    onChange,
    companyId,
    disabled,
    error,
    helperText,
    required,
    size = 'medium',
    year,
  },
  ref,
) {
  const { t } = useTranslation(['master-data']);
  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments', 'active', companyId, year],
    queryFn: async () => {
      if (!companyId) return [];
      const params: Record<string, any> = { limit: 1000 };
      if (year) params.year = year;
      params.filters = JSON.stringify({ company_id: { type: 'equals', filter: companyId } });
      const res = await api.get<{ items: Department[] }>('/departments', { params });
      const items = res.data.items || [];
      return items.filter((dept) => !dept.company_id || dept.company_id === companyId);
    },
    enabled: !!companyId,
  });

  // Ensure the currently selected department is visible even if filtered out or off-page
  const needSelectedFetch = !!value && !(departments || []).some((d) => d.id === value);
  const { data: selectedById, isLoading: isLoadingSelected } = useQuery({
    queryKey: ['departments', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      const res = await api.get<Department>(`/departments/${value}`);
      return res.data as unknown as Department;
    },
  });

  const sorted = React.useMemo(() => {
    const base = departments ? [...departments] : [];
    if (selectedById && !base.some((d) => d.id === selectedById.id)) base.unshift(selectedById);
    return base.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [departments, selectedById]);

  const isDisabled = disabled || !companyId || isLoading;
  const selected = sorted.find((d) => d.id === value) || null;

  return (
    <Box sx={{ position: 'relative' }}>
      <Autocomplete
        options={sorted}
        value={selected}
        onChange={(_, v) => onChange(v?.id || null)}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            inputRef={(node) => {
              assignRef((params.inputProps as any)?.ref, node);
              assignRef(ref, node ?? null);
            }}
            error={error}
            helperText={companyId ? helperText : undefined}
            required={required}
            size={size}
            placeholder={!companyId ? t('departments.selectCompanyFirst') : undefined}
            InputLabelProps={{ shrink: true }}
            InputProps={{
              ...params.InputProps,
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
        disabled={isDisabled}
        loading={isLoading || isLoadingSelected}
        size={size}
        fullWidth
      />
    </Box>
  );
});

export default DepartmentSelect;
