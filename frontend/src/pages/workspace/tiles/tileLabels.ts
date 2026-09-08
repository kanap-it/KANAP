import type { TFunction } from 'i18next';

const humanize = (value: string) => value.replace(/_/g, ' ');

/** Project status label from the portfolio namespace, falling back to a humanized code for unknown values. */
export const projectStatusLabel = (t: TFunction, status: string | null | undefined): string =>
  status ? t(`portfolio:statuses.project.${status}`, { defaultValue: humanize(status) }) : t('common:labels.unknown');

export const taskStatusLabel = (t: TFunction, status: string | null | undefined): string =>
  status ? t(`portfolio:statuses.task.${status}`, { defaultValue: humanize(status) }) : t('common:labels.unknown');

export const taskPriorityLabel = (t: TFunction, priority: string | null | undefined): string =>
  priority ? t(`portfolio:priority.${priority}`, { defaultValue: humanize(priority) }) : '';
