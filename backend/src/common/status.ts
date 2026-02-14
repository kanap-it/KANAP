export enum StatusState {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
}

export const STATUS_STATES = [StatusState.ENABLED, StatusState.DISABLED] as const;

export type StatusStateValue = (typeof STATUS_STATES)[number];
export type DisabledAtInput = Date | string | number | null | undefined;

export function isEnabled(status: unknown): status is StatusState.ENABLED {
  return String(status).toLowerCase() === StatusState.ENABLED;
}

export function isDisabled(status: unknown): status is StatusState.DISABLED {
  return String(status).toLowerCase() === StatusState.DISABLED;
}

export function normalizeStatus(status: unknown): StatusState {
  return isDisabled(status) ? StatusState.DISABLED : StatusState.ENABLED;
}

export function coerceDisabledAt(value: DisabledAtInput): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value as any);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isActiveAt(disabledAt: DisabledAtInput, asOf: Date = new Date()): boolean {
  const disabledDate = coerceDisabledAt(disabledAt);
  if (!disabledDate) return true;
  return disabledDate.getTime() > asOf.getTime();
}

export function deriveStatusFromDisabledAt(disabledAt: DisabledAtInput, asOf: Date = new Date()): StatusState {
  return isActiveAt(disabledAt, asOf) ? StatusState.ENABLED : StatusState.DISABLED;
}

export function normalizeDisabledAtInput(value: DisabledAtInput): Date | null {
  const date = coerceDisabledAt(value);
  return date ? new Date(date) : null;
}

interface ResolveLifecycleArgs {
  currentDisabledAt?: Date | null;
  nextDisabledAt?: DisabledAtInput;
  nextStatus?: unknown;
  nowFactory?: () => Date;
}

export function resolveLifecycleState({
  currentDisabledAt = null,
  nextDisabledAt,
  nextStatus,
  nowFactory,
}: ResolveLifecycleArgs): { status: StatusState; disabled_at: Date | null } {
  const now = nowFactory ? nowFactory() : new Date();
  let disabledAt: Date | null;

  if (nextDisabledAt !== undefined) {
    disabledAt = normalizeDisabledAtInput(nextDisabledAt);
  } else if (nextStatus !== undefined) {
    const normalizedStatus = normalizeStatus(nextStatus);
    if (normalizedStatus === StatusState.ENABLED) {
      disabledAt = null;
    } else {
      disabledAt = currentDisabledAt ?? now;
    }
  } else {
    disabledAt = currentDisabledAt ? new Date(currentDisabledAt) : null;
  }

  const status = deriveStatusFromDisabledAt(disabledAt, now);
  return { status, disabled_at: disabledAt };
}
