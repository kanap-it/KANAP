import { HttpException, HttpStatus, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

const TENANT_WINDOW_MS = 60_000;
const USER_WINDOW_MS = 3_600_000;
const CLEANUP_INTERVAL_MS = 300_000;

@Injectable()
export class AiBuiltinRateLimiter implements OnModuleInit, OnModuleDestroy {
  private readonly tenantWindows = new Map<string, number[]>();
  private readonly userWindows = new Map<string, number[]>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  onModuleInit() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  assertAllowed(
    tenantId: string,
    userId: string,
    limits: { tenantPerMinute: number; userPerHour: number },
  ) {
    const now = Date.now();
    const tenantEvents = this.prune(this.tenantWindows.get(tenantId) ?? [], now - TENANT_WINDOW_MS);
    if (tenantEvents.length >= limits.tenantPerMinute) {
      this.tenantWindows.set(tenantId, tenantEvents);
      throw new HttpException({
        code: 'RATE_LIMITED',
        message: 'Built-in AI rate limit exceeded for this tenant.',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const userKey = `${tenantId}:${userId}`;
    const userEvents = this.prune(this.userWindows.get(userKey) ?? [], now - USER_WINDOW_MS);
    if (userEvents.length >= limits.userPerHour) {
      this.userWindows.set(userKey, userEvents);
      throw new HttpException({
        code: 'RATE_LIMITED',
        message: 'Built-in AI rate limit exceeded for this user.',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    tenantEvents.push(now);
    userEvents.push(now);
    this.tenantWindows.set(tenantId, tenantEvents);
    this.userWindows.set(userKey, userEvents);
  }

  private prune(values: number[], minTs: number): number[] {
    return values.filter((value) => value >= minTs);
  }

  private cleanup() {
    const now = Date.now();
    for (const [tenantId, values] of this.tenantWindows.entries()) {
      const next = this.prune(values, now - TENANT_WINDOW_MS);
      if (next.length === 0) {
        this.tenantWindows.delete(tenantId);
      } else {
        this.tenantWindows.set(tenantId, next);
      }
    }

    for (const [userKey, values] of this.userWindows.entries()) {
      const next = this.prune(values, now - USER_WINDOW_MS);
      if (next.length === 0) {
        this.userWindows.delete(userKey);
      } else {
        this.userWindows.set(userKey, next);
      }
    }
  }
}
