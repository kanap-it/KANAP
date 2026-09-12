import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AllocationRule } from './allocation-rule.entity';
import { AuditService } from '../audit/audit.service';
import {
  AllocationMethod,
  isAllocationMethod,
  normalizeAllocationMethod,
} from './allocation-rule-resolver';

export type AllocationRuleResolution = {
  fiscal_year: number;
  /** Effective method for the year: the tenant override when set, the standard otherwise. */
  method: AllocationMethod;
  source: 'standard' | 'tenant';
  standard_method: AllocationMethod;
  tenant_method: AllocationMethod | null;
};

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    throw new BadRequestException('A valid fiscal year is required');
  }
}

@Injectable()
export class AllocationRulesService {
  constructor(
    @InjectRepository(AllocationRule) private readonly repo: Repository<AllocationRule>,
    private readonly audit: AuditService,
  ) {}

  /**
   * Loads the standard row plus the tenant override for one fiscal year.
   *
   * The RLS policy on `allocation_rules` already restricts reads to the global standard
   * rows and the current tenant's overrides; the explicit `tenant_id` predicate keeps
   * callers that run outside a tenant transaction isolated too.
   */
  private async loadRows(
    tenantId: string | null,
    year: number,
    opts?: { manager?: EntityManager },
  ): Promise<AllocationRule[]> {
    const manager = opts?.manager ?? this.repo.manager;
    const where: any[] = [{ fiscal_year: year, tenant_id: null }];
    if (tenantId) where.push({ fiscal_year: year, tenant_id: tenantId });
    return manager.getRepository(AllocationRule).find({ where } as any);
  }

  async resolve(
    tenantId: string | null,
    year: number,
    opts?: { manager?: EntityManager },
  ): Promise<AllocationRuleResolution> {
    assertYear(year);
    const rows = await this.loadRows(tenantId, year, opts);
    const standardRow = rows.find((row) => row.tenant_id == null) ?? null;
    const tenantRow = tenantId ? rows.find((row) => row.tenant_id === tenantId) ?? null : null;

    const standardMethod = normalizeAllocationMethod(standardRow?.method);
    const tenantMethod = tenantRow ? normalizeAllocationMethod(tenantRow.method) : null;

    return {
      fiscal_year: year,
      method: tenantMethod ?? standardMethod,
      source: tenantMethod ? 'tenant' : 'standard',
      standard_method: standardMethod,
      tenant_method: tenantMethod,
    };
  }

  /** Configures the tenant's default method for a fiscal year. */
  async setTenantMethod(
    tenantId: string | null,
    year: number,
    method: unknown,
    userId?: string | null,
    opts?: { manager?: EntityManager },
  ): Promise<AllocationRuleResolution> {
    if (!tenantId) {
      throw new BadRequestException('A tenant is required to configure the default allocation method');
    }
    assertYear(year);
    if (!isAllocationMethod(method)) {
      throw new BadRequestException('Invalid allocation method');
    }

    const manager = opts?.manager ?? this.repo.manager;
    const repo = manager.getRepository(AllocationRule);
    const existing = await repo.findOne({ where: { tenant_id: tenantId, fiscal_year: year } as any });

    const saved = existing
      ? await repo.save({ ...existing, method, status: 'active' } as AllocationRule)
      : await repo.save(repo.create({ tenant_id: tenantId, fiscal_year: year, method, status: 'active' }));

    await this.audit.log(
      {
        table: 'allocation_rules',
        recordId: saved.id,
        action: existing ? 'update' : 'create',
        before: existing ? { fiscal_year: year, method: existing.method, status: existing.status } : null,
        after: { fiscal_year: year, method: saved.method, status: saved.status },
        userId: userId ?? null,
      },
      { manager },
    );

    return this.resolve(tenantId, year, opts);
  }

  /** Drops the tenant override so the year falls back to the standard method. */
  async clearTenantMethod(
    tenantId: string | null,
    year: number,
    userId?: string | null,
    opts?: { manager?: EntityManager },
  ): Promise<AllocationRuleResolution> {
    if (!tenantId) {
      throw new BadRequestException('A tenant is required to configure the default allocation method');
    }
    assertYear(year);

    const manager = opts?.manager ?? this.repo.manager;
    const repo = manager.getRepository(AllocationRule);
    const existing = await repo.findOne({ where: { tenant_id: tenantId, fiscal_year: year } as any });

    if (existing) {
      await repo.delete({ id: existing.id } as any);
      await this.audit.log(
        {
          table: 'allocation_rules',
          recordId: existing.id,
          action: 'delete',
          before: { fiscal_year: year, method: existing.method, status: existing.status },
          after: null,
          userId: userId ?? null,
        },
        { manager },
      );
    }

    return this.resolve(tenantId, year, opts);
  }
}
