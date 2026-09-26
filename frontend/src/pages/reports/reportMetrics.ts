import type { TFunction } from 'i18next';

export const metricKeys = ['budget', 'follow_up', 'landing', 'revision'] as const;
export type MetricKey = (typeof metricKeys)[number];

/** Same wording as the budget tab of OPEX and CAPEX items (ops namespace). */
export const metricLabelKeys: Record<MetricKey, string> = {
  budget: 'ops:operations.budgetColumns.budget',
  follow_up: 'ops:operations.budgetColumns.followUp',
  landing: 'ops:operations.budgetColumns.landing',
  revision: 'ops:operations.budgetColumns.revision',
};

export function isMetricKey(value: unknown): value is MetricKey {
  return metricKeys.includes(value as MetricKey);
}

/** Translated label of a budget column, keyed by report metric. */
export function getMetricLabels(t: TFunction): Record<MetricKey, string> {
  return {
    budget: t(metricLabelKeys.budget),
    follow_up: t(metricLabelKeys.follow_up),
    landing: t(metricLabelKeys.landing),
    revision: t(metricLabelKeys.revision),
  };
}

/**
 * Height of a horizontal bar chart from its row count: one bar row per category plus
 * the title, axis and footnote, so a single department does not become a wall of colour.
 */
export function horizontalBarChartHeight(rowCount: number, minHeight = 180, maxHeight = 520): number {
  return Math.max(minHeight, Math.min(maxHeight, 120 + Math.max(rowCount, 1) * 44));
}
