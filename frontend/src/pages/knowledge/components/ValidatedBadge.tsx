import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';

type ValidatedBadgeProps = {
  size?: 'small' | 'medium';
  validatedAtLabel?: string | null;
  iconOnly?: boolean;
};

export default function ValidatedBadge({ size = 'small', validatedAtLabel, iconOnly = false }: ValidatedBadgeProps) {
  const title = validatedAtLabel ? `Validated on ${validatedAtLabel}` : 'Validated';
  if (iconOnly) {
    return (
      <Tooltip title={title}>
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', color: 'success.main' }}>
          <VerifiedIcon fontSize={size === 'small' ? 'small' : 'medium'} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={title}>
      <Chip
        icon={<VerifiedIcon />}
        label="Validated"
        color="success"
        variant="outlined"
        size={size}
        sx={{ fontWeight: 500 }}
      />
    </Tooltip>
  );
}
