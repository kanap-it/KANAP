export type CapexListContextSnapshot = {
  sort: string;
  q: string;
  filters: string;
};

const STORAGE_KEY = 'capex-list-context';

function isCapexListContextSnapshot(value: any): value is CapexListContextSnapshot {
  return value && typeof value === 'object'
    && typeof value.sort === 'string'
    && typeof value.q === 'string'
    && typeof value.filters === 'string';
}

export function readStoredCapexListContext(): CapexListContextSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isCapexListContextSnapshot(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredCapexListContext(snapshot: CapexListContextSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors (quota, disabled storage, etc.)
  }
}
