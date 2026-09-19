export type OpexListContextSnapshot = {
  sort: string;
  q: string;
  filters: string;
  /**
   * Status scope of the list the user navigated from. The grid holds it in local state,
   * so without persisting it here the item page cannot tell prev/next which scope to walk
   * and the item page falls back to the endpoint default (enabled only).
   */
  statusScope?: string;
};

const STORAGE_KEY = 'opex-list-context';

function isOpexListContextSnapshot(value: any): value is OpexListContextSnapshot {
  return value && typeof value === 'object'
    && typeof value.sort === 'string'
    && typeof value.q === 'string'
    && typeof value.filters === 'string'
    // Optional: snapshots written before this field existed stay valid.
    && (value.statusScope === undefined || typeof value.statusScope === 'string');
}

export function readStoredOpexListContext(): OpexListContextSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isOpexListContextSnapshot(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredOpexListContext(snapshot: OpexListContextSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore storage errors (quota, disabled storage, etc.)
  }
}
