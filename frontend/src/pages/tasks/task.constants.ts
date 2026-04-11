export type TaskStatus = 'open' | 'in_progress' | 'pending' | 'in_testing' | 'done' | 'cancelled';

export const TASK_STATUS_OPTIONS: Array<{ label: string; value: TaskStatus }> = [
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Testing', value: 'in_testing' },
  { label: 'Done', value: 'done' },
  { label: 'Cancelled', value: 'cancelled' },
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = Object.fromEntries(
  TASK_STATUS_OPTIONS.map((o) => [o.value, o.label]),
) as Record<TaskStatus, string>;

export const TASK_STATUS_COLORS: Record<
TaskStatus,
'default' | 'primary' | 'warning' | 'info' | 'secondary' | 'success' | 'error'
> = {
  open: 'default',
  in_progress: 'primary',
  pending: 'warning',
  in_testing: 'secondary',
  done: 'success',
  cancelled: 'error',
};

export const ACTIVE_TASK_STATUSES: TaskStatus[] = ['open', 'in_progress', 'pending', 'in_testing'];
