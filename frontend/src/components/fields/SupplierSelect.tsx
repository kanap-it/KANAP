import React from 'react';
import { useTranslation } from 'react-i18next';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { drawerAutocompleteListboxSx } from '../../theme/formSx';

type Supplier = {
  id: string;
  name: string;
  erp_supplier_id: string | null;
  status: string;
};

type SupplierSelectProps = {
  label?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
};

function assignRef<T>(target: React.Ref<T | null> | undefined, value: T | null) {
  if (!target) return;
  if (typeof target === 'function') {
    target(value);
  } else {
    (target as React.MutableRefObject<T | null>).current = value;
  }
}

const SupplierSelect = React.forwardRef<HTMLInputElement, SupplierSelectProps>(function SupplierSelect(
  {
    label = 'Supplier',
    value,
    onChange,
    disabled,
    error,
    helperText,
    required = false,
    hideLabel = false,
    textFieldSx,
  },
  ref,
) {
  const { t } = useTranslation(['master-data', 'common']);
  const { data: suppliers, isLoading } = useQuery({
    queryKey: ['suppliers', 'active'],
    queryFn: async () => {
      const res = await api.get<{ items: Supplier[] }>('/suppliers', { 
        params: { limit: 1000 } 
      });
      return res.data.items;
    },
  });

  const sortedSuppliers = React.useMemo(() => {
    const list = suppliers ? [...suppliers] : [];
    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [suppliers]);

  // If the currently selected supplier is not in the active list (e.g., disabled or beyond page limit),
  // fetch it explicitly so it can still be displayed.
  const needSelectedFetch = !!value && !sortedSuppliers.some((s) => s.id === value);
  const { data: selectedFromId, isLoading: isLoadingSelected } = useQuery({
    queryKey: ['suppliers', 'by-id', value],
    enabled: needSelectedFetch,
    queryFn: async () => {
      const res = await api.get<Supplier>(`/suppliers/${value}`);
      return res.data as unknown as Supplier;
    },
  });

  const mergedOptions = React.useMemo(() => {
    const base = [...sortedSuppliers];
    if (selectedFromId && !base.some((s) => s.id === selectedFromId.id)) base.unshift(selectedFromId);
    return base;
  }, [sortedSuppliers, selectedFromId]);

  const selectedSupplier = mergedOptions.find((supplier: Supplier) => supplier.id === value) || null;

  return (
    <Autocomplete
      options={mergedOptions}
      value={selectedSupplier}
      onChange={(_, newValue) => onChange(newValue?.id || null)}
      getOptionLabel={(option) => option.name}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <div>
            <div className="kanap-autocomplete-option-primary">
              {option.name}
            </div>
            {option.erp_supplier_id && (
              <div className="kanap-autocomplete-option-secondary">
                ERP ID: {option.erp_supplier_id}
              </div>
            )}
            {option.status && option.status.toLowerCase() === 'disabled' && (
              <div className="kanap-autocomplete-option-secondary">(disabled)</div>
            )}
          </div>
        </li>
      )}
      ListboxProps={hideLabel ? { sx: drawerAutocompleteListboxSx } : undefined}
      renderInput={(params) => (
        <TextField
          {...params}
          label={hideLabel ? undefined : label}
          required={required}
          variant={hideLabel ? 'standard' : undefined}
          sx={textFieldSx}
          inputRef={(node) => {
            assignRef((params.inputProps as any)?.ref, node);
            assignRef(ref, node ?? null);
          }}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            ...(hideLabel ? { disableUnderline: true } : {}),
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
      filterOptions={(options, { inputValue }) => {
        const searchTerm = inputValue.toLowerCase();
        return options.filter(option => 
          option.name.toLowerCase().includes(searchTerm) ||
          (option.erp_supplier_id && option.erp_supplier_id.toLowerCase().includes(searchTerm))
        );
      }}
      noOptionsText={isLoading ? t('common:status.loading') : t('master-data:suppliers.noSuppliersFound')}
      fullWidth
    />
  );
});

export default SupplierSelect;
