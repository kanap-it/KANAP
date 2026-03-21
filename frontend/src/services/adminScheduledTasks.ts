import api from '../api';

export interface ScheduledTask {
  id: string;
  name: string;
  description: string | null;
  cron_expression: string;
  enabled: boolean;
  last_run_at: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTaskRun {
  id: string;
  task_name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  summary: Record<string, any> | null;
  error: string | null;
}

export async function fetchScheduledTasks(): Promise<ScheduledTask[]> {
  const res = await api.get<ScheduledTask[]>('/admin/scheduled-tasks');
  return res.data;
}

export async function updateScheduledTask(
  name: string,
  patch: { cron_expression?: string; enabled?: boolean },
): Promise<ScheduledTask> {
  const res = await api.patch<ScheduledTask>(`/admin/scheduled-tasks/${encodeURIComponent(name)}`, patch);
  return res.data;
}

export async function fetchTaskRuns(
  name: string,
  page = 1,
  limit = 20,
): Promise<{ runs: ScheduledTaskRun[]; total: number }> {
  const res = await api.get<{ runs: ScheduledTaskRun[]; total: number }>(
    `/admin/scheduled-tasks/${encodeURIComponent(name)}/runs`,
    { params: { page, limit } },
  );
  return res.data;
}

export async function triggerTask(name: string): Promise<{ message: string }> {
  const res = await api.post<{ message: string }>(`/admin/scheduled-tasks/${encodeURIComponent(name)}/trigger`);
  return res.data;
}
