import React from 'react';
import { FormControlLabel, Switch, FormHelperText, Stack } from '@mui/material';

type StatusSwitchProps = {
  label?: string;
  value?: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  name?: string;
};

const StatusSwitch = React.forwardRef<HTMLButtonElement, StatusSwitchProps>(function StatusSwitch(
  {
    label = 'Enabled',
    value = true,
    onChange,
    disabled,
    error,
    helperText,
    name,
  },
  ref,
) {
  return (
    <Stack spacing={0.5}>
      <FormControlLabel
        control={
          <Switch
            name={name}
            checked={!!value}
            onChange={(_, checked) => onChange(checked)}
            disabled={disabled}
            inputProps={{ 'aria-label': label }}
            inputRef={ref}
          />
        }
        label={label}
      />
      {helperText ? (
        <FormHelperText error={!!error} sx={{ ml: 1.75 }}>
          {helperText}
        </FormHelperText>
      ) : null}
    </Stack>
  );
});

export default StatusSwitch;
