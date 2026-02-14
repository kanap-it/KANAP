import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type ProjectNavParams = ModuleItemNavParams;

/**
 * Portfolio project item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useProjectNav(params: ProjectNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/portfolio/projects/ids',
    queryKey: 'portfolio-projects-ids',
    defaultSort: 'priority_score:DESC',
  });
}
