import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type CapexNavParams = ModuleItemNavParams;

/**
 * CAPEX item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useCapexNav(params: CapexNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/capex-items/summary/ids',
    queryKey: 'capex-items-summary-ids',
    defaultSort: 'yBudget:DESC',
  });
}

