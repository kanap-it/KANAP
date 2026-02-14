import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Application } from '../application.entity';
import { ApplicationSuiteLink } from '../application-suite.entity';
import { ApplicationsBaseService, ServiceOpts } from './applications-base.service';

/**
 * Service for managing application hierarchy (suites and components).
 */
@Injectable()
export class ApplicationsStructureService extends ApplicationsBaseService {
  constructor(
    @InjectRepository(Application) appRepo: Repository<Application>,
  ) {
    super(appRepo);
  }

  // Structure: Suites an app belongs to
  async listSuites(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const rows: Array<{ id: string; name: string; lifecycle: string; criticality: string }> = await mg.query(
      `SELECT a.id, a.name, a.lifecycle, a.criticality
       FROM application_suites l
       JOIN applications a ON a.id = l.suite_id
       WHERE l.application_id = $1
       ORDER BY a.name ASC`,
      [appId],
    );
    return { items: rows };
  }

  async bulkReplaceSuites(appId: string, suiteIds: string[], opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(ApplicationSuiteLink);
    const unique = Array.from(new Set((suiteIds || []).filter((id) => !!id && id !== appId)));
    if (unique.length > 0) {
      const apps = await mg.getRepository(Application).find({ where: { id: In(unique) } as any });
      if (apps.length !== unique.length) {
        throw new BadRequestException('One or more selected suites do not exist.');
      }
      const invalid = apps.filter((a) => !a.is_suite).map((a) => a.name);
      if (invalid.length > 0) {
        throw new BadRequestException('Only applications marked as suites can be selected as parents.');
      }
    }
    const existing = await repo.find({ where: { application_id: appId } as any });
    const toDelete = existing.filter((e: any) => !unique.includes(e.suite_id));
    const existingSet = new Set(existing.map((e: any) => e.suite_id));
    const toInsert = unique.filter((id) => !existingSet.has(id)).map((id) => repo.create({ application_id: appId, suite_id: id } as any));
    if (toDelete.length > 0) await repo.remove(toDelete as any);
    if (toInsert.length > 0) await repo.save(toInsert as any);
    return { ok: true, added: toInsert.length, removed: toDelete.length };
  }

  // Structure: Components (children) of a suite
  async listComponents(suiteId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const rows: Array<{ id: string; name: string; lifecycle: string; criticality: string }> = await mg.query(
      `SELECT a.id, a.name, a.lifecycle, a.criticality
       FROM application_suites l
       JOIN applications a ON a.id = l.application_id
       WHERE l.suite_id = $1
       ORDER BY a.name ASC`,
      [suiteId],
    );
    return { items: rows };
  }
}
