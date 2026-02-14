import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTenant } from '../tenant/TenantContext';

type Scope = 'my' | 'team' | 'all';

function getStorageKey(tenantSlug: string, userId: string, pageKey: string): string {
  return `kanap-grid-scope:${tenantSlug}:${userId}:${pageKey}`;
}

/**
 * Persists the grid scope filter preference (my / team / all) per tenant and user.
 *
 * Priority: URL param > localStorage > default ('my').
 */
export function useGridScopePreference(
  pageKey: string,
  urlScope: string | null,
): [Scope, (scope: Scope) => void] {
  const { profile } = useAuth();
  const { tenantSlug } = useTenant();

  const userId = profile?.id ?? 'anon';
  const tenantId = tenantSlug ?? 'unknown';
  const storageKey = getStorageKey(tenantId, userId, pageKey);

  const readStored = useCallback((): Scope | null => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === 'my' || raw === 'team' || raw === 'all') return raw;
    } catch { /* ignore */ }
    return null;
  }, [storageKey]);

  const [scope, setScopeState] = useState<Scope>(() => {
    if (urlScope === 'my' || urlScope === 'team' || urlScope === 'all') return urlScope;
    return readStored() ?? 'my';
  });

  // Reload from localStorage when tenant/user changes
  useEffect(() => {
    const stored = readStored();
    setScopeState(stored ?? 'my');
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const setScope = useCallback(
    (next: Scope) => {
      setScopeState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch { /* ignore */ }
    },
    [storageKey],
  );

  return [scope, setScope];
}
