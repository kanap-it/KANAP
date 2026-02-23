import api from '../api';

export interface WindowStats {
  totalRequests: number;
  statusClasses: { '2xx': number; '3xx': number; '4xx': number; '5xx': number };
  exact429: number;
  exact401: number;
  exact403: number;
  requestsPerMinute: number;
}

export interface AuthStats {
  loginAttempts: number;
  loginFailures: number;
  refreshAttempts: number;
  refreshFailures: number;
}

export interface RouteLatency {
  route: string;
  method: string;
  count: number;
  p50: number;
  p95: number;
  p99: number;
  avg: number;
}

export interface ErrorEntry {
  errorType: string;
  errorMessage: string;
  lastSeen: number;
  count: number;
  route: string;
}

export interface ProcessMetrics {
  uptimeSeconds: number;
  memoryMB: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  eventLoopLagMs: {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p99: number;
  };
  cpuUsage: {
    userMs: number;
    systemMs: number;
  };
}

export interface DbActivityStats {
  active: number;
  idle: number;
  idleInTransaction: number;
  waiting: number;
  total: number;
}

export interface DbDatabaseStats {
  xactCommit: number;
  xactRollback: number;
  deadlocks: number;
  conflictsSnapshot: number;
  tempFiles: number;
  tempBytes: number;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  maxPool: number;
  utilizationPct: number;
}

export interface DbMetricsSnapshot {
  activity: DbActivityStats;
  database: DbDatabaseStats;
  pool: PoolStats;
  collectedAt: number;
}

export interface OpsSnapshot {
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

export async function fetchOpsSnapshot(): Promise<OpsSnapshot> {
  const res = await api.get<OpsSnapshot>('/admin/ops/snapshot');
  return res.data;
}
