import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

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

const CACHE_TTL_MS = 10_000; // 10 seconds

@Injectable()
export class DbMetricsService {
  private cache: DbMetricsSnapshot | null = null;
  private cacheTime = 0;

  constructor(private readonly dataSource: DataSource) {}

  async snapshot(): Promise<DbMetricsSnapshot> {
    const now = Date.now();
    if (this.cache && now - this.cacheTime < CACHE_TTL_MS) {
      return this.cache;
    }

    const appName = process.env.DB_APP_NAME || 'cio-api';
    const [activity, database, pool] = await Promise.all([
      this.queryActivity(appName),
      this.queryDatabaseStats(),
      this.getPoolStats(),
    ]);

    this.cache = { activity, database, pool, collectedAt: now };
    this.cacheTime = now;
    return this.cache;
  }

  private async queryActivity(appName: string): Promise<DbActivityStats> {
    const rows: { state: string; cnt: string }[] = await this.dataSource.query(
      `SELECT state, count(*)::text AS cnt
       FROM pg_stat_activity
       WHERE application_name = $1 AND pid <> pg_backend_pid()
       GROUP BY state`,
      [appName],
    );

    const waitRow: { cnt: string }[] = await this.dataSource.query(
      `SELECT count(*)::text AS cnt
       FROM pg_stat_activity
       WHERE application_name = $1 AND pid <> pg_backend_pid() AND wait_event_type IS NOT NULL`,
      [appName],
    );

    let active = 0;
    let idle = 0;
    let idleInTransaction = 0;
    let total = 0;

    for (const r of rows) {
      const c = parseInt(r.cnt, 10);
      total += c;
      if (r.state === 'active') active = c;
      else if (r.state === 'idle') idle = c;
      else if (r.state === 'idle in transaction' || r.state === 'idle in transaction (aborted)') idleInTransaction += c;
    }

    return {
      active,
      idle,
      idleInTransaction,
      waiting: parseInt(waitRow?.[0]?.cnt ?? '0', 10),
      total,
    };
  }

  private async queryDatabaseStats(): Promise<DbDatabaseStats> {
    const rows: any[] = await this.dataSource.query(
      `SELECT xact_commit, xact_rollback, deadlocks, conflicts AS conflicts_snapshot,
              temp_files, temp_bytes
       FROM pg_stat_database
       WHERE datname = current_database()
       LIMIT 1`,
    );

    const r = rows?.[0];
    if (!r) {
      return { xactCommit: 0, xactRollback: 0, deadlocks: 0, conflictsSnapshot: 0, tempFiles: 0, tempBytes: 0 };
    }

    return {
      xactCommit: parseInt(r.xact_commit, 10) || 0,
      xactRollback: parseInt(r.xact_rollback, 10) || 0,
      deadlocks: parseInt(r.deadlocks, 10) || 0,
      conflictsSnapshot: parseInt(r.conflicts_snapshot, 10) || 0,
      tempFiles: parseInt(r.temp_files, 10) || 0,
      tempBytes: parseInt(r.temp_bytes, 10) || 0,
    };
  }

  private getPoolStats(): PoolStats {
    const maxPool = parseInt(process.env.DB_POOL_MAX || '20', 10);

    // Access the underlying pg.Pool from TypeORM's postgres driver
    const driver = (this.dataSource.driver as any);
    const pool = driver?.master ?? driver?.pool;

    if (pool && typeof pool.totalCount === 'number') {
      const totalCount = pool.totalCount as number;
      const idleCount = pool.idleCount as number;
      const waitingCount = pool.waitingCount as number;
      return {
        totalCount,
        idleCount,
        waitingCount,
        maxPool,
        utilizationPct: maxPool > 0 ? Math.round(((totalCount - idleCount) / maxPool) * 1000) / 10 : 0,
      };
    }

    // Fallback if pool not accessible
    return { totalCount: 0, idleCount: 0, waitingCount: 0, maxPool, utilizationPct: 0 };
  }
}
