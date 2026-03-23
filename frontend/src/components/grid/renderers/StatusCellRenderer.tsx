import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { ICellRendererParams } from 'ag-grid-community';
import { useTranslation } from 'react-i18next';

/**
 * Status value mapping configuration
 */
export interface StatusConfig {
  value: string;
  label: string;
  color: ChipProps['color'];
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
  { value: 'under_review', label: 'Under Review', color: 'warning' },
  { value: 'approved', label: 'Approved', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
  { value: 'in_progress', label: 'In Progress', color: 'primary' },
  { value: 'on_hold', label: 'On Hold', color: 'warning' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'default' },
  { value: 'pending', label: 'Pending', color: 'warning' },
  { value: 'open', label: 'Open', color: 'info' },
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
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * StatusCellRenderer - Renders status values as colored chips
 *
 * Usage in column definition:
 * ```tsx
 * {
 *   field: 'status',
 *   headerName: 'Status',
 *   cellRenderer: StatusCellRenderer,
 *   cellRendererParams: {
 *     size: 'small',
 *     variant: 'filled',
 *     statusConfigs: [
 *       { value: 'custom', label: 'Custom Status', color: 'secondary' }
 *     ],
 *   },
 * }
 * ```
 */
export function StatusCellRenderer<T = unknown>(
  props: StatusCellRendererProps<T>
): React.ReactElement | null {
  const {
    value,
    data,
    statusConfigs = DEFAULT_STATUS_CONFIGS,
    size = 'small',
    variant = 'filled',
    statusField,
    onClick,
  } = props;

  const { t } = useTranslation('common');

  // Get the status value (from statusField if specified, otherwise from value)
  const statusValue = statusField && data
    ? String((data as Record<string, unknown>)[statusField] ?? '')
    : String(value ?? '');

  if (!statusValue) {
    return null;
  }

  const config = getStatusConfig(statusValue, statusConfigs);
  const normalizedKey = statusValue.toLowerCase().trim().replace(/\s+/g, '_');
  const label = t(`statuses.${normalizedKey}`, { defaultValue: config?.label ?? formatStatusValue(statusValue) });
  const color = config?.color ?? 'default';

  const handleClick = onClick && data
    ? () => onClick(data, statusValue)
    : undefined;

  return (
    <Chip
      label={label}
      color={color}
      size={size}
      variant={variant}
      onClick={handleClick}
      sx={{
        cursor: handleClick ? 'pointer' : 'default',
        '&:hover': handleClick ? { opacity: 0.9 } : undefined,
      }}
    />
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
    { value: 'in_progress', label: 'In Progress', color: 'primary' },
    { value: 'on_hold', label: 'On Hold', color: 'warning' },
    { value: 'completed', label: 'Completed', color: 'success' },
    { value: 'cancelled', label: 'Cancelled', color: 'default' },
  ],
});

export default StatusCellRenderer;
