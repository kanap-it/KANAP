import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SupplierContactLink, SupplierContactRole } from '../contacts/supplier-contact.entity';
import { ExternalContact } from '../contacts/external-contact.entity';

@Injectable()
export class SupplierContactsService {
  constructor(
    @InjectRepository(SupplierContactLink)
    private readonly linkRepo: Repository<SupplierContactLink>,
    @InjectRepository(ExternalContact)
    private readonly contactRepo: Repository<ExternalContact>,
  ) {}

  private getLinkRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(SupplierContactLink) : this.linkRepo;
  }
  private getContactRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(ExternalContact) : this.contactRepo;
  }

  async listForSupplier(supplierId: string, opts?: { manager?: EntityManager }) {
    const repo = this.getLinkRepo(opts?.manager);
    const items = await repo.find({ where: { supplier_id: supplierId }, order: { created_at: 'DESC' as any } as any, relations: ['contact'] });
    return items;
  }

  async attach(supplierId: string, params: { contactId: string; role: SupplierContactRole; isPrimary?: boolean }, opts?: { manager?: EntityManager }) {
    const repo = this.getLinkRepo(opts?.manager);
    const contactRepo = this.getContactRepo(opts?.manager);
    const contact = await contactRepo.findOne({ where: { id: params.contactId } });
    if (!contact) throw new NotFoundException('Contact not found');

    // Check duplicate by (supplier, contact, role)
    const existing = await repo.findOne({ where: { supplier_id: supplierId, contact_id: params.contactId, role: params.role } });
    if (existing) return existing;
    const link = repo.create({ supplier_id: supplierId, contact_id: params.contactId, role: params.role, is_primary: !!params.isPrimary });
    const saved = await repo.save(link);

    // Sync contact's primary supplier_id if not already set
    if (!contact.supplier_id) {
      contact.supplier_id = supplierId;
      await contactRepo.save(contact);
    }

    // Propagate to linked items
    await this.propagateContactToItems(supplierId, params.contactId, params.role, opts);

    return saved;
  }

  async detach(linkId: string, opts?: { manager?: EntityManager }) {
    const repo = this.getLinkRepo(opts?.manager);
    const existing = await repo.findOne({ where: { id: linkId } });
    if (!existing) throw new NotFoundException('Link not found');

    const { supplier_id, contact_id, role } = existing;

    await repo.delete({ id: linkId });

    // Remove from linked items
    await this.removeContactFromItems(supplier_id, contact_id, role, opts);

    // Sync contact's primary supplier_id
    const contactRepo = this.getContactRepo(opts?.manager);
    const contact = await contactRepo.findOne({ where: { id: contact_id } });
    if (contact && contact.supplier_id === supplier_id) {
      // Find the next available link for this contact
      const nextLink = await repo.findOne({ where: { contact_id } });
      contact.supplier_id = nextLink?.supplier_id ?? null;
      await contactRepo.save(contact);
    }

    return { ok: true };
  }

  /**
   * Public wrapper for propagation — used by ContactsService when supplier_id/role
   * changes from the contact workspace.
   */
  async propagateContactToItemsPublic(
    supplierId: string,
    contactId: string,
    role: SupplierContactRole,
    opts?: { manager?: EntityManager },
  ) {
    return this.propagateContactToItems(supplierId, contactId, role, opts);
  }

  /**
   * Propagate a supplier contact to all items linked to this supplier.
   * Adds the contact with origin='supplier' to spend_items, capex_items, and contracts.
   */
  private async propagateContactToItems(
    supplierId: string,
    contactId: string,
    role: SupplierContactRole,
    opts?: { manager?: EntityManager },
  ) {
    const mg = opts?.manager ?? this.linkRepo.manager;

    // Find spend_items with this supplier
    const spendItems: Array<{ id: string; tenant_id: string }> = await mg.query(
      `SELECT id, tenant_id FROM spend_items WHERE supplier_id = $1`,
      [supplierId],
    );
    for (const item of spendItems) {
      await mg.query(
        `INSERT INTO spend_item_contacts (tenant_id, spend_item_id, contact_id, role, origin)
         VALUES ($1, $2, $3, $4, 'supplier')
         ON CONFLICT (tenant_id, spend_item_id, contact_id, role) DO NOTHING`,
        [item.tenant_id, item.id, contactId, role],
      );
    }

    // Find capex_items with this supplier
    const capexItems: Array<{ id: string; tenant_id: string }> = await mg.query(
      `SELECT id, tenant_id FROM capex_items WHERE supplier_id = $1`,
      [supplierId],
    );
    for (const item of capexItems) {
      await mg.query(
        `INSERT INTO capex_item_contacts (tenant_id, capex_item_id, contact_id, role, origin)
         VALUES ($1, $2, $3, $4, 'supplier')
         ON CONFLICT (tenant_id, capex_item_id, contact_id, role) DO NOTHING`,
        [item.tenant_id, item.id, contactId, role],
      );
    }

    // Find contracts with this supplier
    const contracts: Array<{ id: string; tenant_id: string }> = await mg.query(
      `SELECT id, tenant_id FROM contracts WHERE supplier_id = $1`,
      [supplierId],
    );
    for (const contract of contracts) {
      await mg.query(
        `INSERT INTO contract_contacts (tenant_id, contract_id, contact_id, role, origin)
         VALUES ($1, $2, $3, $4, 'supplier')
         ON CONFLICT (tenant_id, contract_id, contact_id, role) DO NOTHING`,
        [contract.tenant_id, contract.id, contactId, role],
      );
    }
  }

  /**
   * Remove a supplier-derived contact from all items linked to this supplier.
   */
  private async removeContactFromItems(
    supplierId: string,
    contactId: string,
    role: SupplierContactRole,
    opts?: { manager?: EntityManager },
  ) {
    const mg = opts?.manager ?? this.linkRepo.manager;

    // Remove from spend_item_contacts
    await mg.query(
      `DELETE FROM spend_item_contacts
       WHERE contact_id = $1 AND role = $2 AND origin = 'supplier'
       AND spend_item_id IN (SELECT id FROM spend_items WHERE supplier_id = $3)`,
      [contactId, role, supplierId],
    );

    // Remove from capex_item_contacts
    await mg.query(
      `DELETE FROM capex_item_contacts
       WHERE contact_id = $1 AND role = $2 AND origin = 'supplier'
       AND capex_item_id IN (SELECT id FROM capex_items WHERE supplier_id = $3)`,
      [contactId, role, supplierId],
    );

    // Remove from contract_contacts
    await mg.query(
      `DELETE FROM contract_contacts
       WHERE contact_id = $1 AND role = $2 AND origin = 'supplier'
       AND contract_id IN (SELECT id FROM contracts WHERE supplier_id = $3)`,
      [contactId, role, supplierId],
    );
  }
}

