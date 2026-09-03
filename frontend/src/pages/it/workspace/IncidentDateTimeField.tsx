import React from 'react';
import { TextField } from '@mui/material';
import { isoToLocalDateTimeInput, localDateTimeInputToIso } from '../../../lib/datetime';
import { drawerDatePickerSx, drawerFieldValueSx, nakedInputHoverSx } from '../../../theme/formSx';

type Props = {
  value: string | null;
  onChange: (next: string | null) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

/**
 * Naked date-time picker for incident timestamps. Commits while the value is
 * complete and on blur, so clearing one segment mid-edit never wipes the field.
 */
export default function IncidentDateTimeField({ value, onChange, disabled = false, autoFocus = false }: Props) {
  const [draft, setDraft] = React.useState(() => isoToLocalDateTimeInput(value));

  React.useEffect(() => {
    setDraft(isoToLocalDateTimeInput(value));
  }, [value]);

  const commit = (next: string) => {
    const iso = localDateTimeInputToIso(next);
    if (iso === (value || null)) return;
    onChange(iso);
  };

  return (
    <TextField
      type="datetime-local"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        if (event.target.value) commit(event.target.value);
      }}
      onBlur={() => commit(draft)}
      disabled={disabled}
      autoFocus={autoFocus}
      variant="standard"
      fullWidth
      InputProps={{ disableUnderline: true }}
      sx={[drawerFieldValueSx, drawerDatePickerSx, nakedInputHoverSx]}
    />
  );
}
