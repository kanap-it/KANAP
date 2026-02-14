import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { CapexAllocation } from './capex-allocation.entity';
import { CapexVersion } from './capex-version.entity';
import { AuditService } from '../audit/audit.service';
import { CapexAllocationCalculatorService } from './capex-allocation-calculator.service';
import { CompanyMetric } from '../companies/company-metric.entity';
import { Department } from '../departments/department.entity';
import { DepartmentMetric } from '../departments/department-metric.entity';

type AllocationInput = {
  company_id: string;
  department_id: string | null;
  allocation_pct?: number;
  driver_type?: string | null;
  driver_note?: string | null;
};

@Injectable()
export class CapexAllocationsService {
  constructor(
    @InjectRepository(CapexAllocation) private readonly repo: Repository<CapexAllocation>,
    @InjectRepository(CapexVersion) private readonly versions: Repository<CapexVersion>,
    private readonly calculator: CapexAllocationCalculatorService,
    private readonly audit: AuditService,
  ) {}

  async bulkUpsert(versionId: string, items: AllocationInput[], userId?: string, opts?: { manager?: EntityManager }) {
    const manager = opts?.manager ?? this.repo.manager;
    const repo = manager.getRepository(CapexAllocation);
    const versions = manager.getRepository(CapexVersion);
    if (!Array.isArray(items)) throw new BadRequestException('Invalid payload');

    const version = await versions.findOne({ where: { id: versionId } });
    if (!version) throw new BadRequestException('Invalid version');
    const method = (version as any).allocation_method ?? 'default';
    const driver = (version as any).allocation_driver ?? 'headcount';
    const tenantId = (version as any).tenant_id;

    const isManualCompany = method === 'manual_company';
    const isManualDept = method === 'manual_department';
    const isAuto = !isManualCompany && !isManualDept; // default/headcount/it_users/turnover

    if ((isManualCompany || isManualDept) && items.length === 0) {
      throw new BadRequestException('No allocations provided for manual method');
    }

    if (isAuto) {
      if (items.length > 0) {
        throw new BadRequestException('Automatic allocation methods do not accept manual rows. Save without overrides.');
      }

      const before = await repo.find({ where: { version_id: versionId } });
      if (before.length > 0) {
        await repo.delete({ version_id: versionId } as any);
      }

      const computation = await this.calculator.computeForVersions([version], { manager });
      const distribution = computation.get(versionId);
      const total = distribution?.shares.reduce((acc, share) => acc + Number(share.allocation_pct || 0), 0) ?? 0;

      await this.audit.log({
        table: 'capex_allocations',
        recordId: null,
        action: 'update',
        before,
        after: [],
        userId,
      }, { manager });

      return { updated: 0, total_pct: Math.round(total * 10000) / 10000 };
    }

    const before = await repo.find({ where: { version_id: versionId } });
    await repo.delete({ version_id: versionId } as any);

    let after: CapexAllocation[] = [];

    if (isManualCompany) {
      const uniqueCompanyIds = Array.from(new Set(items.map((row) => row.company_id).filter((id): id is string => !!id)));
      if (uniqueCompanyIds.length === 0) {
        throw new BadRequestException('Select at least one company for manual allocation.');
      }

      const computed = await this.computeManualCompanyDistribution({
        manager,
        tenantId,
        fiscalYear: (version as any).budget_year,
        companyIds: uniqueCompanyIds,
        driver: driver as 'headcount' | 'it_users' | 'turnover',
      });

      after = await repo.save(
        computed.map((row) =>
          repo.create({
            version_id: versionId,
            company_id: row.company_id,
            department_id: null,
            allocation_pct: row.allocation_pct,
            is_system_generated: false,
            rule_id: null,
            materialized_from: null,
            tenant_id: tenantId,
          }),
        ),
      );
    } else if (isManualDept) {
      const selections = items
        .filter((row) => row.company_id && row.department_id)
        .map((row) => ({ company_id: row.company_id, department_id: row.department_id as string }));

      if (selections.length === 0) {
        throw new BadRequestException('Select at least one department for manual allocation.');
      }

      const computed = await this.computeManualDepartmentDistribution({
        manager,
        tenantId,
        fiscalYear: (version as any).budget_year,
        selections,
      });

      after = await repo.save(
        computed.map((row) =>
          repo.create({
            version_id: versionId,
            company_id: row.company_id,
            department_id: row.department_id,
            allocation_pct: row.allocation_pct,
            is_system_generated: false,
            rule_id: null,
            materialized_from: null,
            tenant_id: tenantId,
          }),
        ),
      );
    }

    const finalTotal = after.reduce((acc, it) => acc + Number(it.allocation_pct || 0), 0);

    await this.audit.log({ table: 'capex_allocations', recordId: null, action: 'update', before, after, userId }, { manager });
    return { updated: after.length, total_pct: Math.round(finalTotal * 10000) / 10000 };
  }

  async listForVersion(versionId: string, opts?: { manager?: EntityManager }) {
    const manager = opts?.manager ?? this.repo.manager;
    const version = await manager.getRepository(CapexVersion).findOne({ where: { id: versionId } });
    if (!version) throw new BadRequestException('Invalid version');

    const computation = await this.calculator.computeForVersions([version], { manager });
    const dist = computation.get(versionId);
    const items = (dist?.shares ?? []).map((share) => ({
      id: share.allocation_id ?? null,
      company_id: share.company_id,
      department_id: share.department_id,
      allocation_pct: share.allocation_pct,
      source: share.source,
    }));
    const total = items.reduce((acc, it) => acc + Number(it.allocation_pct || 0), 0);

    return {
      items,
      total_pct: Math.round(total * 10000) / 10000,
      resolved_method: dist?.resolvedMethod ?? null,
    };
  }

  private async computeManualCompanyDistribution(args: {
    manager: EntityManager;
    tenantId: string;
    fiscalYear: number;
    companyIds: string[];
    driver: 'headcount' | 'it_users' | 'turnover';
  }): Promise<Array<{ company_id: string; allocation_pct: number }>> {
    const { manager, tenantId, fiscalYear, companyIds, driver } = args;
    const metricRepo = manager.getRepository(CompanyMetric);

    const metrics = await metricRepo.find({
      where: {
        tenant_id: tenantId,
        fiscal_year: fiscalYear,
        company_id: In(companyIds) as any,
      } as any,
    });

    const weights = companyIds.map((companyId) => {
      const metric = metrics.find((m) => m.company_id === companyId);
      let weight = 0;
      if (driver === 'headcount') weight = Number(metric?.headcount ?? 0);
      else if (driver === 'it_users') weight = Number(metric?.it_users ?? 0);
      else weight = Number(metric?.turnover ?? 0);
      return { id: companyId, weight };
    });

    if (weights.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)) {
      throw new BadRequestException(`Provide ${driver.replace('_', ' ')} values for the selected companies.`);
    }

    const distribution = this.normalizeWeights(weights);
    return distribution.map(({ id, pct }) => ({ company_id: id, allocation_pct: pct }));
  }

  private async computeManualDepartmentDistribution(args: {
    manager: EntityManager;
    tenantId: string;
    fiscalYear: number;
    selections: Array<{ company_id: string; department_id: string }>;
  }): Promise<Array<{ company_id: string; department_id: string; allocation_pct: number }>> {
    const { manager, tenantId, fiscalYear, selections } = args;
    const uniqueDeptIds = Array.from(new Set(selections.map((s) => s.department_id)));

    const departments = await manager.getRepository(Department).find({
      where: {
        tenant_id: tenantId,
        id: In(uniqueDeptIds) as any,
      } as any,
    });
    if (departments.length !== uniqueDeptIds.length) {
      throw new BadRequestException('Some departments could not be found for manual allocation.');
    }

    const metrics = await manager.getRepository(DepartmentMetric).find({
      where: {
        tenant_id: tenantId,
        fiscal_year: fiscalYear,
        department_id: In(uniqueDeptIds) as any,
      } as any,
    });

    const weights = uniqueDeptIds.map((deptId) => {
      const metric = metrics.find((m) => m.department_id === deptId);
      return { id: deptId, weight: Number(metric?.headcount ?? 0) };
    });

    if (weights.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)) {
      throw new BadRequestException('Provide headcount values for the selected departments.');
    }

    const distribution = this.normalizeWeights(weights);
    return distribution.map(({ id, pct }) => {
      const department = departments.find((d) => d.id === id)!;
      const provided = selections.find((s) => s.department_id === id);
      if (provided?.company_id && provided.company_id !== department.company_id) {
        throw new BadRequestException('Department does not belong to the selected company.');
      }
      return {
        company_id: department.company_id,
        department_id: id,
        allocation_pct: pct,
      };
    });
  }

  private normalizeWeights(weights: Array<{ id: string; weight: number }>): Array<{ id: string; pct: number }> {
    const total = weights.reduce((acc, entry) => acc + entry.weight, 0);
    if (!Number.isFinite(total) || total <= 0) {
      throw new BadRequestException('Allocation source values must sum to a positive amount.');
    }

    let running = 0;
    return weights.map((entry, idx) => {
      let pct = Number(((entry.weight * 100) / total).toFixed(4));
      if (idx === weights.length - 1) {
        const diff = Number((100 - (running + pct)).toFixed(4));
        pct = Number((pct + diff).toFixed(4));
      }
      running += pct;
      return { id: entry.id, pct };
    });
  }
}
