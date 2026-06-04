// Pure detection of abnormal situations on a project phase, derived from the
// phase status/dates and its linked tasks. Kept framework-agnostic (no i18n, no
// React) so it can be reused — and later ported to the backend — unchanged.
//
// Dates are compared as ISO `YYYY-MM-DD` strings, which sort lexicographically.

export type PhaseAnomalyCode =
  | 'phase_completed_with_open_tasks'
  | 'phase_end_before_task_end'
  | 'phase_overdue';

export type PhaseAnomalySeverity = 'error' | 'warning';

export type PhaseAnomaly = {
  code: PhaseAnomalyCode;
  severity: PhaseAnomalySeverity;
};

type AnomalyPhase = {
  status?: string | null;
  planned_end?: string | null;
};

type AnomalyTask = {
  status?: string | null;
  due_date?: string | null;
};

// A task no longer "owes" anything once it is delivered or dropped.
const isClosedTask = (status?: string | null) => status === 'done' || status === 'cancelled';

export function computePhaseAnomalies(
  phase: AnomalyPhase,
  tasks: AnomalyTask[],
  todayYmd: string,
): PhaseAnomaly[] {
  const anomalies: PhaseAnomaly[] = [];
  const status = phase?.status || 'pending';
  const plannedEnd = phase?.planned_end || null;
  const phaseTasks = tasks || [];

  // Rule 1 — phase marked completed while tasks remain open: status incoherence.
  if (status === 'completed' && phaseTasks.some((task) => !isClosedTask(task.status))) {
    anomalies.push({ code: 'phase_completed_with_open_tasks', severity: 'error' });
  }

  // Rule 2 — a linked task is due after the phase's planned end: execution slip.
  // Cancelled tasks and tasks without a due date are ignored.
  if (
    plannedEnd
    && phaseTasks.some((task) => task.status !== 'cancelled' && task.due_date && task.due_date > plannedEnd)
  ) {
    anomalies.push({ code: 'phase_end_before_task_end', severity: 'warning' });
  }

  // Rule 3 — phase still open while its planned end is in the past: overdue.
  if (status !== 'completed' && plannedEnd && plannedEnd < todayYmd) {
    anomalies.push({ code: 'phase_overdue', severity: 'warning' });
  }

  return anomalies;
}
