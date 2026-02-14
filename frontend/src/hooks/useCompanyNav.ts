import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type CompanyNavParams = ModuleItemNavParams;

/**
 * Company item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useCompanyNav(params: CompanyNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/companies/ids',
    queryKey: 'companies-ids',
    defaultSort: 'headcount_year:DESC',
  });
}
