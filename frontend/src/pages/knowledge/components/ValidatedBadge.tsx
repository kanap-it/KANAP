import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useTranslation } from 'react-i18next';
import { getDotColor } from '../../../utils/statusColors';

type ValidatedBadgeProps = {
  size?: 'small' | 'medium';
  validatedAtLabel?: string | null;
  iconOnly?: boolean;
};

export default function ValidatedBadge({ size = 'small', validatedAtLabel, iconOnly = false }: ValidatedBadgeProps) {
  const { t } = useTranslation(['knowledge']);
  const mode = useTheme().palette.mode;
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
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: getDotColor('success', mode) }} />
        <Typography variant="body2" sx={{ color: getDotColor('success', mode), fontWeight: 500, fontSize: '0.8125rem' }}>
          {t('validatedBadge.label')}
        </Typography>
      </Box>
    </Tooltip>
  );
}
