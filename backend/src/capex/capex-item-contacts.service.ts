import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CapexItemContactLink, ContactOrigin } from './capex-item-contact.entity';
import { ExternalContact } from '../contacts/external-contact.entity';
import { SupplierContactLink, SupplierContactRole } from '../contacts/supplier-contact.entity';
import { CapexItem } from './capex-item.entity';

@Injectable()
export class CapexItemContactsService {
  constructor(
    @InjectRepository(CapexItemContactLink)
    private readonly linkRepo: Repository<CapexItemContactLink>,
    @InjectRepository(ExternalContact)
    private readonly contactRepo: Repository<ExternalContact>,
    @InjectRepository(SupplierContactLink)
    private readonly supplierContactRepo: Repository<SupplierContactLink>,
    @InjectRepository(CapexItem)
    private readonly itemRepo: Repository<CapexItem>,
  ) {}

  private getLinkRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(CapexItemContactLink) : this.linkRepo;
  }
  private getContactRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(ExternalContact) : this.contactRepo;
  }
  private getSupplierContactRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(SupplierContactLink) : this.supplierContactRepo;
  }
  private getItemRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(CapexItem) : this.itemRepo;
  }

  async listForItem(itemId: string, opts?: { manager?: EntityManager }) {
    const repo = this.getLinkRepo(opts?.manager);
    const items = await repo.find({
      where: { capex_item_id: itemId },
      order: { role: 'ASC', created_at: 'DESC' } as any,
      relations: ['contact'],
    });
    return items;
  }

  async attachManual(
    itemId: string,
    params: { contactId: string; role: SupplierContactRole },
    opts?: { manager?: EntityManager },
  ) {
    const repo = this.getLinkRepo(opts?.manager);
    const contactRepo = this.getContactRepo(opts?.manager);
    const itemRepo = this.getItemRepo(opts?.manager);

    const item = await itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Capex item not found');

    const contact = await contactRepo.findOne({ where: { id: params.contactId } });
    if (!contact) throw new NotFoundException('Contact not found');

    // Check duplicate by (item, contact, role)
    const existing = await repo.findOne({
      where: { capex_item_id: itemId, contact_id: params.contactId, role: params.role },
    });
    if (existing) return existing;

    const link = repo.create({
      tenant_id: item.tenant_id,
      capex_item_id: itemId,
      contact_id: params.contactId,
      role: params.role,
      origin: ContactOrigin.MANUAL,
    });
    return repo.save(link);
  }

  async detach(linkId: string, opts?: { manager?: EntityManager }) {
    const repo = this.getLinkRepo(opts?.manager);
    const existing = await repo.findOne({ where: { id: linkId } });
    if (!existing) throw new NotFoundException('Link not found');
    await repo.delete({ id: linkId });
    return { ok: true };
  }

  /**
   * Sync contacts from supplier. Called when supplier_id changes on the item.
   * 1. Remove all contacts with origin='supplier'
   * 2. If newSupplierId is not null, fetch supplier's contacts and add them with origin='supplier'
   */
  async syncFromSupplier(itemId: string, newSupplierId: string | null, opts?: { manager?: EntityManager }) {
    const repo = this.getLinkRepo(opts?.manager);
    const supplierContactRepo = this.getSupplierContactRepo(opts?.manager);
    const itemRepo = this.getItemRepo(opts?.manager);

    const item = await itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Capex item not found');

    // 1. Remove all supplier-derived contacts
    await repo.delete({ capex_item_id: itemId, origin: ContactOrigin.SUPPLIER });

    // 2. If new supplier exists, fetch and add their contacts
    if (newSupplierId) {
      const supplierContacts = await supplierContactRepo.find({
        where: { supplier_id: newSupplierId },
      });

      for (const sc of supplierContacts) {
        // Check if this contact+role already exists (could be manually added)
        const existing = await repo.findOne({
          where: { capex_item_id: itemId, contact_id: sc.contact_id, role: sc.role },
        });
        if (existing) continue;

        const link = repo.create({
          tenant_id: item.tenant_id,
          capex_item_id: itemId,
          contact_id: sc.contact_id,
          role: sc.role,
          origin: ContactOrigin.SUPPLIER,
        });
        await repo.save(link);
      }
    }
  }

  /**
   * Called when supplier_id on item changes. Fetches item's supplier and syncs.
   */
  async syncFromSupplierForItem(itemId: string, opts?: { manager?: EntityManager }) {
    const itemRepo = this.getItemRepo(opts?.manager);
    const item = await itemRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Capex item not found');
    await this.syncFromSupplier(itemId, item.supplier_id, opts);
  }

  /**
   * Add a single supplier contact to an item. Called when a contact is added to a supplier.
   */
  async addSupplierContact(
    itemId: string,
    contactId: string,
    role: SupplierContactRole,
    opts?: { manager?: EntityManager },
  ) {
    const repo = this.getLinkRepo(opts?.manager);
    const itemRepo = this.getItemRepo(opts?.manager);

    const item = await itemRepo.findOne({ where: { id: itemId } });
    if (!item) return;

    // Check if already exists
    const existing = await repo.findOne({
      where: { capex_item_id: itemId, contact_id: contactId, role: role },
    });
    if (existing) return;

    const link = repo.create({
      tenant_id: item.tenant_id,
      capex_item_id: itemId,
      contact_id: contactId,
      role: role,
      origin: ContactOrigin.SUPPLIER,
    });
    await repo.save(link);
  }

  /**
   * Remove a supplier-derived contact from an item. Called when a contact is removed from a supplier.
   */
  async removeSupplierContact(
    itemId: string,
    contactId: string,
    role: SupplierContactRole,
    opts?: { manager?: EntityManager },
  ) {
    const repo = this.getLinkRepo(opts?.manager);
    await repo.delete({
      capex_item_id: itemId,
      contact_id: contactId,
      role: role,
      origin: ContactOrigin.SUPPLIER,
    });
  }
}
