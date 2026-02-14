import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Application } from '../application.entity';
import { ApplicationOwner } from '../application-owner.entity';
import { ApplicationCompany } from '../application-company.entity';
import { ApplicationDepartment } from '../application-department.entity';
import { ApplicationSupportContact } from '../application-support-contact.entity';
import { ExternalContact } from '../../contacts/external-contact.entity';
import { ApplicationsBaseService, ServiceOpts } from './applications-base.service';

/**
 * Service for managing application owners, companies, departments, and support contacts.
 */
@Injectable()
export class ApplicationsOwnersService extends ApplicationsBaseService {
  constructor(
    @InjectRepository(Application) appRepo: Repository<Application>,
  ) {
    super(appRepo);
  }

  // Owners
  async listOwners(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    return mg.getRepository(ApplicationOwner).find({ where: { application_id: appId } as any });
  }

  async bulkReplaceOwners(appId: string, owners: Array<{ user_id: string; owner_type: 'business' | 'it' }>, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(ApplicationOwner);
    const existing = await repo.find({ where: { application_id: appId } as any });
    if (existing.length) await repo.delete({ id: In(existing.map((x) => x.id)) as any });
    if (owners && owners.length) {
      const uniqueOwners: Array<{ user_id: string; owner_type: 'business' | 'it' }> = [];
      const seen = new Set<string>();
      for (const owner of owners) {
        const userId = String(owner?.user_id || '').trim();
        const ownerType = owner?.owner_type;
        if (!userId || (ownerType !== 'business' && ownerType !== 'it')) continue;
        const key = `${ownerType}:${userId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueOwners.push({ user_id: userId, owner_type: ownerType });
      }
      const rows = uniqueOwners.map((o) => repo.create({ application_id: appId, user_id: o.user_id, owner_type: o.owner_type }));
      await repo.save(rows);
    }
    return this.listOwners(appId, { manager: mg });
  }

  // Companies (Audience)
  async listCompanies(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    return mg.getRepository(ApplicationCompany).find({ where: { application_id: appId } as any });
  }

  async bulkReplaceCompanies(appId: string, companyIds: string[], opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(ApplicationCompany);
    const existing = await repo.find({ where: { application_id: appId } as any });
    if (existing.length) await repo.delete({ id: In(existing.map((x) => x.id)) as any });
    if (companyIds && companyIds.length) {
      const rows = companyIds.map((cid) => repo.create({ application_id: appId, company_id: cid }));
      await repo.save(rows);
    }
    return this.listCompanies(appId, { manager: mg });
  }

  // Departments (Audience)
  async listDepartments(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    return mg.getRepository(ApplicationDepartment).find({ where: { application_id: appId } as any });
  }

  async bulkReplaceDepartments(appId: string, departmentIds: string[], opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const repo = mg.getRepository(ApplicationDepartment);
    const existing = await repo.find({ where: { application_id: appId } as any });
    if (existing.length) await repo.delete({ id: In(existing.map((x) => x.id)) as any });
    if (departmentIds && departmentIds.length) {
      const rows = departmentIds.map((did) => repo.create({ application_id: appId, department_id: did }));
      await repo.save(rows);
    }
    return this.listDepartments(appId, { manager: mg });
  }

  // Support contacts
  async listSupportContacts(appId: string, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const app = await mg.getRepository(Application).findOne({ where: { id: appId } });
    if (!app) throw new NotFoundException('Application not found');
    const rows = await mg.query(
      `SELECT sc.id, sc.contact_id, sc.role, c.first_name, c.last_name, c.email, c.phone, c.mobile
       FROM application_support_contacts sc
       JOIN contacts c ON c.id = sc.contact_id
       WHERE sc.application_id = $1
       ORDER BY sc.created_at ASC, sc.id ASC`,
      [appId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      contact_id: r.contact_id,
      role: r.role,
      contact: {
        id: r.contact_id,
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        phone: r.phone,
        mobile: r.mobile,
      },
    }));
  }

  async bulkReplaceSupportContacts(appId: string, contacts: Array<{ contact_id: string; role?: string | null }>, opts?: ServiceOpts) {
    const mg = this.getManager(opts);
    const app = await mg.getRepository(Application).findOne({ where: { id: appId } });
    if (!app) throw new NotFoundException('Application not found');

    const repo = mg.getRepository(ApplicationSupportContact);
    const filtered = (contacts || [])
      .map((c) => ({ contact_id: String(c.contact_id || '').trim(), role: (c.role ?? '').toString().trim() || null }))
      .filter((c) => !!c.contact_id);

    if (filtered.length) {
      const uniqueIds = Array.from(new Set(filtered.map((c) => c.contact_id)));
      const found = await mg.getRepository(ExternalContact).find({ where: { id: In(uniqueIds) } as any });
      if (found.length !== uniqueIds.length) throw new BadRequestException('One or more contacts not found');
      const invalid = found.find((c) => (c as any).tenant_id !== app.tenant_id);
      if (invalid) throw new BadRequestException('Contact does not belong to tenant');
    }

    const existing = await repo.find({ where: { application_id: appId } as any });
    if (existing.length) await repo.delete({ id: In(existing.map((x) => x.id)) as any });
    if (filtered.length) {
      const rows = filtered.map((c) => repo.create({ tenant_id: app.tenant_id, application_id: appId, contact_id: c.contact_id, role: c.role ?? null }));
      await repo.save(rows);
    }
    return this.listSupportContacts(appId, { manager: mg });
  }
}
