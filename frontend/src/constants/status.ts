export const STATUS_ENABLED = 'enabled' as const;
export const STATUS_DISABLED = 'disabled' as const;

export const STATUS_VALUES = [STATUS_ENABLED, STATUS_DISABLED] as const;

export type StatusValue = (typeof STATUS_VALUES)[number];

export const isStatusEnabled = (status: unknown): status is typeof STATUS_ENABLED =>
  String(status).toLowerCase() === STATUS_ENABLED;

export const isStatusDisabled = (status: unknown): status is typeof STATUS_DISABLED =>
  String(status).toLowerCase() === STATUS_DISABLED;

export const normalizeStatus = (status: unknown): StatusValue =>
  isStatusDisabled(status) ? STATUS_DISABLED : STATUS_ENABLED;

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function deriveStatusFromDisabledAt(disabledAt: string | Date | null | undefined, asOf: Date = new Date()): StatusValue {
  const date = parseDate(disabledAt);
  if (!date) return STATUS_ENABLED;
  return date.getTime() <= asOf.getTime() ? STATUS_DISABLED : STATUS_ENABLED;
}

export function normalizeDisabledAtInput(value: string | Date | null | undefined): string | null {
  const date = parseDate(value);
  return date ? date.toISOString() : null;
}
