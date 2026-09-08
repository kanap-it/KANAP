import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Localized "2h ago" style formatter shared by the home tiles.
 * Falls back to `fallback()` (typically a short date) once the value is a week old or more.
 */
export function useRelativeTime() {
  const { t } = useTranslation('common');
  return useCallback((value: string | number | Date, fallback: () => string): string => {
    const timestamp = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : new Date(value).getTime();
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 1) return t('dashboard.tiles.justNow');
    if (minutes < 60) return t('dashboard.tiles.minutesAgo', { count: minutes });
    if (hours < 24) return t('dashboard.tiles.hoursAgo', { count: hours });
    if (days < 7) return t('dashboard.tiles.daysAgo', { count: days });
    return fallback();
  }, [t]);
}
