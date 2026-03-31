import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { BuiltinUsage } from '../aiTypes';

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
      <Chip
        color="error"
        variant="filled"
        label={t('usageIndicator.limitReached', {
          resetDate: formatResetDate(usage.reset_date, i18n.language),
        })}
      />
    );
  }

  return (
    <Chip
      color={ratio >= 0.98 ? 'error' : 'warning'}
      variant="outlined"
      label={t('usageIndicator.remaining', { count: remaining })}
    />
  );
}
