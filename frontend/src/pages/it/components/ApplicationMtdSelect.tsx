import React from 'react';
import { MenuItem, Select } from '@mui/material';
import { useTranslation } from 'react-i18next';
import useApplicationClassificationCatalog from '../../../hooks/useApplicationClassificationCatalog';
import { drawerMenuItemSx, drawerSelectSx } from '../../../theme/formSx';
import { classificationText } from '../../../utils/applicationClassification';
import { formatDuration } from './DurationEditor';

export function configuredMtdOptions(presets: number[], current: number | null) {
  const options = [...new Set(presets)].map((value) => ({ value, disabled: false }));
  // Preserve display of a historical value without offering it as a new choice.
  if (current != null && !presets.includes(current)) options.push({ value: current, disabled: true });
  return options;
}

export default function ApplicationMtdSelect({ value, onCommit, disabled, onDraftStateChange }: {
  value: number | null;
  onCommit: (value: number | null) => void | Promise<void>;
  disabled?: boolean;
  onDraftStateChange?: (blocking: boolean) => void;
}) {
  useTranslation('it');
  const { data: catalog } = useApplicationClassificationCatalog();
  const [pending, setPending] = React.useState(false);
  return <Select<number | ''> value={value ?? ''} displayEmpty variant="standard" disableUnderline sx={drawerSelectSx}
    disabled={disabled || pending || !catalog}
    inputProps={{ 'aria-label': classificationText('Maximum tolerable downtime') }}
    renderValue={(selected) => selected === '' ? classificationText('Choose a duration') : formatDuration(Number(selected))}
    onChange={async (event) => {
      setPending(true); onDraftStateChange?.(true);
      try {
        await onCommit(event.target.value === '' ? null : Number(event.target.value));
        onDraftStateChange?.(false);
      } catch { /* The workspace retains the error and blocks review. */ }
      finally { setPending(false); }
    }}>
    <MenuItem value="" sx={drawerMenuItemSx}>{classificationText('Not set')}</MenuItem>
    {configuredMtdOptions(catalog?.businessMtdPresets || [], value).map((option) =>
      <MenuItem key={option.value} value={option.value} disabled={option.disabled} sx={drawerMenuItemSx}>{formatDuration(option.value)}</MenuItem>)}
  </Select>;
}
