import React from 'react';
import { Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { BuiltinUsage } from '../aiTypes';
import { getDotColor } from '../../utils/statusColors';

type BuiltinUsageIndicatorProps = {
  usage: BuiltinUsage | null;
};

function formatResetDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function BuiltinUsageIndicator({ usage }: BuiltinUsageIndicatorProps) {
  const { t, i18n } = useTranslation(['ai']);
  const mode = useTheme().palette.mode;

  if (!usage || usage.limit <= 0) {
    return null;
  }

  const remaining = Math.max(usage.limit - usage.count, 0);
  const ratio = usage.limit > 0 ? usage.count / usage.limit : 0;

  if (ratio < 0.9) {
    return null;
  }

  if (remaining <= 0) {
    return (
      <Typography variant="body2" sx={{ color: getDotColor('error', mode), fontWeight: 500, fontSize: '0.8125rem' }}>
        {t('usageIndicator.limitReached', {
          resetDate: formatResetDate(usage.reset_date, i18n.language),
        })}
      </Typography>
    );
  }

  return (
    <Typography variant="body2" sx={{ color: getDotColor(ratio >= 0.98 ? 'error' : 'warning', mode), fontWeight: 500, fontSize: '0.8125rem' }}>
      {t('usageIndicator.remaining', { count: remaining })}
    </Typography>
  );
}
