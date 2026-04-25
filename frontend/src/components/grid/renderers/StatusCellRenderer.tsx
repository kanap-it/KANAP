import React from 'react';
import { Box, ChipProps, useTheme } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';
import { useTranslation } from 'react-i18next';
import { getDotColor } from '../../../utils/statusColors';

/**
 * Status value mapping configuration
 */
export interface StatusConfig {
  value: string;
  label: string;
  color: ChipProps['color'];
}

/**
 * Standard environment → color mapping (business convention)
 */
const ENV_COLOR_MAP: Record<string, string> = {
  prod:     'error',
  pre_prod: 'warning',
  qa:       'info',
  test:     'secondary',
  dev:      'success',
  sandbox:  'default',
};

/**
 * Returns the dot color for a given environment value, respecting light/dark mode.
 */
export function getEnvDotColor(env: string, mode: 'light' | 'dark'): string {
  return getDotColor(ENV_COLOR_MAP[env] ?? 'default', mode);
}

/**
 * Default status configurations for common statuses
 */
export const DEFAULT_STATUS_CONFIGS: StatusConfig[] = [
  { value: 'enabled', label: 'Enabled', color: 'success' },
  { value: 'disabled', label: 'Disabled', color: 'default' },
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'default' },
  { value: 'proposed', label: 'Proposed', color: 'info' },
  { value: 'deprecated', label: 'Deprecated', color: 'warning' },
  { value: 'retired', label: 'Retired', color: 'default' },
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'submitted', label: 'Submitted', color: 'info' },
  { value: 'under_review', label: 'Under review', color: 'warning' },
  { value: 'approved', label: 'Approved', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
  { value: 'in_progress', label: 'In progress', color: 'info' },
  { value: 'on_hold', label: 'On hold', color: 'warning' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'open', label: 'Open', color: 'default' },
  { value: 'closed', label: 'Closed', color: 'default' },
];

/**
 * Props for the StatusCellRenderer component
 */
export interface StatusCellRendererProps<T = unknown> extends ICellRendererParams<T> {
  /** Custom status configurations */
  statusConfigs?: StatusConfig[];
  /** Size of the chip */
  size?: 'small' | 'medium';
  /** Variant of the chip */
  variant?: 'filled' | 'outlined';
  /** Field to get the status value from (if different from value) */
  statusField?: string;
  /** Callback when status chip is clicked */
  onClick?: (data: T, status: string) => void;
}

/**
 * Get status configuration by value
 */
function getStatusConfig(
  value: string | null | undefined,
  configs: StatusConfig[]
): StatusConfig | undefined {
  if (!value) return undefined;
  const normalizedValue = String(value).toLowerCase().trim();
  return configs.find((c) => c.value.toLowerCase() === normalizedValue);
}

/**
 * Format status value for display (fallback)
 */
function formatStatusValue(value: string | null | undefined): string {
  if (!value) return '';
  const text = String(value)
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
}

/**
 * StatusCellRenderer - Renders status values as colored dot + text
 *
 * Design system: dot+text pattern in tables (6px dot + colored text).
 * Chip/pill pattern is reserved for dashboard cards only.
 */
export function StatusCellRenderer<T = unknown>(
  props: StatusCellRendererProps<T>
): React.ReactElement | null {
  const {
    value,
    data,
    statusConfigs = DEFAULT_STATUS_CONFIGS,
    statusField,
    onClick,
  } = props;

  const { t } = useTranslation('common');
  const theme = useTheme();
  const mode = theme.palette.mode;

  const statusValue = statusField && data
    ? String((data as Record<string, unknown>)[statusField] ?? '')
    : String(value ?? '');

  if (!statusValue) {
    return null;
  }

  const config = getStatusConfig(statusValue, statusConfigs);
  const normalizedKey = statusValue.toLowerCase().trim().replace(/\s+/g, '_');
  const label = t(`statuses.${normalizedKey}`, { defaultValue: config?.label ?? formatStatusValue(statusValue) });
  const dotColor = getDotColor(config?.color ?? 'default', mode);

  const handleClick = onClick && data
    ? () => onClick(data, statusValue)
    : undefined;

  return (
    <Box
      component="span"
      onClick={handleClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: handleClick ? 'pointer' : 'default',
        fontSize: '0.8125rem',
        fontWeight: 500,
        color: dotColor,
        lineHeight: 1,
      }}
    >
      <Box
        component="span"
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
        }}
      />
      {label}
    </Box>
  );
}

/**
 * Factory function to create a StatusCellRenderer with preset configurations
 */
export function createStatusCellRenderer<T = unknown>(
  config: Omit<StatusCellRendererProps<T>, keyof ICellRendererParams<T>>
): React.FC<ICellRendererParams<T>> {
  return function ConfiguredStatusCellRenderer(params: ICellRendererParams<T>) {
    return <StatusCellRenderer {...params} {...config} />;
  };
}

/**
 * Pre-configured renderer for enabled/disabled status
 */
export const EnabledDisabledRenderer = createStatusCellRenderer({
  statusConfigs: [
    { value: 'enabled', label: 'Enabled', color: 'success' },
    { value: 'disabled', label: 'Disabled', color: 'default' },
  ],
});

/**
 * Pre-configured renderer for lifecycle status
 */
export const LifecycleStatusRenderer = createStatusCellRenderer({
  statusConfigs: [
    { value: 'proposed', label: 'Proposed', color: 'info' },
    { value: 'active', label: 'Active', color: 'success' },
    { value: 'deprecated', label: 'Deprecated', color: 'warning' },
    { value: 'retired', label: 'Retired', color: 'default' },
  ],
});

/**
 * Pre-configured renderer for project status
 */
export const ProjectStatusRenderer = createStatusCellRenderer({
  statusConfigs: [
    { value: 'draft', label: 'Draft', color: 'default' },
    { value: 'proposed', label: 'Proposed', color: 'info' },
    { value: 'approved', label: 'Approved', color: 'success' },
    { value: 'in_progress', label: 'In progress', color: 'info' },
    { value: 'on_hold', label: 'On hold', color: 'warning' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'error' },
  ],
});

export default StatusCellRenderer;
