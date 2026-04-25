import React from 'react';
import { useTranslation } from 'react-i18next';
import { Autocomplete, Box, Chip, CircularProgress, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import api from '../../api';
import { drawerAutocompleteListboxSx } from '../../theme/formSx';
import { useQuery } from '@tanstack/react-query';

type Department = { id: string; name: string; company_id?: string | null };

type DepartmentMultiSelectProps = {
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  companyId?: string | null;
  disabled?: boolean;
  size?: 'small' | 'medium';
  year?: number;
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
};

export default function DepartmentMultiSelect({
  label = 'Departments',
  value,
  onChange,
  companyId,
  disabled,
  size = 'medium',
  year,
  hideLabel = false,
  textFieldSx,
}: DepartmentMultiSelectProps) {
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

  const selectedIds = React.useMemo(() => new Set(value || []), [value]);
  const sorted = React.useMemo(() => {
    const base = departments ? [...departments] : [];
    return base.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [departments]);
  const selected = React.useMemo(() => sorted.filter((department) => selectedIds.has(department.id)), [selectedIds, sorted]);
  const isDisabled = disabled || !companyId || isLoading;

  return (
    <Box sx={{ position: 'relative' }}>
      <Autocomplete
        multiple
        options={sorted}
        value={selected}
        onChange={(_, next) => onChange(next.map((department) => department.id))}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterSelectedOptions
        renderTags={(tagValue, getTagProps) => tagValue.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            label={option.name}
            size="small"
            sx={(theme) => ({
              height: 20,
              borderRadius: '3px',
              bgcolor: theme.palette.kanap.pill.bg,
              border: `1px solid ${theme.palette.kanap.pill.border}`,
              color: theme.palette.kanap.text.secondary,
              fontSize: 11,
              '& .MuiChip-label': { px: '6px' },
            })}
          />
        ))}
        renderInput={(params) => (
          <TextField
            {...params}
            label={hideLabel ? undefined : label}
            placeholder={!companyId ? t('departments.selectCompanyFirst') : (selected.length === 0 ? 'All departments' : undefined)}
            size={size}
            variant={hideLabel ? 'standard' : undefined}
            sx={[
              ...(Array.isArray(textFieldSx) ? textFieldSx : [textFieldSx]),
              {
                '& .MuiInput-root:before': { display: 'none !important' },
                '& .MuiInput-root:after': { display: 'none !important' },
                '& .MuiInput-root:hover:not(.Mui-disabled):before': { display: 'none !important' },
              },
            ]}
            InputLabelProps={hideLabel ? undefined : { shrink: true }}
            InputProps={{
              ...params.InputProps,
              ...(hideLabel ? { disableUnderline: true } : {}),
              endAdornment: (
                <>
                  {isLoading ? <CircularProgress size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        filterOptions={(opts, { inputValue }) => {
          const s = inputValue.toLowerCase();
          return opts.filter((option) => option.name.toLowerCase().includes(s));
        }}
        disabled={isDisabled}
        loading={isLoading}
        ListboxProps={hideLabel ? { sx: drawerAutocompleteListboxSx } : undefined}
        size={size}
        fullWidth
      />
    </Box>
  );
}
