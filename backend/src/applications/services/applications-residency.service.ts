import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Application } from '../application.entity';
import { ApplicationDataResidency } from '../application-data-residency.entity';
import { ApplicationsBaseService, ServiceOpts } from './applications-base.service';

/**
 * Service for managing application data residency.
 */
@Injectable()
export class ApplicationsResidencyService extends ApplicationsBaseService {
  constructor(
    @InjectRepository(Application) appRepo: Repository<Application>,
  ) {
    super(appRepo);
  }

  async listDataResidency(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    return mg.getRepository(ApplicationDataResidency).find({ where: { application_id: appId } as any });
  }

  async bulkReplaceDataResidency(appId: string, countryCodes: string[], opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(ApplicationDataResidency);
    const existing = await repo.find({ where: { application_id: appId } as any });
    if (existing.length) await repo.delete({ id: In(existing.map((x) => x.id)) as any });
    const clean = (countryCodes || []).map((c) => String(c || '').trim().toUpperCase()).filter((c) => !!c && c.length === 2);
    const unique = Array.from(new Set(clean));
    if (unique.length) {
      const rows = unique.map((iso) => repo.create({ application_id: appId, country_iso: iso }));
      await repo.save(rows);
    }
    return this.listDataResidency(appId, { manager: mg });
  }
}
