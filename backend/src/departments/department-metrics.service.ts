import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { DepartmentMetric } from './department-metric.entity';
import { AuditService } from '../audit/audit.service';
import { FreezeService } from '../freeze/freeze.service';

@Injectable()
export class DepartmentMetricsService {
  constructor(
    @InjectRepository(DepartmentMetric) private readonly repo: Repository<DepartmentMetric>,
    private readonly audit: AuditService,
    private readonly freeze: FreezeService,
  ) {}

  async getForDepartment(departmentId: string, year: number, opts?: { manager?: EntityManager }) {
    if (!Number.isInteger(year)) throw new BadRequestException('year is required');
    const repo = opts?.manager ? opts.manager.getRepository(DepartmentMetric) : this.repo;
    return repo.findOne({ where: { department_id: departmentId, fiscal_year: year } as any });
  }

  async upsertForDepartment(departmentId: string, year: number, body: Partial<DepartmentMetric>, userId?: string, opts?: { manager?: EntityManager }) {
    if (!Number.isInteger(year)) throw new BadRequestException('year is required');
    const hc = Number(body.headcount);
    if (!Number.isInteger(hc) || hc < 0) throw new BadRequestException('headcount is required and must be a non-negative integer');
    await this.freeze.assertNotFrozen({ scope: 'departments', year }, opts);
    const repo = opts?.manager ? opts.manager.getRepository(DepartmentMetric) : this.repo;
    const existing = await this.getForDepartment(departmentId, year, opts);
    const next = repo.create({
      ...(existing ?? {}),
      department_id: departmentId,
      fiscal_year: year,
      headcount: hc,
    });
    const saved = await repo.save(next);
    await this.audit.log({ table: 'department_metrics', recordId: saved.id, action: existing ? 'update' : 'create', before: existing, after: saved, userId }, { manager: opts?.manager ?? repo.manager });
    return saved;
  }
}
