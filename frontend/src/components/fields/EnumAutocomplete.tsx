import React from 'react';
import { Autocomplete, Box, TextField } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { FieldLabel, mergeSx } from '../design';
import { drawerAutocompleteListboxSx, nakedControlHoverSx, nakedFieldPlaceholderSx } from '../../theme/formSx';

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
  placeholder,
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
  placeholder?: string;
  size?: 'small' | 'medium';
  required?: boolean;
  hideLabel?: boolean;
  textFieldSx?: SxProps<Theme>;
}) {
  const { t } = useTranslation('common');
  const naked = hideLabel || label === '';
  const list = React.useMemo(() => options.map((o) => ({ label: optionLabel(o), value: optionValue(o) })), [options]);
  const selected = list.find((o) => o.value === value) || null;
  const control = (
    <Autocomplete
      options={list}
      value={selected}
      onChange={(_, opt) => onChange((opt as any)?.value || '')}
      getOptionLabel={(o) => (o as any).label}
      isOptionEqualToValue={(a, b) => (a as any).value === (b as any).value}
      renderInput={(params) => (
        <TextField
          {...params}
          required={required}
          error={error}
          helperText={helperText}
          size={size}
          variant="standard"
          placeholder={placeholder ?? (naked ? t('selects.notSet') : undefined)}
          InputProps={{
            ...params.InputProps,
            ...(naked ? { disableUnderline: true } : {}),
          }}
          sx={naked ? mergeSx(nakedControlHoverSx, nakedFieldPlaceholderSx, textFieldSx) : textFieldSx}
        />
      )}
      ListboxProps={naked ? { sx: drawerAutocompleteListboxSx } : undefined}
      filterOptions={(opts, { inputValue }) => {
        const s = inputValue.toLowerCase();
        return opts.filter((o) => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
      }}
      disabled={disabled}
      fullWidth
    />
  );

  if (naked || !label) return control;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
      <FieldLabel required={required}>{label}</FieldLabel>
      {control}
    </Box>
  );
}
