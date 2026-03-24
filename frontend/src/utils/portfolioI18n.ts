import type { TFunction } from 'i18next';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
  type TaskStatus,
} from '../pages/tasks/task.constants';

export const PROJECT_STATUS_ORDER = [
  'waiting_list',
  'planned',
  'in_progress',
  'in_testing',
  'on_hold',
  'done',
  'cancelled',
] as const;

export const REQUEST_STATUS_ORDER = [
  'pending_review',
  'candidate',
  'approved',
  'on_hold',
  'rejected',
  'converted',
] as const;

export const DECISION_OUTCOME_ORDER = [
  'go',
  'no_go',
  'defer',
  'need_info',
  'analysis_complete',
] as const;

export const PHASE_STATUS_ORDER = [
  'pending',
  'in_progress',
  'completed',
] as const;

export const MILESTONE_STATUS_ORDER = [
  'pending',
  'achieved',
  'missed',
] as const;

export const FEASIBILITY_STATUS_ORDER = [
  'blocker',
  'major_concerns',
  'minor_concerns',
  'no_concerns',
  'not_assessed',
] as const;

const humanize = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export function getProjectStatusLabel(t: TFunction, status: string) {
  return t(`statuses.project.${status}`, { defaultValue: humanize(status) });
}

export function getRequestStatusLabel(t: TFunction, status: string) {
  return t(`statuses.request.${status}`, { defaultValue: humanize(status) });
}

export function getTaskStatusLabel(t: TFunction, status: string) {
  const defaultValue = TASK_STATUS_LABELS[status as TaskStatus] || humanize(status);
  return t(`statuses.task.${status}`, { defaultValue });
}

export function getDecisionOutcomeLabel(t: TFunction, outcome: string) {
  return t(`statuses.decisionOutcome.${outcome}`, { defaultValue: humanize(outcome) });
}

export function getPhaseStatusLabel(t: TFunction, status: string) {
  return t(`statuses.phase.${status}`, { defaultValue: humanize(status) });
}

export function getMilestoneStatusLabel(t: TFunction, status: string) {
  return t(`statuses.milestone.${status}`, { defaultValue: humanize(status) });
}

export function getFeasibilityStatusLabel(t: TFunction, status: string) {
  return t(`statuses.feasibility.${status}`, { defaultValue: humanize(status) });
}

export function getPriorityLabel(t: TFunction, priority: string) {
  return t(`priority.${priority}`, { defaultValue: humanize(priority) });
}

export function getProjectStatusOptions(t: TFunction) {
  return PROJECT_STATUS_ORDER.map((status) => ({
    value: status,
    label: getProjectStatusLabel(t, status),
  }));
}

export function getRequestStatusOptions(t: TFunction) {
  return REQUEST_STATUS_ORDER.map((status) => ({
    value: status,
    label: getRequestStatusLabel(t, status),
  }));
}

export function getTaskStatusOptions(t: TFunction) {
  return TASK_STATUS_OPTIONS.map((option) => ({
    ...option,
    label: getTaskStatusLabel(t, option.value),
  }));
}

export function getDecisionOutcomeOptions(t: TFunction) {
  return DECISION_OUTCOME_ORDER.map((outcome) => ({
    value: outcome,
    label: getDecisionOutcomeLabel(t, outcome),
  }));
}

export function formatRelativeTime(t: TFunction, dateStr: string, locale = 'en') {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('activity.relative.justNow');
  if (minutes < 60) return t('activity.relative.minutesAgo', { count: minutes });
  if (hours < 24) return t('activity.relative.hoursAgo', { count: hours });
  if (days < 7) return t('activity.relative.daysAgo', { count: days });

  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}
