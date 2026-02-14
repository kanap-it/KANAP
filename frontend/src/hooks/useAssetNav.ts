import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type AssetNavParams = ModuleItemNavParams;

/**
 * Asset item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useAssetNav(params: AssetNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/assets/ids',
    queryKey: 'assets-ids',
    defaultSort: 'name:ASC',
  });
}
