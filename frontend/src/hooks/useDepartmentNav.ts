import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type DepartmentNavParams = ModuleItemNavParams;

/**
 * Department item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useDepartmentNav(params: DepartmentNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/departments/ids',
    queryKey: 'departments-ids',
    defaultSort: 'headcount_year:DESC',
  });
}

