import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type ApplicationNavParams = ModuleItemNavParams;

/**
 * Application item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useApplicationNav(params: ApplicationNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/applications/ids',
    queryKey: 'applications-ids',
    defaultSort: 'name:ASC',
  });
}
