import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export interface TemplateAccountNavParams extends Omit<ModuleItemNavParams, 'year'> {
  /** Template ID for the COA template */
  templateId: string;
}

/**
 * Template account item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 *
 * Note: This hook uses a dynamic endpoint based on templateId.
 */
export function useTemplateAccountNav(params: TemplateAccountNavParams): ModuleItemNavResult {
  const { templateId, ...baseParams } = params;

  return useModuleItemNav(baseParams, {
    endpoint: `/admin/coa-templates/${templateId}/accounts/ids`,
    queryKey: `admin-template-accounts-ids-${templateId}`,
    defaultSort: 'account_number:ASC',
  });
}

