import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { Application } from '../application.entity';

/**
 * Common options for service methods.
 */
export interface ServiceOpts {
  manager?: EntityManager;
}

/**
 * Base class with shared utilities for application services.
 */
export abstract class ApplicationsBaseService {
  constructor(protected readonly appRepo: Repository<Application>) {}

  protected getRepo(manager?: EntityManager): Repository<Application> {
    return manager ? manager.getRepository(Application) : this.appRepo;
  }

  protected getManager(opts?: ServiceOpts): EntityManager {
    return opts?.manager ?? this.appRepo.manager;
  }

  protected normalizeNullable(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text.length === 0 ? null : text;
  }

  protected ensureTenantId(tenantId?: string): string {
    const normalized = String(tenantId || '').trim();
    if (!normalized) {
      throw new BadRequestException('Tenant context is required');
    }
    return normalized;
  }

  protected parseBool(v: unknown): boolean {
    const s = String(v ?? '').trim().toLowerCase();
    return ['yes', 'true', '1', 'y', 't'].includes(s);
  }

  async ensureApp(id: string, manager?: EntityManager): Promise<Application> {
    const repo = this.getRepo(manager);
    const app = await repo.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  protected async resolveTenantId(manager: EntityManager): Promise<string> {
    const res = await manager.query(`SELECT current_setting('app.current_tenant', true) AS tenant_id`);
    const id = res?.[0]?.tenant_id;
    if (!id) throw new Error('Tenant not resolved');
    return id;
  }

  protected async getCurrentTenantId(manager: EntityManager): Promise<string> {
    const rows: Array<{ tenant_id: string }> = await manager.query(`SELECT app_current_tenant() AS tenant_id`);
    const tenantId = rows[0]?.tenant_id;
    if (!tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    return tenantId;
  }
}
