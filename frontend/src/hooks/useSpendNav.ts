import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type SpendNavParams = ModuleItemNavParams;

/**
 * Spend/OPEX item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useSpendNav(params: SpendNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/spend-items/summary/ids',
    queryKey: 'spend-items-summary-ids',
    defaultSort: 'yBudget:DESC',
  });
}

