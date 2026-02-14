import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type RequestNavParams = ModuleItemNavParams;

/**
 * Portfolio request item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useRequestNav(params: RequestNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/portfolio/requests/ids',
    queryKey: 'portfolio-requests-ids',
    defaultSort: 'priority_score:DESC',
  });
}
