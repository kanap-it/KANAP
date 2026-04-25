import React from 'react';
import {
  Box,
  LinearProgress,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { MONO_FONT_FAMILY } from '../../../config/ThemeContext';
import { drawerMenuItemSx } from '../../../theme/formSx';
import { taskDetailTypography } from '../../tasks/theme/taskDetailTokens';

const dotSx = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
} as const;

const metaItemBaseSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  ...taskDetailTypography.metaChip,
} as const;

type MetadataItemProps = {
  children: React.ReactNode;
  disabled?: boolean;
  label?: React.ReactNode;
  mono?: boolean;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  sx?: SxProps<Theme>;
  title?: string;
};

export function PortfolioMetadataItem({
  children,
  disabled = false,
  label,
  mono = false,
  onClick,
  sx,
  title,
}: MetadataItemProps) {
  return (
    <Box
      component={onClick && !disabled ? 'button' : 'span'}
      type={onClick && !disabled ? 'button' : undefined}
      title={title}
      onClick={disabled ? undefined : onClick}
      sx={[
        (theme) => ({
          ...metaItemBaseSx,
          border: 0,
          p: 0,
          bgcolor: 'transparent',
          color: theme.palette.kanap.text.primary,
          fontFamily: 'inherit',
          cursor: onClick && !disabled ? 'pointer' : 'default',
          minWidth: 0,
          '&:hover': onClick && !disabled ? { color: theme.palette.kanap.text.primary } : undefined,
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {label && (
        <Box
          component="span"
          sx={(theme) => ({
            ...taskDetailTypography.metaLabel,
            color: theme.palette.kanap.text.tertiary,
            whiteSpace: 'nowrap',
          })}
        >
          {label}
        </Box>
      )}
      <Box
        component="span"
        sx={{
          fontFamily: mono ? MONO_FONT_FAMILY : undefined,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

type StatusOption = {
  color: string;
  label: string;
  value: string;
};

type PortfolioStatusMetadataProps = {
  color: string;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: StatusOption[];
  value: string;
};

export function PortfolioStatusMetadata({
  color,
  disabled = false,
  label,
  onChange,
  options,
  value,
}: PortfolioStatusMetadataProps) {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={disabled ? undefined : (event) => setAnchorEl(event.currentTarget)}
        sx={(theme) => ({
          ...metaItemBaseSx,
          border: 0,
          p: 0,
          bgcolor: 'transparent',
          color: theme.palette.kanap.text.primary,
          fontFamily: 'inherit',
          cursor: disabled ? 'default' : 'pointer',
        })}
      >
        <Box component="span" sx={{ ...dotSx, bgcolor: color }} />
        <span>{label}</span>
      </Box>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {options.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              setAnchorEl(null);
            }}
            sx={{ ...drawerMenuItemSx, gap: '8px' }}
          >
            <Box component="span" sx={{ ...dotSx, bgcolor: option.color }} />
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

type PortfolioScoreMetadataProps = {
  color: string;
  label?: string;
  title?: string;
  value: number | null | undefined;
};

export function PortfolioScoreMetadata({
  color,
  label,
  title,
  value,
}: PortfolioScoreMetadataProps) {
  if (value == null) return null;

  const node = (
    <Box sx={(theme) => ({ ...metaItemBaseSx, color: theme.palette.kanap.text.primary })}>
      <Box component="span" sx={{ ...dotSx, bgcolor: color }} />
      <Box component="span" sx={{ ...taskDetailTypography.scoreValue }}>
        {Math.round(Number(value))}
      </Box>
      {label && (
        <Box component="span" sx={(theme) => ({ ...taskDetailTypography.metaLabel, color: theme.palette.kanap.text.tertiary })}>
          {label}
        </Box>
      )}
    </Box>
  );

  return title ? (
    <Tooltip title={title} arrow>
      {node}
    </Tooltip>
  ) : node;
}

type PortfolioProgressMetadataProps = {
  label: string;
  value: number | null | undefined;
};

export function PortfolioProgressMetadata({ label, value }: PortfolioProgressMetadataProps) {
  if (value == null) return null;
  const normalized = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: 142 }}>
      <Box component="span" sx={(theme) => ({ ...taskDetailTypography.metaLabel, color: theme.palette.kanap.text.tertiary })}>
        {label}
      </Box>
      <LinearProgress
        variant="determinate"
        value={normalized}
        sx={{ width: 78, height: 4, borderRadius: '2px', flexShrink: 0 }}
      />
      <Box component="span" sx={{ ...taskDetailTypography.scoreValue }}>
        {normalized}%
      </Box>
    </Box>
  );
}
