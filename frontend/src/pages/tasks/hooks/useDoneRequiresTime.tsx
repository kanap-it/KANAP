import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../../api';
import TaskLogTimeDialog from '../components/TaskLogTimeDialog';

interface RunWithGuardArgs {
  taskId: string;
  /** Defined for project tasks, undefined for standalone tasks. */
  projectId?: string;
  isProjectTask: boolean;
  /** The status the user is trying to apply, if this patch changes status. */
  nextStatus?: string;
  /** The action that actually applies the change once allowed. */
  apply: () => void | Promise<void>;
}

/**
 * Project tasks cannot be marked "done" without logged time (backend invariant in
 * tasks-unified.service.ts). Instead of letting the user hit a raw error, this hook
 * intercepts a "done" status change on a project task with zero logged time and opens
 * the Log Time dialog. Cancelling leaves the status unchanged; logging time applies the
 * status change. Reuse the returned `dialog` node and `runWithGuard` at every status-change site.
 */
export function useDoneRequiresTime() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('portfolio');
  const [pending, setPending] = React.useState<
    { taskId: string; projectId?: string; apply: () => void | Promise<void> } | null
  >(null);

  const runWithGuard = React.useCallback(async (args: RunWithGuardArgs) => {
    const { taskId, projectId, isProjectTask, nextStatus, apply } = args;

    // Only "done" on a project task is constrained; everything else applies immediately.
    if (nextStatus !== 'done' || !isProjectTask) {
      await apply();
      return;
    }

    let total = 0;
    try {
      const endpoint = projectId
        ? `/portfolio/projects/${projectId}/tasks/${taskId}/time-entries/sum`
        : `/tasks/${taskId}/time-entries/sum`;
      const res = await api.get<{ total: number }>(endpoint);
      total = res.data.total;
    } catch {
      total = 0;
    }

    if (total > 0) {
      await apply();
      return;
    }

    setPending({ taskId, projectId, apply });
  }, []);

  const dialog = pending ? (
    <TaskLogTimeDialog
      open
      taskId={pending.taskId}
      projectId={pending.projectId}
      infoMessage={t('dialogs.logTime.statusChangeRequiresTime')}
      onClose={() => setPending(null)}
      onSuccess={() => {
        queryClient.invalidateQueries({ queryKey: ['task-time-entries-sum', pending.taskId] });
        void pending.apply();
      }}
    />
  ) : null;

  return { runWithGuard, dialog };
}
