import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { PortfolioSettings } from './portfolio-settings.entity';

@Injectable()
export class PortfolioSettingsService {
  constructor(
    @InjectRepository(PortfolioSettings)
    private readonly repo: Repository<PortfolioSettings>,
  ) {}

  async get(tenantId: string, opts?: { manager?: EntityManager }): Promise<PortfolioSettings> {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(PortfolioSettings);

    let settings = await repo.findOne({ where: { tenant_id: tenantId } });

    if (!settings) {
      // Create default settings
      settings = repo.create({
        tenant_id: tenantId,
        mandatory_bypass_enabled: false,
      });
      settings = await repo.save(settings);
    }

    return settings;
  }

  async update(
    tenantId: string,
    body: { mandatory_bypass_enabled?: boolean },
    opts?: { manager?: EntityManager },
  ): Promise<PortfolioSettings> {
    const mg = opts?.manager ?? this.repo.manager;
    const repo = mg.getRepository(PortfolioSettings);

    let settings = await this.get(tenantId, { manager: mg });

    if (Object.prototype.hasOwnProperty.call(body, 'mandatory_bypass_enabled')) {
      settings.mandatory_bypass_enabled = body.mandatory_bypass_enabled === true;
    }

    settings.updated_at = new Date();
    return repo.save(settings);
  }
}
