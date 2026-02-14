import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  actions?: React.ReactNode;
  /** Controls section (add/save/reset buttons) shown above the content */
  controls?: React.ReactNode;
}

/**
 * A collapsible section wrapper for settings pages.
 * Uses MUI Accordion with deferred rendering for performance.
 */
export function SettingsSection({
  title,
  description,
  children,
  defaultExpanded = false,
  actions,
  controls,
}: SettingsSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const [hasOpened, setHasOpened] = React.useState(defaultExpanded);

  const handleChange = (_: React.SyntheticEvent, nextExpanded: boolean) => {
    setExpanded(nextExpanded);
    if (nextExpanded) setHasOpened(true);
  };

  const shouldRender = hasOpened || expanded;

  return (
    <Accordion
      expanded={expanded}
      onChange={handleChange}
      disableGutters
      elevation={0}
      square
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" alignItems="center" sx={{ flex: 1, pr: 2 }}>
          <Stack spacing={0.25} sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{title}</Typography>
            {description && (
              <Typography variant="caption" color="text.secondary">{description}</Typography>
            )}
          </Stack>
          {actions && (
            <Box onClick={(e) => e.stopPropagation()}>
              {actions}
            </Box>
          )}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {shouldRender ? (
          <>
            {controls}
            {children}
          </>
        ) : null}
      </AccordionDetails>
    </Accordion>
  );
}

export interface SettingsControlsProps {
  onAdd: () => void;
  onSave: () => void;
  onReset: () => void;
  saving?: boolean;
  dirty?: boolean;
  addLabel?: string;
}

/**
 * Standard controls bar for settings sections with Add/Save/Reset buttons.
 */
export function SettingsControls({
  onAdd,
  onSave,
  onReset,
  saving,
  dirty,
  addLabel = 'Add item',
}: SettingsControlsProps) {
  return (
    <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}>
      <Button size="small" variant="outlined" onClick={onAdd}>{addLabel}</Button>
      <Button size="small" variant="contained" disabled={!dirty || !!saving} onClick={onSave}>
        {saving ? 'Saving...' : 'Save changes'}
      </Button>
      <Button size="small" variant="text" disabled={!dirty || !!saving} onClick={onReset}>
        Reset
      </Button>
    </Stack>
  );
}

export interface SettingsGroupProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showDivider?: boolean;
}

/**
 * A group container for organizing related settings sections.
 */
export function SettingsGroup({
  title,
  subtitle,
  children,
  showDivider = true,
}: SettingsGroupProps) {
  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.25} sx={{ pt: 0.5 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        )}
      </Stack>
      {showDivider && <Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}
      <Stack spacing={1.5}>{children}</Stack>
    </Stack>
  );
}

export default SettingsSection;
