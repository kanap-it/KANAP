import React from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';
import { useLocale } from '../../../i18n/useLocale';

/**
 * Date format options
 */
export type DateFormat = 'date' | 'datetime' | 'time' | 'relative' | 'iso';

/**
 * Props for the DateCellRenderer component
 */
export interface DateCellRendererProps<T = unknown> extends ICellRendererParams<T> {
  /** Format to display the date in */
  format?: DateFormat;
  /** Custom date format options for toLocaleString */
  formatOptions?: Intl.DateTimeFormatOptions;
  /** Locale for date formatting */
  locale?: string;
  /** Show tooltip with full date/time */
  showTooltip?: boolean;
  /** Text to show when date is null/undefined */
  emptyText?: string;
  /** Show relative time for dates within this many days (0 to disable) */
  relativeWithinDays?: number;
  /** Callback when date cell is clicked */
  onClick?: (data: T, date: Date | null) => void;
}

/**
 * Parse a date value into a Date object
 */
function parseDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

/**
 * Format a date according to the specified format
 */
function formatDate(
  date: Date,
  format: DateFormat,
  locale: string,
  formatOptions?: Intl.DateTimeFormatOptions
): string {
  switch (format) {
    case 'date':
      return date.toLocaleDateString(locale, formatOptions ?? {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    case 'datetime':
      return date.toLocaleString(locale, formatOptions ?? {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'time':
      return date.toLocaleTimeString(locale, formatOptions ?? {
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'relative':
      return getRelativeTime(date, locale);
    case 'iso':
      return date.toISOString();
    default:
      return date.toLocaleDateString(locale);
  }
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 hours")
 */
function getRelativeTime(date: Date, locale: string, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const diffMinutes = Math.round(diffSeconds / 60);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffSeconds) < 60) {
    return rtf.format(diffSeconds, 'second');
  }
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day');
  }
  if (Math.abs(diffWeeks) < 5) {
    return rtf.format(diffWeeks, 'week');
  }
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'month');
  }
  return rtf.format(diffYears, 'year');
}

/**
 * Check if a date is within N days of today
 */
function isWithinDays(date: Date, days: number): boolean {
  const now = new Date();
  const diffMs = Math.abs(date.getTime() - now.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

/**
 * DateCellRenderer - Renders date values with formatting options
 *
 * Usage in column definition:
 * ```tsx
 * {
 *   field: 'created_at',
 *   headerName: 'Created',
 *   cellRenderer: DateCellRenderer,
 *   cellRendererParams: {
 *     format: 'datetime',
 *     showTooltip: true,
 *     relativeWithinDays: 7,
 *   },
 * }
 * ```
 */
export function DateCellRenderer<T = unknown>(
  props: DateCellRendererProps<T>
): React.ReactElement | null {
  const activeLocale = useLocale();
  const {
    value,
    data,
    format = 'date',
    formatOptions,
    locale,
    showTooltip = true,
    emptyText = '',
    relativeWithinDays = 0,
    onClick,
  } = props;
  const resolvedLocale = locale ?? activeLocale;

  const date = parseDate(value);

  if (!date) {
    return emptyText ? (
      <Typography variant="body2" color="text.secondary">
        {emptyText}
      </Typography>
    ) : null;
  }

  // Determine display format
  let displayFormat = format;
  if (relativeWithinDays > 0 && isWithinDays(date, relativeWithinDays)) {
    displayFormat = 'relative';
  }

  const displayText = formatDate(date, displayFormat, resolvedLocale, formatOptions);
  const tooltipText = displayFormat !== 'datetime'
    ? formatDate(date, 'datetime', resolvedLocale)
    : undefined;

  const handleClick = onClick && data
    ? () => onClick(data, date)
    : undefined;

  const content = (
    <Box
      component="span"
      sx={{
        cursor: handleClick ? 'pointer' : 'default',
        '&:hover': handleClick ? { color: 'text.primary' } : undefined,
      }}
      onClick={handleClick}
    >
      {displayText}
    </Box>
  );

  if (showTooltip && tooltipText) {
    return (
      <Tooltip title={tooltipText} placement="top">
        {content}
      </Tooltip>
    );
  }

  return content;
}

/**
 * Factory function to create a DateCellRenderer with preset configurations
 */
export function createDateCellRenderer<T = unknown>(
  config: Omit<DateCellRendererProps<T>, keyof ICellRendererParams<T>>
): React.FC<ICellRendererParams<T>> {
  return function ConfiguredDateCellRenderer(params: ICellRendererParams<T>) {
    return <DateCellRenderer {...params} {...config} />;
  };
}

/**
 * Pre-configured renderer for date-only display
 */
export const DateOnlyRenderer = createDateCellRenderer({
  format: 'date',
  showTooltip: true,
});

/**
 * Pre-configured renderer for date-time display
 */
export const DateTimeRenderer = createDateCellRenderer({
  format: 'datetime',
  showTooltip: false,
});

/**
 * Pre-configured renderer for relative time (with fallback to full date)
 */
export const RelativeDateRenderer = createDateCellRenderer({
  format: 'date',
  relativeWithinDays: 7,
  showTooltip: true,
});

/**
 * Pre-configured renderer for created_at fields
 */
export const CreatedAtRenderer = createDateCellRenderer({
  format: 'datetime',
  showTooltip: false,
  emptyText: '-',
});

export default DateCellRenderer;
