import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type SupplierNavParams = ModuleItemNavParams;

/**
 * Supplier item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useSupplierNav(params: SupplierNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/suppliers/ids',
    queryKey: 'suppliers-ids',
    defaultSort: 'name:ASC',
  });
}

