import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

/**
 * TextField with label shrink enabled by default.
 * Prevents label/value overlap with browser autofill and matches app-wide styling.
 */
const ShrunkLabelTextField = React.forwardRef<HTMLDivElement, TextFieldProps>(
  ({ InputLabelProps, ...rest }, ref) => {
    const mergedInputLabelProps = { shrink: true, ...(InputLabelProps as any) };
    return <TextField ref={ref} InputLabelProps={mergedInputLabelProps} {...rest} />;
  }
);

export default ShrunkLabelTextField;

