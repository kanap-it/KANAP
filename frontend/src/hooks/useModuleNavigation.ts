import { useMemo, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';

/**
 * Configuration for a module's navigation behavior
 */
export interface NavigationConfig<TFilters extends Record<string, unknown>> {
  /** Base path for the module (e.g., '/ops/opex', '/master-data/suppliers') */
  basePath: string;
  /** Default filter values when none are specified */
  defaultFilters?: Partial<TFilters>;
  /** Custom parameter names for routing */
  paramNames?: {
    /** Parameter name for item ID (default: 'id') */
    id?: string;
    /** Parameter name for tab (default: 'tab') */
    tab?: string;
  };
  /** Default tab when navigating to an item */
  defaultTab?: string;
}

/**
 * Return type for the useModuleNavigation hook
 */
export interface ModuleNavigation<TFilters extends Record<string, unknown>> {
  // Current state
  /** Current item ID from URL params, or null if on list page */
  currentId: string | null;
  /** Current tab from URL params, or null if not specified */
  currentTab: string | null;
  /** Current filters from URL search params */
  filters: TFilters;
  /** Whether currently viewing create page (id === 'new') */
  isCreate: boolean;

  // Navigation methods
  /** Navigate to the list page, optionally with filters */
  goToList: (filters?: Partial<TFilters>) => void;
  /** Navigate to a specific item, optionally to a specific tab */
  goToItem: (id: string, tab?: string) => void;
  /** Navigate to a different tab for the current item */
  goToTab: (tab: string) => void;
  /** Navigate to the create page */
  goToCreate: () => void;

  // Filter methods
  /** Update filters (merges with existing) */
  setFilters: (filters: Partial<TFilters>) => void;
  /** Clear all filters */
  clearFilters: () => void;

  // URL helpers
  /** Get URL for a specific item */
  getItemUrl: (id: string, tab?: string) => string;
  /** Get URL for the list page with optional filters */
  getListUrl: (filters?: Partial<TFilters>) => string;
  /** Get URL for create page */
  getCreateUrl: () => string;

  // Search params utilities
  /** Current search params string (for preserving context) */
  searchParamsString: string;
  /** Build URLSearchParams from current filters */
  buildSearchParams: (overrides?: Partial<TFilters>) => URLSearchParams;
}

/**
 * Parses search params into a filters object
 */
function parseFilters<TFilters extends Record<string, unknown>>(
  searchParams: URLSearchParams,
  defaultFilters?: Partial<TFilters>
): TFilters {
  const result: Record<string, unknown> = { ...defaultFilters };

  // Common filter keys that modules typically use
  const filterKeys = ['sort', 'q', 'filters', 'year', 'status'];

  filterKeys.forEach((key) => {
    const value = searchParams.get(key);
    if (value !== null) {
      result[key] = value;
    }
  });

  return result as TFilters;
}

/**
 * Builds search params from a filters object
 */
function buildSearchParamsFromFilters<TFilters extends Record<string, unknown>>(
  filters: Partial<TFilters>
): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return params;
}

/**
 * Generic navigation hook for module pages.
 *
 * Provides consistent navigation patterns across all modules:
 * - URL-based state management for filters
 * - Navigation methods for list, item, tab, and create views
 * - URL generation helpers for links
 *
 * @example
 * ```typescript
 * // In a module page
 * const nav = useModuleNavigation<OpexFilters>({
 *   basePath: '/ops/opex',
 *   defaultFilters: { sort: 'yBudget:DESC' },
 *   defaultTab: 'overview'
 * });
 *
 * // Navigate to an item
 * nav.goToItem('123', 'budget');
 *
 * // Update filters
 * nav.setFilters({ q: 'search term' });
 *
 * // Get URL for a link
 * const url = nav.getItemUrl('456', 'overview');
 * ```
 */
export function useModuleNavigation<TFilters extends Record<string, unknown> = Record<string, string | null>>(
  config: NavigationConfig<TFilters>
): ModuleNavigation<TFilters> {
  const { basePath, defaultFilters, paramNames, defaultTab } = config;
  const idParamName = paramNames?.id ?? 'id';
  const tabParamName = paramNames?.tab ?? 'tab';

  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Current state from URL
  const currentId = useMemo(() => {
    const id = params[idParamName];
    return id && id !== 'new' ? id : null;
  }, [params, idParamName]);

  const isCreate = useMemo(() => {
    return params[idParamName] === 'new';
  }, [params, idParamName]);

  const currentTab = useMemo(() => {
    return (params[tabParamName] as string) || null;
  }, [params, tabParamName]);

  const filters = useMemo(() => {
    return parseFilters<TFilters>(searchParams, defaultFilters);
  }, [searchParams, defaultFilters]);

  const searchParamsString = useMemo(() => {
    return searchParams.toString();
  }, [searchParams]);

  // Build search params with optional overrides
  const buildSearchParams = useCallback(
    (overrides?: Partial<TFilters>): URLSearchParams => {
      const merged = { ...filters, ...overrides };
      return buildSearchParamsFromFilters(merged);
    },
    [filters]
  );

  // Navigation methods
  const goToList = useCallback(
    (newFilters?: Partial<TFilters>) => {
      const params = newFilters ? buildSearchParamsFromFilters({ ...filters, ...newFilters }) : buildSearchParams();
      const qs = params.toString();
      navigate(`${basePath}${qs ? `?${qs}` : ''}`);
    },
    [navigate, basePath, filters, buildSearchParams]
  );

  const goToItem = useCallback(
    (id: string, tab?: string) => {
      const targetTab = tab ?? defaultTab ?? 'overview';
      const params = buildSearchParams();
      const qs = params.toString();
      navigate(`${basePath}/${id}/${targetTab}${qs ? `?${qs}` : ''}`);
    },
    [navigate, basePath, defaultTab, buildSearchParams]
  );

  const goToTab = useCallback(
    (tab: string) => {
      const id = currentId ?? params[idParamName];
      if (!id) return;
      const qs = searchParamsString;
      navigate(`${basePath}/${id}/${tab}${qs ? `?${qs}` : ''}`);
    },
    [navigate, basePath, currentId, params, idParamName, searchParamsString]
  );

  const goToCreate = useCallback(() => {
    const params = buildSearchParams();
    const qs = params.toString();
    navigate(`${basePath}/new${qs ? `?${qs}` : ''}`);
  }, [navigate, basePath, buildSearchParams]);

  // Filter methods
  const setFilters = useCallback(
    (newFilters: Partial<TFilters>) => {
      const merged = buildSearchParams(newFilters);
      setSearchParams(merged, { replace: true });
    },
    [buildSearchParams, setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // URL helpers
  const getListUrl = useCallback(
    (newFilters?: Partial<TFilters>): string => {
      const params = newFilters ? buildSearchParamsFromFilters({ ...filters, ...newFilters }) : buildSearchParams();
      const qs = params.toString();
      return `${basePath}${qs ? `?${qs}` : ''}`;
    },
    [basePath, filters, buildSearchParams]
  );

  const getItemUrl = useCallback(
    (id: string, tab?: string): string => {
      const targetTab = tab ?? defaultTab ?? 'overview';
      const params = buildSearchParams();
      const qs = params.toString();
      return `${basePath}/${id}/${targetTab}${qs ? `?${qs}` : ''}`;
    },
    [basePath, defaultTab, buildSearchParams]
  );

  const getCreateUrl = useCallback((): string => {
    const params = buildSearchParams();
    const qs = params.toString();
    return `${basePath}/new${qs ? `?${qs}` : ''}`;
  }, [basePath, buildSearchParams]);

  return {
    // Current state
    currentId,
    currentTab,
    filters,
    isCreate,

    // Navigation methods
    goToList,
    goToItem,
    goToTab,
    goToCreate,

    // Filter methods
    setFilters,
    clearFilters,

    // URL helpers
    getItemUrl,
    getListUrl,
    getCreateUrl,

    // Search params utilities
    searchParamsString,
    buildSearchParams,
  };
}
