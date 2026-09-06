import { useTranslation } from 'react-i18next';
import { classificationText } from '../../../utils/applicationClassification';
import React from 'react';
import { Box, ButtonBase, MenuItem, Popover, Typography } from '@mui/material';
import useApplicationClassificationCatalog from '../../../hooks/useApplicationClassificationCatalog';
import { formatDuration } from './DurationEditor';
import { configuredMtdOptions } from './ApplicationMtdSelect';

export default function ApplicationMtdMetadata({ criticality, minutes, disabled, onCommit }: { criticality: string | null; minutes: number | null; disabled?: boolean; onCommit: (value: number | null) => Promise<void> }) {
  useTranslation('it');
  const { data: catalog } = useApplicationClassificationCatalog();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [pending, setPending] = React.useState(false);
  const commit = async (value: number | null) => {
    setPending(true);
    try { await onCommit(value); setAnchor(null); } catch { /* Workspace displays the error. */ }
    finally { setPending(false); }
  };
  const level = catalog?.businessCriticalityLevels.find((item) => item.code === criticality);
  return <>
    <ButtonBase disabled={disabled} onClick={(event) => setAnchor(event.currentTarget)} sx={(theme) => ({ px: 1, py: 0.5, borderRadius: '5px', fontSize: 12, color: theme.palette.kanap.text.primary })}>
      {level?.label || criticality || classificationText("MTD not set")}{minutes != null ? ` · ${formatDuration(minutes)}` : ''}
    </ButtonBase>
    <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
      <Box sx={{ p: 2, width: 330 }}>
        <Typography sx={(theme) => ({ fontSize: 12, fontWeight: 500, color: theme.palette.kanap.text.primary, mb: 1 })}>{classificationText("Maximum tolerable downtime")}</Typography>
        <MenuItem disabled={pending} onClick={() => void commit(null)} sx={{ fontSize: 13 }}>{classificationText('Not set')}</MenuItem>
        {configuredMtdOptions(catalog?.businessMtdPresets || [], minutes).map((option) =>
          <MenuItem key={option.value} disabled={pending || option.disabled} selected={option.value === minutes}
            onClick={() => void commit(option.value)} sx={{ fontSize: 13 }}>{formatDuration(option.value)}</MenuItem>)}
      </Box>
    </Popover>
  </>;
}
