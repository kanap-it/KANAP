import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type AccountNavParams = ModuleItemNavParams;

/**
 * Account item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useAccountNav(params: AccountNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/accounts/ids',
    queryKey: 'accounts-ids',
    defaultSort: 'account_number:ASC',
  });
}

