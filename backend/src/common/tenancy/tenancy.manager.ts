import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';
import { Request } from 'express';

/**
 * Tenant context resolved from the request host.
 */
export interface TenantContext {
  tenantId: string;
  tenantName: string;
  subdomain: string;
}

/**
 * TenancyManager is a request-scoped service that consolidates tenant context handling.
 * It manages:
 * - Resolving tenant from host header
 * - Setting and getting tenant context
 * - Creating and managing query runners with RLS context
 * - Transaction lifecycle (commit/rollback)
 */
@Injectable({ scope: Scope.REQUEST })
export class TenancyManager {
  private context: TenantContext | null = null;
  private queryRunner: QueryRunner | null = null;
  private transactionStarted = false;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   * Resolve tenant from the host header.
   * Extracts subdomain and looks up tenant in the database.
   * @param host The host header value (e.g., "acme.kanap.net:3000")
   * @returns TenantContext if found, null if no tenant subdomain or not found
   */
  async resolveFromHost(host: string): Promise<TenantContext | null> {
    const subdomain = this.extractSubdomain(host);
    if (!subdomain) {
      return null;
    }

    // Query tenant by slug (subdomain)
    const rows = await this.dataSource.query(
      'SELECT id, slug, name FROM tenants WHERE slug = $1 AND deleted_at IS NULL LIMIT 1',
      [subdomain],
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    const tenant = rows[0];
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      subdomain: tenant.slug,
    };
  }

  /**
   * Set the current tenant context.
   * @param context The tenant context to set
   */
  setContext(context: TenantContext | null): void {
    this.context = context;
  }

  /**
   * Get the current tenant context.
   * @returns The current tenant context or null if not set
   */
  getContext(): TenantContext | null {
    return this.context;
  }

  /**
   * Get the current tenant ID.
   * @returns The tenant ID or null if no context is set
   */
  getTenantId(): string | null {
    return this.context?.tenantId ?? null;
  }

  /**
   * Get or create a query runner with RLS context set.
   * If a query runner already exists, it will be reused.
   * @returns A QueryRunner with the tenant context set
   */
  async getQueryRunner(): Promise<QueryRunner> {
    if (this.queryRunner) {
      return this.queryRunner;
    }

    const tenantId = this.getTenantId();
    if (!tenantId) {
      throw new Error('Cannot create query runner: no tenant context set');
    }

    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
    this.transactionStarted = true;

    // CRITICAL: Use parameterized query to set tenant context
    await this.queryRunner.query(
      `SELECT set_config('app.current_tenant', $1, true)`,
      [tenantId],
    );

    return this.queryRunner;
  }

  /**
   * Get the EntityManager from the current query runner.
   * Creates a query runner if one doesn't exist.
   * @returns The EntityManager from the query runner
   */
  async getManager(): Promise<EntityManager> {
    const runner = await this.getQueryRunner();
    return runner.manager;
  }

  /**
   * Commit the current transaction.
   * Does nothing if no transaction is active.
   */
  async commit(): Promise<void> {
    if (!this.queryRunner || !this.transactionStarted) {
      return;
    }

    try {
      await this.queryRunner.commitTransaction();
    } finally {
      this.transactionStarted = false;
    }
  }

  /**
   * Rollback the current transaction.
   * Does nothing if no transaction is active.
   */
  async rollback(): Promise<void> {
    if (!this.queryRunner || !this.transactionStarted) {
      return;
    }

    try {
      await this.queryRunner.rollbackTransaction();
    } catch (error) {
      // Log but don't throw - rollback failures shouldn't mask the original error
      console.error('[TenancyManager] Rollback failed:', error);
    } finally {
      this.transactionStarted = false;
    }
  }

  /**
   * Release the query runner connection.
   * Should be called when the request completes.
   */
  async release(): Promise<void> {
    if (!this.queryRunner) {
      return;
    }

    try {
      if (this.transactionStarted) {
        // Rollback any uncommitted transaction
        await this.rollback();
      }
      if (!(this.queryRunner as any).isReleased) {
        await this.queryRunner.release();
      }
    } catch (error) {
      console.error('[TenancyManager] CRITICAL: Connection release failed:', error);
    } finally {
      this.queryRunner = null;
      this.transactionStarted = false;
    }
  }

  /**
   * Check if a query runner has been created and is active.
   */
  hasActiveRunner(): boolean {
    return this.queryRunner !== null && !(this.queryRunner as any).isReleased;
  }

  /**
   * Check if a transaction is currently active.
   */
  isTransactionActive(): boolean {
    return this.transactionStarted && this.hasActiveRunner();
  }

  /**
   * Execute a callback within a transaction.
   * Commits on success, rolls back on error.
   * @param callback The function to execute within the transaction
   * @returns The result of the callback
   */
  async executeInTransaction<T>(
    callback: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const manager = await this.getManager();
    try {
      const result = await callback(manager);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }

  /**
   * Extract the subdomain from a host string.
   * Handles various formats:
   * - *.lvh.me (development)
   * - *.dev.kanap.net (dev/local via tunnel)
   * - *.qa.kanap.net (QA)
   * - *.kanap.net (production)
   * @param host The host header value
   * @returns The subdomain or null if no tenant subdomain
   */
  private extractSubdomain(host: string): string | null {
    if (!host) {
      return null;
    }

    // Remove port if present
    const hostname = host.split(':')[0]?.toLowerCase() ?? '';
    if (!hostname) {
      return null;
    }

    // Dev: *.lvh.me
    if (hostname.endsWith('.lvh.me')) {
      const sub = hostname.replace('.lvh.me', '');
      if (sub === 'www' || sub === 'lvh' || !sub) {
        return null;
      }
      return sub;
    }

    // Dev (local via tunnel): *.dev.kanap.net (apex dev.kanap.net)
    if (hostname.endsWith('.dev.kanap.net')) {
      const sub = hostname.replace('.dev.kanap.net', '');
      if (!sub || sub === 'www') {
        return null;
      }
      return sub;
    }
    if (hostname === 'dev.kanap.net') {
      return null;
    }

    // QA: *.qa.kanap.net (apex qa.kanap.net)
    if (hostname.endsWith('.qa.kanap.net')) {
      const sub = hostname.replace('.qa.kanap.net', '');
      if (!sub || sub === 'www') {
        return null;
      }
      return sub;
    }
    if (hostname === 'qa.kanap.net') {
      return null;
    }

    // Prod: *.kanap.net (apex kanap.net/www)
    if (hostname.endsWith('.kanap.net')) {
      const sub = hostname.replace('.kanap.net', '');
      if (!sub || sub === 'www') {
        return null;
      }
      return sub;
    }
    if (hostname === 'kanap.net' || hostname === 'www.kanap.net') {
      return null;
    }

    return null;
  }
}
