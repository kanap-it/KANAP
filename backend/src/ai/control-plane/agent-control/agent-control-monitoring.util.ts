import { isRecord } from '../../../common/object-guards';
import { trimmedString } from './agent-control-util';
import type { DiagnosticHistorySummary } from './ai-diagnostic-brief-synthesis.service';
// Type-only: erased at compile time, so no runtime cycle with the service this came from.
import type { MonitoringAlertLike } from './ai-agent-control.service';

export const MAX_MONITORING_KNOWLEDGE_QUERIES = 2;
export const MAX_MONITORING_RELATED_ALERTS = 5;

/**
 * Monitoring alert history: summarising it, de-duplicating related alerts, and building the
 * knowledge retrieval queries for a monitoring diagnosis.
 *
 * Extracted verbatim from the module-level header of ai-agent-control.service.ts.
 */

export function summarizeMonitoringHistory(
  history: { metric?: unknown; unit?: unknown; windowMinutes?: unknown; points?: unknown } | null,
  fallbackWindowMinutes: number,
): DiagnosticHistorySummary | null {
  if (!history) {
    return null;
  }
  const points = Array.isArray(history.points) ? history.points.filter(isRecord) : [];
  const values = points
    .map((point) => ({
      timestamp: typeof point.timestamp === 'string' ? point.timestamp : null,
      value: Number(point.value),
    }))
    .filter((point) => Number.isFinite(point.value));
  const metric = typeof history.metric === 'string' && history.metric.trim() ? history.metric.trim() : 'value';
  const windowMinutes = Number.isFinite(Number(history.windowMinutes)) && Number(history.windowMinutes) > 0
    ? Number(history.windowMinutes)
    : fallbackWindowMinutes;
  const latest = values.length > 0 ? values[values.length - 1] : null;
  return {
    window_minutes: windowMinutes,
    channels: [{
      metric,
      unit: typeof history.unit === 'string' && history.unit.trim() ? history.unit.trim() : null,
      point_count: values.length,
      min: values.length > 0 ? Math.min(...values.map((point) => point.value)) : null,
      max: values.length > 0 ? Math.max(...values.map((point) => point.value)) : null,
      latest: latest ? latest.value : null,
      latest_at: latest ? latest.timestamp : null,
    }],
  };
}

export function compactRelatedMonitoringAlerts(
  alerts: unknown,
  excludeId: string,
): Array<{ id: string; status: string | null; severity: string | null; device_name: string | null; occurrence_started_at: string | null }> {
  if (!Array.isArray(alerts)) {
    return [];
  }
  return alerts
    .filter(isRecord)
    .map((entry) => ({
      id: trimmedString(entry.id) ?? '',
      status: trimmedString(entry.status),
      severity: trimmedString(entry.severity),
      device_name: trimmedString(entry.deviceName),
      occurrence_started_at: trimmedString(entry.occurrenceStartedAt),
    }))
    .filter((entry) => !!entry.id && entry.id !== excludeId)
    .slice(0, MAX_MONITORING_RELATED_ALERTS);
}

// Bounded, deterministic retrieval queries built from alert FACTS (device,
// metric, normalized status) — never from the untrusted alert message text.
export function buildMonitoringRetrievalQueryCandidates(
  alert: MonitoringAlertLike,
  historySummary: DiagnosticHistorySummary | null,
): string[] {
  const device = trimmedString(alert.deviceName);
  const rawMetric = historySummary?.channels[0]?.metric ?? null;
  const metric = rawMetric && rawMetric !== 'value' ? rawMetric : null;
  const status = trimmedString(alert.status);
  const candidates = [
    [device, metric, status].filter(Boolean).join(' ').trim(),
    [device ?? metric].filter(Boolean).join(' ').trim(),
  ].filter((query) => query.length > 0);
  return Array.from(new Set(candidates)).slice(0, MAX_MONITORING_KNOWLEDGE_QUERIES);
}
