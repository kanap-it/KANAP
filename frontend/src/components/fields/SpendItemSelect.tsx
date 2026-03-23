import React from 'react';
import { Autocomplete, TextField, CircularProgress, Chip, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

type SpendItem = {
  id: string;
  product_name: string;
  description: string | null;
  supplier_name: string | null;
  amount?: number | null;
};

type SpendItemSelectProps = {
  label?: string;
  value: string[] | null | undefined;
  onChange: (v: string[]) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
};

const SpendItemSelect = React.forwardRef<HTMLInputElement, SpendItemSelectProps>(function SpendItemSelect(
  {
    label = 'OPEX Items',
    value,
    onChange,
    disabled,
    error,
    helperText,
  },
  ref,
) {
  const { t } = useTranslation(['ops']);
  const { data: items, isLoading } = useQuery({
    queryKey: ['spend-items', 'list'],
    queryFn: async () => {
      const res = await api.get<{ items: SpendItem[] }>('/spend', {
        params: { limit: 500 }
      });
      return res.data.items || [];
    },
  });

  const sortedItems = React.useMemo(() => {
    const list = items ? [...items] : [];
    return list.sort((a, b) =>
      a.product_name.localeCompare(b.product_name, undefined, { sensitivity: 'base' })
    );
  }, [items]);

  const selectedItems = React.useMemo(() => {
    if (!value || value.length === 0) return [];
    return sortedItems.filter((item) => value.includes(item.id));
  }, [sortedItems, value]);

  const getLabel = (item: SpendItem) => {
    if (item.supplier_name) {
      return `${item.product_name} (${item.supplier_name})`;
    }
    return item.product_name;
  };

  return (
    <Autocomplete
      multiple
      options={sortedItems}
      value={selectedItems}
      onChange={(_, newValue) => onChange(newValue.map((v) => v.id))}
      getOptionLabel={getLabel}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box>
            <Box sx={{ fontWeight: 500 }}>{option.product_name}</Box>
            {option.description && (
              <Box sx={{ fontSize: '0.875rem', opacity: 0.7 }}>
                {option.description}
              </Box>
            )}
            {option.supplier_name && (
              <Box sx={{ fontSize: '0.875rem', opacity: 0.7 }}>
                Supplier: {option.supplier_name}
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
            label={option.product_name}
            size="small"
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          inputRef={ref}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
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
          option.product_name.toLowerCase().includes(searchTerm) ||
          (option.description && option.description.toLowerCase().includes(searchTerm)) ||
          (option.supplier_name && option.supplier_name.toLowerCase().includes(searchTerm))
        );
      }}
      noOptionsText={isLoading ? t('common:status.loading') : t('shared.noSpendItemsFound')}
      fullWidth
    />
  );
});

export default SpendItemSelect;
