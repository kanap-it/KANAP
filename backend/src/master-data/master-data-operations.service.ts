import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { Company } from '../companies/company.entity';
import { CompanyMetric } from '../companies/company-metric.entity';
import { Department } from '../departments/department.entity';
import { DepartmentMetric } from '../departments/department-metric.entity';
import { CompanyMetricsService } from '../companies/company-metrics.service';
import { DepartmentMetricsService } from '../departments/department-metrics.service';
import { FreezeService } from '../freeze/freeze.service';
import { PermissionsService, PermissionLevel } from '../permissions/permissions.service';
import { UsersService } from '../users/users.service';

const COMPANY_METRIC_KEYS = ['headcount', 'it_users', 'turnover'] as const;
export type CompanyMetricKey = typeof COMPANY_METRIC_KEYS[number];

type MasterDataCopyRequest = {
  sourceYear: number;
  destinationYear: number;
  includeCompanies: boolean;
  includeDepartments: boolean;
  companyMetrics: string[];
  dryRun: boolean;
  userId: string | null;
};

type MasterDataCopyResultItem = {
  entityType: 'company' | 'department';
  entityId: string;
  entityName: string;
  metric: CompanyMetricKey | 'headcount';
  sourceValue: number | null;
  destinationValue: number | null;
  newValue: number | null;
  skipped: boolean;
  reason?: string;
};

type MasterDataCopyError = {
  entityType: 'company' | 'department';
  entityId: string;
  entityName: string;
  message: string;
};

type MasterDataCopyResponse = {
  success: boolean;
  dryRun: boolean;
  summary: {
    totalItems: number;
    processed: number;
    skipped: number;
    errors: number;
  };
  results: MasterDataCopyResultItem[];
  errors: MasterDataCopyError[];
};

const RANK: Record<PermissionLevel, number> = { reader: 1, contributor: 2, member: 3, admin: 4 };

function toNumber(value: any): number | null {
  if (value == null) return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function toInt(value: any): number {
  const num = Math.round(Number(value ?? 0));
  if (!Number.isFinite(num) || num < 0) return 0;
  return num;
}

function getCompanyMetricValue(row: CompanyMetric | undefined, metric: CompanyMetricKey) {
  if (!row) return null;
  if (metric === 'headcount') return row.headcount;
  if (metric === 'it_users') return row.it_users;
  return row.turnover;
}

@Injectable()
export class MasterDataOperationsService {
  constructor(
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyMetric) private readonly companyMetricRepo: Repository<CompanyMetric>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
    @InjectRepository(DepartmentMetric) private readonly departmentMetricRepo: Repository<DepartmentMetric>,
    private readonly companyMetricsService: CompanyMetricsService,
    private readonly departmentMetricsService: DepartmentMetricsService,
    private readonly freeze: FreezeService,
    private readonly permissions: PermissionsService,
    private readonly users: UsersService,
  ) {}

  private manager(opts?: { manager?: EntityManager }) {
    return opts?.manager ?? this.companyRepo.manager;
  }

  private ensureYears(year: number, label: string) {
    if (!Number.isInteger(year)) {
      throw new BadRequestException(`${label} must be an integer year`);
    }
  }

  private levelAtLeast(current: PermissionLevel | undefined, required: PermissionLevel) {
    if (!current) return false;
    return (RANK[current] ?? 0) >= RANK[required];
  }

  async copyMasterData(params: MasterDataCopyRequest, opts?: { manager?: EntityManager }): Promise<MasterDataCopyResponse> {
    const manager = this.manager(opts);
    const { sourceYear, destinationYear, includeCompanies, includeDepartments, companyMetrics, dryRun, userId } = params;

    this.ensureYears(sourceYear, 'sourceYear');
    this.ensureYears(destinationYear, 'destinationYear');

    if (!includeCompanies && !includeDepartments) {
      throw new BadRequestException('At least one data source must be selected');
    }

    const rawMetrics = Array.isArray(companyMetrics) ? companyMetrics : [];
    const companyMetricSet = new Set<CompanyMetricKey>();
    for (const raw of rawMetrics) {
      const key = String(raw) as CompanyMetricKey;
      if (!COMPANY_METRIC_KEYS.includes(key)) {
        throw new BadRequestException(`Unsupported company metric '${raw}'`);
      }
      companyMetricSet.add(key);
    }
    if (includeCompanies && companyMetricSet.size === 0) {
      throw new BadRequestException('Select at least one company metric to copy');
    }

    if (!userId) {
      throw new ForbiddenException('User context is required');
    }

    const user = await this.users.findById(userId, { manager });
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    const perms = await this.permissions.listForRole(user.role_id, { manager });
    const hasBudgetOpsAdmin = this.levelAtLeast(perms.get('budget_ops'), 'admin');
    const hasCompanyAdmin = this.levelAtLeast(perms.get('companies'), 'admin') || hasBudgetOpsAdmin;
    const hasDepartmentAdmin = this.levelAtLeast(perms.get('departments'), 'admin') || hasBudgetOpsAdmin;

    if (includeCompanies && !hasCompanyAdmin) {
      throw new ForbiddenException('You need Companies admin permissions to copy company metrics');
    }
    if (includeDepartments && !hasDepartmentAdmin) {
      throw new ForbiddenException('You need Departments admin permissions to copy department metrics');
    }

    if (includeCompanies) {
      await this.freeze.assertNotFrozen({ scope: 'companies', year: destinationYear, action: 'Copy' }, { manager });
    }
    if (includeDepartments) {
      await this.freeze.assertNotFrozen({ scope: 'departments', year: destinationYear, action: 'Copy' }, { manager });
    }

    if (dryRun) {
      return this.processCopy({
        manager,
        sourceYear,
        destinationYear,
        includeCompanies,
        includeDepartments,
        companyMetricSet,
        applyChanges: false,
        userId,
      });
    }

    return manager.transaction((trx) => this.processCopy({
      manager: trx,
      sourceYear,
      destinationYear,
      includeCompanies,
      includeDepartments,
      companyMetricSet,
      applyChanges: true,
      userId,
    }));
  }

  private async processCopy(params: {
    manager: EntityManager;
    sourceYear: number;
    destinationYear: number;
    includeCompanies: boolean;
    includeDepartments: boolean;
    companyMetricSet: Set<CompanyMetricKey>;
    applyChanges: boolean;
    userId: string | null;
  }): Promise<MasterDataCopyResponse> {
    const { manager, sourceYear, destinationYear, includeCompanies, includeDepartments, companyMetricSet, applyChanges, userId } = params;

    const results: MasterDataCopyResultItem[] = [];
    const errors: MasterDataCopyError[] = [];
    let processed = 0;
    let skipped = 0;

    if (includeCompanies) {
      const companyMetricRepository = manager.getRepository(CompanyMetric);
      const sourceMetrics = await companyMetricRepository.find({ where: { fiscal_year: sourceYear } as any });
      const destinationMetrics = await companyMetricRepository.find({ where: { fiscal_year: destinationYear } as any });
      const sourceMap = new Map<string, CompanyMetric>();
      for (const row of sourceMetrics) sourceMap.set(row.company_id, row);
      const destinationMap = new Map<string, CompanyMetric>();
      for (const row of destinationMetrics) destinationMap.set(row.company_id, row);

      const companyIds = Array.from(new Set([...sourceMap.keys(), ...destinationMap.keys()]));
      if (companyIds.length > 0) {
        const companies = await manager.getRepository(Company).find({ where: { id: In(companyIds) } });
        const companyNameMap = new Map<string, string>();
        for (const company of companies) {
          companyNameMap.set(company.id, company.name);
        }
        const sortedIds = [...companyIds].sort((a, b) => {
          const nameA = (companyNameMap.get(a) ?? '').toLowerCase();
          const nameB = (companyNameMap.get(b) ?? '').toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        for (const companyId of sortedIds) {
          const companyName = companyNameMap.get(companyId) ?? 'Unknown company';
          const source = sourceMap.get(companyId);
          const destination = destinationMap.get(companyId);

          if (!source) {
            for (const metric of companyMetricSet) {
              results.push({
                entityType: 'company',
                entityId: companyId,
                entityName: companyName,
                metric,
                sourceValue: null,
                destinationValue: toNumber(getCompanyMetricValue(destination, metric)) ?? null,
                newValue: null,
                skipped: true,
                reason: 'No data for source year',
              });
              skipped += 1;
            }
            continue;
          }

          const nextHeadcount = companyMetricSet.has('headcount')
            ? toInt(source.headcount)
            : toInt(destination?.headcount ?? source.headcount);
          const nextItUsers = companyMetricSet.has('it_users')
            ? (source.it_users != null ? toInt(source.it_users) : null)
            : (destination?.it_users != null ? toInt(destination.it_users) : null);
          const nextTurnover = companyMetricSet.has('turnover')
            ? (source.turnover != null ? toNumber(source.turnover) : null)
            : (destination?.turnover != null ? toNumber(destination.turnover) : null);

          if (applyChanges) {
            try {
              await this.companyMetricsService.upsertForCompany(companyId, destinationYear, {
                headcount: nextHeadcount,
                it_users: nextItUsers,
                turnover: nextTurnover,
              }, userId ?? undefined, { manager });
            } catch (err: any) {
              errors.push({ entityType: 'company', entityId: companyId, entityName: companyName, message: err?.message ?? 'Unable to copy metrics' });
              for (const metric of companyMetricSet) {
                results.push({
                  entityType: 'company',
                  entityId: companyId,
                  entityName: companyName,
                  metric,
                  sourceValue: toNumber(getCompanyMetricValue(source, metric)) ?? null,
                  destinationValue: toNumber(getCompanyMetricValue(destination, metric)) ?? null,
                  newValue: null,
                  skipped: true,
                  reason: 'Failed to copy metrics',
                });
                skipped += 1;
              }
              continue;
            }
          }

          for (const metric of companyMetricSet) {
            const sourceValue = toNumber(getCompanyMetricValue(source, metric)) ?? null;
            const destinationValue = toNumber(getCompanyMetricValue(destination, metric)) ?? null;
            let newValue: number | null = destinationValue;
            if (metric === 'headcount') newValue = nextHeadcount;
            if (metric === 'it_users') newValue = nextItUsers;
            if (metric === 'turnover') newValue = nextTurnover;
            results.push({
              entityType: 'company',
              entityId: companyId,
              entityName: companyName,
              metric,
              sourceValue,
              destinationValue,
              newValue,
              skipped: false,
            });
            processed += 1;
          }
        }
      }
    }

    if (includeDepartments) {
      const departmentMetricRepository = manager.getRepository(DepartmentMetric);
      const sourceMetrics = await departmentMetricRepository.find({ where: { fiscal_year: sourceYear } as any });
      const destinationMetrics = await departmentMetricRepository.find({ where: { fiscal_year: destinationYear } as any });
      const sourceMap = new Map<string, DepartmentMetric>();
      for (const row of sourceMetrics) sourceMap.set(row.department_id, row);
      const destinationMap = new Map<string, DepartmentMetric>();
      for (const row of destinationMetrics) destinationMap.set(row.department_id, row);

      const departmentIds = Array.from(new Set([...sourceMap.keys(), ...destinationMap.keys()]));
      if (departmentIds.length > 0) {
        const departments = await manager.getRepository(Department).find({
          where: { id: In(departmentIds) },
          relations: ['company'],
        });
        const departmentNameMap = new Map<string, string>();
        for (const dept of departments) {
          const label = dept.company ? `${dept.name} (${dept.company.name})` : dept.name;
          departmentNameMap.set(dept.id, label);
        }
        const sortedIds = [...departmentIds].sort((a, b) => {
          const nameA = (departmentNameMap.get(a) ?? '').toLowerCase();
          const nameB = (departmentNameMap.get(b) ?? '').toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        for (const departmentId of sortedIds) {
          const deptName = departmentNameMap.get(departmentId) ?? 'Unknown department';
          const source = sourceMap.get(departmentId);
          const destination = destinationMap.get(departmentId);

          if (!source) {
            results.push({
              entityType: 'department',
              entityId: departmentId,
              entityName: deptName,
              metric: 'headcount',
              sourceValue: null,
              destinationValue: toNumber(destination?.headcount) ?? null,
              newValue: null,
              skipped: true,
              reason: 'No data for source year',
            });
            skipped += 1;
            continue;
          }

          const nextHeadcount = toInt(source.headcount);

          if (applyChanges) {
            try {
              await this.departmentMetricsService.upsertForDepartment(departmentId, destinationYear, {
                headcount: nextHeadcount,
              }, userId ?? undefined, { manager });
            } catch (err: any) {
              errors.push({ entityType: 'department', entityId: departmentId, entityName: deptName, message: err?.message ?? 'Unable to copy metrics' });
              results.push({
                entityType: 'department',
                entityId: departmentId,
                entityName: deptName,
                metric: 'headcount',
                sourceValue: toNumber(source.headcount) ?? null,
                destinationValue: toNumber(destination?.headcount) ?? null,
                newValue: null,
                skipped: true,
                reason: 'Failed to copy metrics',
              });
              skipped += 1;
              continue;
            }
          }

          results.push({
            entityType: 'department',
            entityId: departmentId,
            entityName: deptName,
            metric: 'headcount',
            sourceValue: toNumber(source.headcount) ?? null,
            destinationValue: toNumber(destination?.headcount) ?? null,
            newValue: nextHeadcount,
            skipped: false,
          });
          processed += 1;
        }
      }
    }

    const totalItems = results.length;
    return {
      success: errors.length === 0,
      dryRun: !applyChanges,
      summary: {
        totalItems,
        processed,
        skipped,
        errors: errors.length,
      },
      results,
      errors,
    };
  }
}
