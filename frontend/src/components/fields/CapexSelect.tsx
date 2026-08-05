import React from 'react';
import { Autocomplete, TextField, CircularProgress, Chip, Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { useLocale } from '../../i18n/useLocale';
import { FieldLabel, mergeSx } from '../design';
import { drawerAutocompleteListboxSx, nakedControlHoverSx, nakedFieldPlaceholderSx } from '../../theme/formSx';

type CapexItem = {
  id: string;
  description: string;
  ppe_type: string;
  investment_type: string;
  priority: string;
  supplier_name?: string | null;
  total_amount?: number | null;
  status: string;
};

type CapexSelectProps = {
  label?: string;
  value: string[] | null | undefined;
  onChange: (v: string[]) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
};

const CapexSelect = React.forwardRef<HTMLInputElement, CapexSelectProps>(function CapexSelect(
  {
    label = 'CAPEX Items',
    value,
    onChange,
    disabled,
    error,
    helperText,
    hideLabel = false,
    textFieldSx,
  },
  ref,
) {
  const { t } = useTranslation(['ops', 'common']);
  const naked = hideLabel || label === '';
  const locale = useLocale();
  const { data: items, isLoading } = useQuery({
    queryKey: ['capex-items', 'list'],
    queryFn: async () => {
      const res = await api.get<{ items: CapexItem[] }>('/capex', {
        params: { limit: 500 }
      });
      return res.data.items || [];
    },
  });

  const sortedItems = React.useMemo(() => {
    const list = items ? [...items] : [];
    return list.sort((a, b) => a.description.localeCompare(b.description, undefined, { sensitivity: 'base' }));
  }, [items]);

  const selectedItems = React.useMemo(() => {
    if (!value || value.length === 0) return [];
    return sortedItems.filter((item) => value.includes(item.id));
  }, [sortedItems, value]);

  const control = (
    <Autocomplete
      multiple
      options={sortedItems}
      value={selectedItems}
      onChange={(_, newValue) => onChange(newValue.map((v) => v.id))}
      getOptionLabel={(option) => option.description}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box>
            <Box sx={{ fontWeight: 500 }}>{option.description}</Box>
            {option.supplier_name && (
              <Box sx={{ fontSize: '0.875rem', opacity: 0.7 }}>
                Supplier: {option.supplier_name}
              </Box>
            )}
            {option.total_amount != null && (
              <Box sx={{ fontSize: '0.875rem', opacity: 0.7 }}>
                Amount: {option.total_amount.toLocaleString(locale)}
              </Box>
            )}
          </Box>
        </li>
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            {...getTagProps({ index })}
            key={option.id}
            label={option.description}
            size="small"
          />
        ))
      }
      ListboxProps={naked ? { sx: drawerAutocompleteListboxSx } : undefined}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          sx={naked ? mergeSx(nakedControlHoverSx, nakedFieldPlaceholderSx, textFieldSx) : textFieldSx}
          inputRef={ref}
          placeholder={naked && selectedItems.length === 0 ? t('common:selects.notSet') : undefined}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            ...(naked ? { disableUnderline: true } : {}),
            endAdornment: (
              <>
                {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      disabled={disabled || isLoading}
      loading={isLoading}
      filterOptions={(options, { inputValue }) => {
        const searchTerm = inputValue.toLowerCase();
        return options.filter(option =>
          option.description.toLowerCase().includes(searchTerm) ||
          (option.supplier_name && option.supplier_name.toLowerCase().includes(searchTerm))
        );
      }}
      noOptionsText={isLoading ? t('common:status.loading') : t('shared.noCapexItemsFound')}
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
});

export default CapexSelect;
