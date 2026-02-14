import React from 'react';
import { TextField, InputAdornment, IconButton, SxProps, Theme, Box } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import { euToYmd, ymdToEu, formatEuPartial } from '../../lib/date-eu';

type Props = {
  label: string;
  valueYmd?: string; // YYYY-MM-DD or ''
  onChangeYmd: (next: string) => void; // emit YYYY-MM-DD or ''
  disabled?: boolean;
  required?: boolean;
  name?: string;
  error?: boolean;
  helperText?: string;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
};

// Extract just the date portion (YYYY-MM-DD) from a value that might be ISO datetime
function toYmdOnly(value: string): string {
  if (!value) return '';
  // Handle ISO datetime format (2025-12-31T00:00:00.000Z)
  if (value.includes('T')) {
    return value.split('T')[0];
  }
  return value;
}

export default function DateEUField({ label, valueYmd = '', onChangeYmd, disabled, required, name, error, helperText, size, sx }: Props) {
  const [text, setText] = React.useState<string>('');
  const nativeRef = React.useRef<HTMLInputElement | null>(null);

  // Normalize the input value to YYYY-MM-DD format
  const normalizedYmd = toYmdOnly(valueYmd);

  // sync from value
  React.useEffect(() => {
    setText(ymdToEu(normalizedYmd));
  }, [normalizedYmd]);

  const onTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatEuPartial(raw);
    setText(formatted);
    const ymd = euToYmd(formatted);
    if (ymd) onChangeYmd(ymd);
  };

  const onBlur = () => {
    const ymd = euToYmd(text);
    if (!ymd && text.trim() === '') {
      onChangeYmd('');
      setText('');
      return;
    }
    if (ymd) setText(ymdToEu(ymd));
  };

  const openPicker = () => {
    nativeRef.current?.showPicker?.();
    if (!nativeRef.current?.showPicker) nativeRef.current?.click();
  };

  const onNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ymd = e.target.value || '';
    onChangeYmd(ymd);
    setText(ymdToEu(ymd));
  };

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <input
        ref={nativeRef}
        type="date"
        style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
        value={normalizedYmd}
        onChange={onNativeChange}
      />
      <TextField
        label={label}
        placeholder="dd/mm/yyyy"
        value={text}
        onChange={onTextChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        InputLabelProps={{ shrink: true }}
        name={name}
        error={error}
        helperText={helperText}
        size={size}
        fullWidth
        inputProps={{ inputMode: 'numeric' }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={openPicker} aria-label="Open calendar" tabIndex={-1}>
                <EventIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
    </Box>
  );
}
