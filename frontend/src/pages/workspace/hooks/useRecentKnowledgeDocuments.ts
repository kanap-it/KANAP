import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { useTenant } from '../../../tenant/TenantContext';

const MAX_ITEMS = 5;

export interface RecentKnowledgeDocument {
  id: string;
  label: string;
  viewedAt: number;
}

function getStorageKey(tenantSlug: string, userId: string): string {
  return `kanap-recent-knowledge-docs:${tenantSlug}:${userId}`;
}

function loadFromStorage(storageKey: string): RecentKnowledgeDocument[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as RecentKnowledgeDocument[]) : [];
    return parsed.slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function saveToStorage(storageKey: string, items: RecentKnowledgeDocument[]): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(items));
  } catch {
    // Ignore storage failures.
  }
}

export function useRecentKnowledgeDocuments() {
  const { profile } = useAuth();
  const { tenantSlug } = useTenant();

  const userId = profile?.id ?? 'anon';
  const scopedTenantSlug = tenantSlug ?? 'unknown';
  const storageKey = getStorageKey(scopedTenantSlug, userId);

  const [items, setItems] = useState<RecentKnowledgeDocument[]>(() => loadFromStorage(storageKey));

  useEffect(() => {
    setItems(loadFromStorage(storageKey));
  }, [storageKey]);

  const addDocument = useCallback((id: string, label: string) => {
    setItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const next = [{ id, label, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      saveToStorage(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return { items, addDocument };
}
