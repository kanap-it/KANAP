import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

function formatWithSpaces(value: string | number | null | undefined): string {
  if (value === '' || value == null) return '';
  const str = typeof value === 'number' ? String(value) : value;
  const neg = str.startsWith('-');
  const raw = neg ? str.slice(1) : str;
  const parts = raw.split('.');
  const intPart = parts[0].replace(/\s+/g, '');
  const decPart = parts[1] ?? '';
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (neg ? '-' : '') + (decPart ? `${grouped}.${decPart}` : grouped);
}

function unformat(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = typeof value === 'number' ? String(value) : value;
  // Normalize commas as decimals, remove spaces
  let v = str.replace(/\s+/g, '');
  v = v.replace(/,/g, '.');
  // Keep only digits, optional leading '-', and single '.'
  const neg = v.startsWith('-');
  if (neg) v = v.slice(1);
  const parts = v.split('.');
  const intPart = parts[0].replace(/[^0-9]/g, '');
  const decPart = parts[1] ? parts[1].replace(/[^0-9]/g, '') : '';
  const rebuilt = decPart ? `${intPart}.${decPart}` : intPart;
  return (neg ? '-' : '') + rebuilt;
}

function clampDecimals(value: string, precision = 2): string {
  if (value === '' || value === '.') return '';
  if (value === '-' || value === '-.') return '-';
  const neg = value.startsWith('-');
  const unsigned = neg ? value.slice(1) : value;
  const [intPartRaw = '', decPartRaw = ''] = unsigned.split('.');
  const intPart = intPartRaw === '' ? '0' : intPartRaw;
  if (precision <= 0) {
    return neg ? `-${intPart}` : intPart;
  }
  const decPart = decPartRaw.slice(0, precision);
  const rebuilt = decPart ? `${intPart}.${decPart}` : intPart;
  return neg ? `-${rebuilt}` : rebuilt;
}

export default function FormattedNumberField({ value, onChange, inputProps, InputLabelProps, ...rest }: TextFieldProps) {
  const [text, setText] = React.useState<string>('');

  React.useEffect(() => {
    if (value === '' || value == null) {
      setText('');
      return;
    }

    if (typeof value === 'number' || typeof value === 'string') {
      setText(formatWithSpaces(value));
      return;
    }

    if (Array.isArray(value)) {
      setText(formatWithSpaces(value.join('')));
      return;
    }

    // Unsupported value shapes (e.g. objects) fall back to empty string.
    setText('');
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e?.target?.value;
    const raw = typeof rawValue === 'number' ? String(rawValue) : rawValue ?? '';
    const cleaned = unformat(raw);
    const clamped = clampDecimals(cleaned, 2);
    setText(formatWithSpaces(clamped));
    // Emit number or ''
    const num = (clamped === '' || clamped === '-') ? '' : Number(clamped);
    const synthetic = { ...e, target: { ...e.target, value: num as any } } as React.ChangeEvent<HTMLInputElement>;
    (onChange as any)?.(synthetic);
  };

  return (
    <TextField
      {...rest}
      InputLabelProps={{ shrink: true, ...(InputLabelProps as any) }}
      value={text}
      onChange={handleChange}
      inputProps={{ inputMode: 'decimal', ...inputProps }}
    />
  );
}
