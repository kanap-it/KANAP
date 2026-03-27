import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { useTenant } from '../../../tenant/TenantContext';

const MAX_ITEMS = 5;

export type RecentEntityType =
  | 'project'
  | 'request'
  | 'application'
  | 'asset'
  | 'interface'
  | 'connection'
  | 'contract'
  | 'task'
  | 'spend_item'
  | 'capex_item';

export interface RecentItem {
  type: RecentEntityType;
  id: string;
  label: string;
  viewedAt: number;
}

function getStorageKey(tenantSlug: string, userId: string): string {
  return `kanap-recent-views:${tenantSlug}:${userId}`;
}

function loadFromStorage(storageKey: string): RecentItem[] {
  try {
    const stored = localStorage.getItem(storageKey);
    const parsed = stored ? (JSON.parse(stored) as RecentItem[]) : [];
    return parsed.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveToStorage(storageKey: string, items: RecentItem[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // localStorage full or unavailable - ignore
  }
}

export function useRecentlyViewed() {
  const { profile } = useAuth();
  const { tenantSlug } = useTenant();

  const userId = profile?.id ?? 'anon';
  const tenantId = tenantSlug ?? 'unknown';
  const storageKey = getStorageKey(tenantId, userId);

  const [items, setItems] = useState<RecentItem[]>(() => loadFromStorage(storageKey));

  // Reload items when tenant/user changes
  useEffect(() => {
    setItems(loadFromStorage(storageKey));
  }, [storageKey]);

  const addToRecent = useCallback(
    (type: RecentEntityType, id: string, label: string) => {
      setItems((prev) => {
        // Remove existing entry for the same item
        const filtered = prev.filter((r) => !(r.type === type && r.id === id));
        // Add new entry at the beginning
        const updated = [{ type, id, label, viewedAt: Date.now() }, ...filtered].slice(
          0,
          MAX_ITEMS,
        );
        saveToStorage(storageKey, updated);
        return updated;
      });
    },
    [storageKey],
  );

  const clearRecent = useCallback(() => {
    localStorage.removeItem(storageKey);
    setItems([]);
  }, [storageKey]);

  return { items, addToRecent, clearRecent };
}

// Mapping from entity type to route and permission resource
export const ENTITY_TYPE_CONFIG: Record<
  RecentEntityType,
  { route: (id: string) => string; resource: string; icon: string; label: string }
> = {
  project: {
    route: (id) => `/portfolio/projects/${id}`,
    resource: 'portfolio_projects',
    icon: 'FolderOpen',
    label: 'Project',
  },
  request: {
    route: (id) => `/portfolio/requests/${id}`,
    resource: 'portfolio_requests',
    icon: 'Inbox',
    label: 'Request',
  },
  application: {
    route: (id) => `/it/applications/${id}`,
    resource: 'applications',
    icon: 'Apps',
    label: 'Application',
  },
  asset: {
    route: (id) => `/it/assets/${id}`,
    resource: 'infrastructure',
    icon: 'Storage',
    label: 'Asset',
  },
  interface: {
    route: (id) => `/it/interfaces/${id}`,
    resource: 'applications',
    icon: 'SwapHoriz',
    label: 'Interface',
  },
  connection: {
    route: (id) => `/it/connections/${id}`,
    resource: 'infrastructure',
    icon: 'Cable',
    label: 'Connection',
  },
  contract: {
    route: (id) => `/ops/contracts/${id}`,
    resource: 'contracts',
    icon: 'Description',
    label: 'Contract',
  },
  task: {
    route: (id) => `/portfolio/tasks/${id}`,
    resource: 'tasks',
    icon: 'Task',
    label: 'Task',
  },
  spend_item: {
    route: (id) => `/ops/opex/${id}`,
    resource: 'spend',
    icon: 'Receipt',
    label: 'OPEX Item',
  },
  capex_item: {
    route: (id) => `/ops/capex/${id}`,
    resource: 'capex',
    icon: 'AccountBalance',
    label: 'CAPEX Item',
  },
};
