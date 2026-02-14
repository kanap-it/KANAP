import React from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';

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
  },
  ref,
) {
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
            <div style={{ fontWeight: 500 }}>
              {option.name}
            </div>
            {option.erp_supplier_id && (
              <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                ERP ID: {option.erp_supplier_id}
              </div>
            )}
            {option.status && option.status.toLowerCase() === 'disabled' && (
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>(disabled)</div>
            )}
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          inputRef={(node) => {
            assignRef((params.inputProps as any)?.ref, node);
            assignRef(ref, node ?? null);
          }}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
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
      noOptionsText={isLoading ? "Loading..." : "No suppliers found"}
      fullWidth
    />
  );
});

export default SupplierSelect;
