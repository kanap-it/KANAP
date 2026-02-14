export const metricKeys = ['budget', 'follow_up', 'landing', 'revision'] as const;
export type MetricKey = (typeof metricKeys)[number];

export const metricLabels: Record<MetricKey, string> = {
  budget: 'Budget',
  follow_up: 'Follow-up',
  landing: 'Landing',
  revision: 'Revision',
};

export function toMetricArray(value: unknown): MetricKey[] {
  const arr = Array.isArray(value) ? value : [value];
  const next: MetricKey[] = [];
  for (const item of arr) {
    if (metricKeys.includes(item as MetricKey)) next.push(item as MetricKey);
  }
  return next;
}

export function formatMetricList(metrics: readonly MetricKey[], separator = ', '): string {
  return metrics.map((key) => metricLabels[key]).join(separator);
}

export function formatMetricSelection(value: unknown, separator = ', '): string {
  return formatMetricList(toMetricArray(value), separator);
}
