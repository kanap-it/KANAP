import { Injectable } from '@nestjs/common';
import { monitorEventLoopDelay } from 'perf_hooks';

export interface RequestEntry {
  ts: number;
  method: string;
  route: string;
  statusCode: number;
  latencyMs: number;
  errorType?: string;
  errorMessage?: string;
}

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

const MAX_AGE_MS = 15 * 60_000; // 15 minutes
const PRUNE_INTERVAL_MS = 60_000; // prune every 60 seconds
const MAX_ROUTE_GROUPS = 30;
const MAX_ERROR_ENTRIES = 15;

@Injectable()
export class OpsMetricsStore {
  private entries: RequestEntry[] = [];
  private pruneTimer: ReturnType<typeof setInterval>;
  private eld: ReturnType<typeof monitorEventLoopDelay>;
  private startCpu = process.cpuUsage();

  constructor() {
    this.pruneTimer = setInterval(() => this.prune(), PRUNE_INTERVAL_MS);
    this.eld = monitorEventLoopDelay({ resolution: 20 });
    this.eld.enable();
  }

  record(entry: RequestEntry): void {
    this.entries.push(entry);
  }

  snapshot() {
    const now = Date.now();
    this.prune();

    const entries1m = this.entries.filter((e) => now - e.ts <= 60_000);
    const entries5m = this.entries.filter((e) => now - e.ts <= 5 * 60_000);
    const entries15m = this.entries;

    return {
      windows: {
        '1m': this.computeWindowStats(entries1m, 1),
        '5m': this.computeWindowStats(entries5m, 5),
        '15m': this.computeWindowStats(entries15m, 15),
      },
      auth: this.computeAuthStats(entries5m),
      topRoutes: this.computeRouteLatencies(entries5m),
      recentErrors: this.computeRecentErrors(entries15m),
      process: this.computeProcessMetrics(),
      collectedSince: this.entries.length > 0 ? this.entries[0].ts : now,
      totalEntriesInMemory: this.entries.length,
    };
  }

  private prune(): void {
    const cutoff = Date.now() - MAX_AGE_MS;
    // Binary-ish search: entries are chronologically ordered
    let i = 0;
    while (i < this.entries.length && this.entries[i].ts < cutoff) i++;
    if (i > 0) this.entries.splice(0, i);
  }

  private computeWindowStats(entries: RequestEntry[], windowMinutes: number): WindowStats {
    const statusClasses = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    let exact429 = 0;
    let exact401 = 0;
    let exact403 = 0;

    for (const e of entries) {
      const cls = Math.floor(e.statusCode / 100);
      if (cls === 2) statusClasses['2xx']++;
      else if (cls === 3) statusClasses['3xx']++;
      else if (cls === 4) statusClasses['4xx']++;
      else if (cls === 5) statusClasses['5xx']++;

      if (e.statusCode === 429) exact429++;
      if (e.statusCode === 401) exact401++;
      if (e.statusCode === 403) exact403++;
    }

    return {
      totalRequests: entries.length,
      statusClasses,
      exact429,
      exact401,
      exact403,
      requestsPerMinute: windowMinutes > 0 ? Math.round((entries.length / windowMinutes) * 10) / 10 : 0,
    };
  }

  private computeAuthStats(entries: RequestEntry[]): AuthStats {
    let loginAttempts = 0;
    let loginFailures = 0;
    let refreshAttempts = 0;
    let refreshFailures = 0;

    for (const e of entries) {
      if (e.route === '/auth/login' && e.method === 'POST') {
        loginAttempts++;
        if (e.statusCode >= 400) loginFailures++;
      }
      if (e.route === '/auth/refresh' && e.method === 'POST') {
        refreshAttempts++;
        if (e.statusCode >= 400) refreshFailures++;
      }
    }

    return { loginAttempts, loginFailures, refreshAttempts, refreshFailures };
  }

  private computeRouteLatencies(entries: RequestEntry[]): RouteLatency[] {
    const grouped = new Map<string, { method: string; latencies: number[] }>();

    for (const e of entries) {
      const key = `${e.method} ${e.route}`;
      let group = grouped.get(key);
      if (!group) {
        group = { method: e.method, latencies: [] };
        grouped.set(key, group);
      }
      group.latencies.push(e.latencyMs);
    }

    const results: RouteLatency[] = [];
    for (const [key, group] of grouped) {
      const route = key.slice(group.method.length + 1);
      const sorted = group.latencies.sort((a, b) => a - b);
      const len = sorted.length;
      results.push({
        route,
        method: group.method,
        count: len,
        p50: sorted[Math.floor(len * 0.5)] ?? 0,
        p95: sorted[Math.floor(len * 0.95)] ?? 0,
        p99: sorted[Math.floor(len * 0.99)] ?? 0,
        avg: Math.round((sorted.reduce((a, b) => a + b, 0) / len) * 10) / 10,
      });
    }

    // Sort by count descending, return top N
    results.sort((a, b) => b.count - a.count);
    return results.slice(0, MAX_ROUTE_GROUPS);
  }

  private computeRecentErrors(entries: RequestEntry[]): ErrorEntry[] {
    const errorMap = new Map<string, ErrorEntry>();

    for (const e of entries) {
      if (!e.errorType) continue;
      const key = `${e.errorType}:${e.errorMessage ?? ''}`;
      const existing = errorMap.get(key);
      if (existing) {
        existing.count++;
        if (e.ts > existing.lastSeen) {
          existing.lastSeen = e.ts;
          existing.route = `${e.method} ${e.route}`;
        }
      } else {
        errorMap.set(key, {
          errorType: e.errorType,
          errorMessage: (e.errorMessage ?? '').slice(0, 200),
          lastSeen: e.ts,
          count: 1,
          route: `${e.method} ${e.route}`,
        });
      }
    }

    const results = [...errorMap.values()];
    results.sort((a, b) => b.count - a.count);
    return results.slice(0, MAX_ERROR_ENTRIES);
  }

  private computeProcessMetrics(): ProcessMetrics {
    const mem = process.memoryUsage();
    const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 10) / 10;
    const nsToMs = (ns: number) => Math.round(ns / 1e6 * 100) / 100;

    const cpu = process.cpuUsage(this.startCpu);

    return {
      uptimeSeconds: Math.round(process.uptime()),
      memoryMB: {
        rss: toMB(mem.rss),
        heapUsed: toMB(mem.heapUsed),
        heapTotal: toMB(mem.heapTotal),
        external: toMB(mem.external),
      },
      eventLoopLagMs: {
        min: nsToMs(this.eld.min),
        max: nsToMs(this.eld.max),
        mean: nsToMs(this.eld.mean),
        p50: nsToMs(this.eld.percentile(50)),
        p99: nsToMs(this.eld.percentile(99)),
      },
      cpuUsage: {
        userMs: Math.round(cpu.user / 1000),
        systemMs: Math.round(cpu.system / 1000),
      },
    };
  }

  onModuleDestroy() {
    clearInterval(this.pruneTimer);
    this.eld.disable();
  }
}
