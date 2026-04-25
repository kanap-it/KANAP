import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, EntityManager } from 'typeorm';
import { Application } from '../application.entity';
import { ApplicationSpendItemLink } from '../application-spend-item.entity';
import { ApplicationCapexItemLink } from '../application-capex-item.entity';
import { ApplicationContractLink } from '../application-contract.entity';
import { ApplicationProject } from '../application-project.entity';
import { PortfolioProject } from '../../portfolio/portfolio-project.entity';
import { AuditService } from '../../audit/audit.service';
import { ApplicationsBaseService, ServiceOpts } from './applications-base.service';

/**
 * Service for managing application relations (spend items, capex items, contracts, projects).
 */
@Injectable()
export class ApplicationsInstancesService extends ApplicationsBaseService {
  constructor(
    @InjectRepository(Application) appRepo: Repository<Application>,
    @InjectRepository(PortfolioProject) private readonly projectRepo: Repository<PortfolioProject>,
    private readonly audit: AuditService,
  ) {
    super(appRepo);
  }

  // Relations - OPEX (spend items)
  async listLinkedSpendItems(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    const repo = mg.getRepository(ApplicationSpendItemLink);
    const rows = await repo.find({ where: { application_id: resolvedAppId } as any });
    const ids = rows.map((r: any) => r.spend_item_id);
    const items = ids.length ? await mg.query(`SELECT id, product_name FROM spend_items WHERE id = ANY($1)`, [ids]) : [];
    return { items };
  }

  async bulkReplaceLinkedSpendItems(appId: string, spendItemIds: string[], userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    const repo = mg.getRepository(ApplicationSpendItemLink);
    const unique = Array.from(new Set((spendItemIds || []).filter(Boolean)));
    const existing = await repo.find({ where: { application_id: resolvedAppId } as any });
    const beforeState = existing.map((e: any) => e.spend_item_id).sort();
    const toDelete = existing.filter((e: any) => !unique.includes(e.spend_item_id));
    const existingSet = new Set(existing.map((e: any) => e.spend_item_id));
    const toInsert = unique.filter((id) => !existingSet.has(id)).map((id) => repo.create({ application_id: resolvedAppId, spend_item_id: id } as any));
    if (toDelete.length > 0) await repo.remove(toDelete as any);
    if (toInsert.length > 0) await repo.save(toInsert as any);
    const afterState = [...unique].sort();
    if (JSON.stringify(beforeState) !== JSON.stringify(afterState)) {
      await this.audit.log(
        {
          table: 'application_spend_items',
          recordId: resolvedAppId,
          action: 'update',
          before: beforeState,
          after: afterState,
          userId: userId ?? null,
        },
        { manager: mg },
      );
    }
    return { ok: true, added: toInsert.length, removed: toDelete.length };
  }

  // Relations - CAPEX items
  async listLinkedCapexItems(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    const repo = mg.getRepository(ApplicationCapexItemLink);
    const rows = await repo.find({ where: { application_id: resolvedAppId } as any });
    const ids = rows.map((r: any) => r.capex_item_id);
    if (ids.length === 0) return { items: [] };
    const { CapexItem } = await import('../../capex/capex-item.entity');
    const capexRepo = mg.getRepository(CapexItem);
    const items = await capexRepo.findBy({ id: In(ids) as any } as any);
    return { items: items.map((i: any) => ({ id: i.id, description: i.description })) };
  }

  async bulkReplaceLinkedCapexItems(appId: string, capexItemIds: string[], userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    const repo = mg.getRepository(ApplicationCapexItemLink);
    const unique = Array.from(new Set((capexItemIds || []).filter(Boolean)));
    const existing = await repo.find({ where: { application_id: resolvedAppId } as any });
    const beforeState = existing.map((e: any) => e.capex_item_id).sort();
    const toDelete = existing.filter((e: any) => !unique.includes(e.capex_item_id));
    const existingSet = new Set(existing.map((e: any) => e.capex_item_id));
    const toInsert = unique.filter((id) => !existingSet.has(id)).map((id) => repo.create({ application_id: resolvedAppId, capex_item_id: id } as any));
    if (toDelete.length > 0) await repo.remove(toDelete as any);
    if (toInsert.length > 0) await repo.save(toInsert as any);
    const afterState = [...unique].sort();
    if (JSON.stringify(beforeState) !== JSON.stringify(afterState)) {
      await this.audit.log(
        {
          table: 'application_capex_items',
          recordId: resolvedAppId,
          action: 'update',
          before: beforeState,
          after: afterState,
          userId: userId ?? null,
        },
        { manager: mg },
      );
    }
    return { ok: true, added: toInsert.length, removed: toDelete.length };
  }

  // Relations - Contracts
  async listLinkedContracts(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    const repo = mg.getRepository(ApplicationContractLink);
    const rows = await repo.find({ where: { application_id: resolvedAppId } as any });
    const ids = rows.map((r: any) => r.contract_id);
    const items = ids.length ? await mg.query(`SELECT id, name FROM contracts WHERE id = ANY($1)`, [ids]) : [];
    return { items };
  }

  async bulkReplaceLinkedContracts(appId: string, contractIds: string[], userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(appId, mg);
    const repo = mg.getRepository(ApplicationContractLink);
    const unique = Array.from(new Set((contractIds || []).filter(Boolean)));
    const existing = await repo.find({ where: { application_id: resolvedAppId } as any });
    const beforeState = existing.map((e: any) => e.contract_id).sort();
    const toDelete = existing.filter((e: any) => !unique.includes(e.contract_id));
    const existingSet = new Set(existing.map((e: any) => e.contract_id));
    const toInsert = unique.filter((id) => !existingSet.has(id)).map((id) => repo.create({ application_id: resolvedAppId, contract_id: id } as any));
    if (toDelete.length > 0) await repo.remove(toDelete as any);
    if (toInsert.length > 0) await repo.save(toInsert as any);
    const afterState = [...unique].sort();
    if (JSON.stringify(beforeState) !== JSON.stringify(afterState)) {
      await this.audit.log(
        {
          table: 'application_contracts',
          recordId: resolvedAppId,
          action: 'update',
          before: beforeState,
          after: afterState,
          userId: userId ?? null,
        },
        { manager: mg },
      );
    }
    return { ok: true, added: toInsert.length, removed: toDelete.length };
  }

  // Projects
  async listProjects(applicationId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(applicationId, mg);
    await this.ensureApp(resolvedAppId, mg);
    const rows = await mg.query(
      `SELECT l.project_id as id, p.name
       FROM application_projects l
       JOIN portfolio_projects p ON p.id = l.project_id
       WHERE l.application_id = $1
       ORDER BY p.name ASC`,
      [resolvedAppId],
    );
    return { items: rows };
  }

  async bulkReplaceProjects(applicationId: string, projectIds: string[], userId?: string | null, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const resolvedAppId = await this.resolveApplicationIdentifier(applicationId, mg);
    const app = await this.ensureApp(resolvedAppId, mg);
    const cleanIds = Array.from(new Set((projectIds || []).map((id) => String(id || '').trim()).filter(Boolean)));
    if (cleanIds.length) {
      const projects = await mg.getRepository(PortfolioProject).find({ where: { id: In(cleanIds) } as any });
      if (projects.length !== cleanIds.length) throw new BadRequestException('One or more projects not found');
      const invalid = projects.find((p) => (p as any).tenant_id !== (app as any).tenant_id);
      if (invalid) throw new BadRequestException('Project does not belong to tenant');
    }
    const repo = mg.getRepository(ApplicationProject);
    const existing = await repo.find({ where: { application_id: resolvedAppId } as any });
    const beforeState = existing.map((e) => e.project_id).sort();
    if (existing.length) await repo.delete({ id: In(existing.map((x) => x.id)) as any });
    if (cleanIds.length) {
      const rows = cleanIds.map((projId) => repo.create({ tenant_id: (app as any).tenant_id, project_id: projId, application_id: resolvedAppId }));
      await repo.save(rows);
    }
    const afterState = [...cleanIds].sort();
    if (JSON.stringify(beforeState) !== JSON.stringify(afterState)) {
      await this.audit.log(
        {
          table: 'application_projects',
          recordId: resolvedAppId,
          action: 'update',
          before: beforeState,
          after: afterState,
          userId: userId ?? null,
        },
        { manager: mg },
      );
    }
    return this.listProjects(resolvedAppId, { manager: mg });
  }
}
