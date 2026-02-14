import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';

/**
 * Configuration for module item navigation (prev/next through list)
 */
export interface ModuleItemNavConfig {
  /** API endpoint to fetch IDs (e.g., '/spend-items/summary/ids') */
  endpoint: string;
  /** Query key prefix for caching (e.g., 'spend-items-summary-ids') */
  queryKey: string;
  /** Default sort order when none specified */
  defaultSort: string;
  /** Additional static params to include in API calls */
  extraParams?: Record<string, string | number | undefined>;
}

/**
 * Parameters for item navigation
 */
export interface ModuleItemNavParams {
  /** Current item ID */
  id: string;
  /** Sort order from URL */
  sort?: string | null;
  /** Search query from URL */
  q?: string | null;
  /** Filters JSON string from URL */
  filters?: string | null;
  /** Optional year parameter */
  year?: number | string | null;
  /** Additional dynamic params to include in API calls (e.g., assigneeUserId, teamId) */
  extraParams?: Record<string, string | number | undefined>;
}

/**
 * Return type for item navigation hook
 */
export interface ModuleItemNavResult {
  /** All IDs in the current list */
  ids: string[];
  /** Current item's index in the list */
  index: number;
  /** Total number of items */
  total: number;
  /** Whether there's a previous item */
  hasPrev: boolean;
  /** Whether there's a next item */
  hasNext: boolean;
  /** ID of previous item, or null */
  prevId: string | null;
  /** ID of next item, or null */
  nextId: string | null;
}

/**
 * Generic hook for item navigation (prev/next) within a module list.
 *
 * This hook fetches the list of IDs from the server and provides
 * prev/next navigation capabilities based on the current item's position.
 *
 * @example
 * ```typescript
 * // Create a module-specific hook
 * export function useOpexItemNav(params: ModuleItemNavParams) {
 *   return useModuleItemNav(params, {
 *     endpoint: '/spend-items/summary/ids',
 *     queryKey: 'spend-items-summary-ids',
 *     defaultSort: 'yBudget:DESC',
 *   });
 * }
 *
 * // Use in a component
 * const { hasPrev, hasNext, prevId, nextId, total, index } = useOpexItemNav({
 *   id: currentItemId,
 *   sort: searchParams.get('sort'),
 *   q: searchParams.get('q'),
 *   filters: searchParams.get('filters'),
 * });
 * ```
 */
export function useModuleItemNav(
  params: ModuleItemNavParams,
  config: ModuleItemNavConfig
): ModuleItemNavResult {
  const { id, sort, q, filters, year, extraParams: dynamicExtraParams } = params;
  const { endpoint, queryKey, defaultSort, extraParams: staticExtraParams } = config;

  const effectiveSort = sort || defaultSort;
  const effectiveQ = q || '';
  const effectiveFilters = filters || '';
  const effectiveYear = year ?? '';

  // Combine static config params with dynamic params from invocation
  const combinedExtraParams = { ...staticExtraParams, ...dynamicExtraParams };
  const extraParamsKey = JSON.stringify(combinedExtraParams);

  const { data } = useQuery({
    queryKey: [queryKey, effectiveSort, effectiveQ, effectiveFilters, effectiveYear, extraParamsKey],
    queryFn: async () => {
      const apiParams: Record<string, string | number | undefined> = {
        sort: effectiveSort,
        q: effectiveQ || undefined,
        filters: effectiveFilters || undefined,
        ...combinedExtraParams,
      };

      // Only include year if it's provided
      if (year !== null && year !== undefined && year !== '') {
        apiParams.year = year;
      }

      const res = await api.get<{ ids: string[] }>(endpoint, { params: apiParams });
      return res.data?.ids || [];
    },
    staleTime: 30_000,
  });

  const { index, hasPrev, hasNext, total } = useMemo(() => {
    const ids = data || [];
    const idx = Math.max(0, ids.indexOf(id));
    return {
      index: idx,
      hasPrev: idx > 0,
      hasNext: idx >= 0 && idx < ids.length - 1,
      total: ids.length,
    };
  }, [data, id]);

  const prevId = useMemo(() => {
    if (!data || !hasPrev) return null;
    return data[index - 1];
  }, [data, index, hasPrev]);

  const nextId = useMemo(() => {
    if (!data || !hasNext) return null;
    return data[index + 1];
  }, [data, index, hasNext]);

  return {
    ids: (data || []) as string[],
    index,
    total,
    hasPrev,
    hasNext,
    prevId,
    nextId,
  };
}

// ============================================================================
// Pre-configured module-specific hooks
// ============================================================================

/**
 * Spend/OPEX item navigation
 */
export function useSpendItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/spend-items/summary/ids',
    queryKey: 'spend-items-summary-ids',
    defaultSort: 'yBudget:DESC',
  });
}

/**
 * CAPEX item navigation
 */
export function useCapexItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/capex-items/summary/ids',
    queryKey: 'capex-items-summary-ids',
    defaultSort: 'yBudget:DESC',
  });
}

/**
 * Contract item navigation
 */
export function useContractItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/contracts/ids',
    queryKey: 'contracts-ids',
    defaultSort: 'created_at:DESC',
  });
}

/**
 * Supplier item navigation
 */
export function useSupplierItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/suppliers/ids',
    queryKey: 'suppliers-ids',
    defaultSort: 'name:ASC',
  });
}

/**
 * Company item navigation
 */
export function useCompanyItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/companies/ids',
    queryKey: 'companies-ids',
    defaultSort: 'headcount_year:DESC',
  });
}

/**
 * Department item navigation
 */
export function useDepartmentItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/departments/ids',
    queryKey: 'departments-ids',
    defaultSort: 'headcount_year:DESC',
  });
}

/**
 * Account item navigation
 */
export function useAccountItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/accounts/ids',
    queryKey: 'accounts-ids',
    defaultSort: 'account_number:ASC',
  });
}

/**
 * Analytics category item navigation
 */
export function useAnalyticsItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/analytics-categories/ids',
    queryKey: 'analytics-ids',
    defaultSort: 'name:ASC',
  });
}

/**
 * Task item navigation
 */
export function useTaskItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/tasks/ids',
    queryKey: 'tasks-ids',
    defaultSort: 'created_at:DESC',
  });
}

/**
 * Business process item navigation
 */
export function useBusinessProcessItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/business-processes/ids',
    queryKey: 'business-processes-ids',
    defaultSort: 'primary_category_name:ASC',
  });
}

/**
 * Portfolio request item navigation
 */
export function useRequestItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/portfolio/requests/ids',
    queryKey: 'portfolio-requests-ids',
    defaultSort: 'priority_score:DESC',
  });
}

/**
 * Portfolio project item navigation
 */
export function useProjectItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/portfolio/projects/ids',
    queryKey: 'portfolio-projects-ids',
    defaultSort: 'priority_score:DESC',
  });
}

/**
 * Asset item navigation
 */
export function useAssetItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/assets/ids',
    queryKey: 'assets-ids',
    defaultSort: 'name:ASC',
  });
}

/**
 * Application item navigation
 */
export function useApplicationItemNav(params: ModuleItemNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/applications/ids',
    queryKey: 'applications-ids',
    defaultSort: 'name:ASC',
  });
}
