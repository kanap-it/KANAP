import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type ContractNavParams = ModuleItemNavParams;

/**
 * Contract item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useContractNav(params: ContractNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/contracts/ids',
    queryKey: 'contracts-ids',
    defaultSort: 'created_at:DESC',
  });
}

