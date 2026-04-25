import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { drawerAutocompleteListboxSx } from '../../theme/formSx';

type Option = string | { label: string; value: string };

function optionLabel(opt: Option) {
  return typeof opt === 'string' ? opt : opt.label;
}
function optionValue(opt: Option) {
  return typeof opt === 'string' ? opt : opt.value;
}

export default function EnumAutocomplete({
  label,
  value,
  onChange,
  options,
  disabled,
  error,
  helperText,
  size,
  required,
  hideLabel = false,
  textFieldSx,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  disabled?: boolean;
  error?: boolean;
  helperText?: React.ReactNode;
  size?: 'small' | 'medium';
  required?: boolean;
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
}) {
  const list = React.useMemo(() => options.map((o) => ({ label: optionLabel(o), value: optionValue(o) })), [options]);
  const selected = list.find((o) => o.value === value) || null;
  return (
    <Autocomplete
      options={list}
      value={selected}
      onChange={(_, opt) => onChange((opt as any)?.value || '')}
      getOptionLabel={(o) => (o as any).label}
      isOptionEqualToValue={(a, b) => (a as any).value === (b as any).value}
      renderInput={(params) => (
        <TextField
          {...params}
          label={hideLabel ? undefined : label}
          required={required}
          error={error}
          helperText={helperText}
          size={size}
          variant={hideLabel ? 'standard' : undefined}
          InputLabelProps={hideLabel ? undefined : { shrink: true }}
          InputProps={{
            ...params.InputProps,
            ...(hideLabel ? { disableUnderline: true } : {}),
          }}
          sx={textFieldSx}
        />
      )}
      ListboxProps={hideLabel ? { sx: drawerAutocompleteListboxSx } : undefined}
      filterOptions={(opts, { inputValue }) => {
        const s = inputValue.toLowerCase();
        return opts.filter((o) => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
      }}
      disabled={disabled}
      fullWidth
    />
  );
}
