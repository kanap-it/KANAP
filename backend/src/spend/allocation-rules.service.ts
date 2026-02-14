import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AllocationRule } from './allocation-rule.entity';

@Injectable()
export class AllocationRulesService {
  constructor(@InjectRepository(AllocationRule) private readonly repo: Repository<AllocationRule>) {}

  async getActive(tenantId: string | null, year: number) {
    const rule = await this.repo.findOne({ where: { tenant_id: tenantId, fiscal_year: year } as any });
    return rule ?? null;
  }

  async setActive(tenantId: string | null, year: number, method: 'headcount' | 'it_users' | 'turnover') {
    if (!['headcount', 'it_users', 'turnover'].includes(method)) throw new BadRequestException('Invalid method');
    let rule = await this.repo.findOne({ where: { tenant_id: tenantId, fiscal_year: year } as any });
    if (!rule) {
      rule = this.repo.create({ tenant_id: tenantId, fiscal_year: year, method, status: 'active' });
    } else {
      (rule as any).method = method;
      (rule as any).status = 'active';
    }
    return this.repo.save(rule);
  }
}

