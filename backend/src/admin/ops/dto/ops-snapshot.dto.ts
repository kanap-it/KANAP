import type { WindowStats, AuthStats, RouteLatency, ErrorEntry, ProcessMetrics } from '../ops-metrics.store';
import type { DbMetricsSnapshot } from '../db-metrics.service';

export interface OpsSnapshotDto {
  windows: {
    '1m': WindowStats;
    '5m': WindowStats;
    '15m': WindowStats;
  };
  auth: AuthStats;
  topRoutes: RouteLatency[];
  recentErrors: ErrorEntry[];
  process: ProcessMetrics;
  db: DbMetricsSnapshot;
  collectedSince: number;
  totalEntriesInMemory: number;
  generatedAt: number;
}
