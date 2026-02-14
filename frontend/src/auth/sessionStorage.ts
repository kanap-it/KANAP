const REFRESH_TTL_KEY = 'refresh_ttl_ms';
const LAST_ACTIVITY_KEY = 'last_activity_at';

function readNumber(key: string): number | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const value = parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

export function getRefreshTtlMs(): number | null {
  return readNumber(REFRESH_TTL_KEY);
}

export function setRefreshTtlMs(ms: number | null | undefined): void {
  if (!ms || ms <= 0) {
    localStorage.removeItem(REFRESH_TTL_KEY);
    return;
  }
  localStorage.setItem(REFRESH_TTL_KEY, String(ms));
}

export function getLastActivityAt(): number | null {
  return readNumber(LAST_ACTIVITY_KEY);
}

export function setLastActivityAt(timestamp: number | null | undefined): void {
  if (!timestamp || timestamp <= 0) {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    return;
  }
  localStorage.setItem(LAST_ACTIVITY_KEY, String(timestamp));
}

export function touchLastActivity(): number {
  const now = Date.now();
  setLastActivityAt(now);
  return now;
}

export function getIdleDeadlineMs(): number | null {
  const last = getLastActivityAt();
  const ttl = getRefreshTtlMs();
  if (!last || !ttl) return null;
  return last + ttl;
}

export function isIdleExpired(now = Date.now()): boolean {
  const deadline = getIdleDeadlineMs();
  return deadline !== null && now >= deadline;
}

export function clearSessionActivity(): void {
  localStorage.removeItem(REFRESH_TTL_KEY);
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export const sessionStorageKeys = {
  refreshTtl: REFRESH_TTL_KEY,
  lastActivity: LAST_ACTIVITY_KEY,
};
