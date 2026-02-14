import { useModuleItemNav, ModuleItemNavParams, ModuleItemNavResult } from './useModuleItemNav';

export type TaskNavParams = ModuleItemNavParams;

/**
 * Task item navigation hook.
 * Thin wrapper around useModuleItemNav for backward compatibility.
 */
export function useTaskNav(params: TaskNavParams): ModuleItemNavResult {
  return useModuleItemNav(params, {
    endpoint: '/tasks/ids',
    queryKey: 'tasks-ids',
    defaultSort: 'created_at:DESC',
  });
}

