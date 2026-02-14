import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type AnalyticsNavParams = ModuleItemNavParams;

/**
 * Analytics category item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useAnalyticsNav(params: AnalyticsNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/analytics-categories/ids',
    queryKey: 'analytics-ids',
    defaultSort: 'name:ASC',
  });
}

