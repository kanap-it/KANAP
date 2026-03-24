import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useTranslation } from 'react-i18next';

type ValidatedBadgeProps = {
  size?: 'small' | 'medium';
  validatedAtLabel?: string | null;
  iconOnly?: boolean;
};

export default function ValidatedBadge({ size = 'small', validatedAtLabel, iconOnly = false }: ValidatedBadgeProps) {
  const { t } = useTranslation(['knowledge']);
  const title = validatedAtLabel
    ? t('validatedBadge.validatedOn', { date: validatedAtLabel })
    : t('validatedBadge.label');
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
        label={t('validatedBadge.label')}
        color="success"
        variant="outlined"
        size={size}
        sx={{ fontWeight: 500 }}
      />
    </Tooltip>
  );
}
