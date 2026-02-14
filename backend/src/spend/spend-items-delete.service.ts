import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { SpendItem } from './spend-item.entity';
import { SpendVersion } from './spend-version.entity';
import { SpendAmount } from './spend-amount.entity';
import { SpendAllocation } from './spend-allocation.entity';
import { AuditService } from '../audit/audit.service';
import { BaseDeleteService } from '../common/base-delete.service';
import { BulkDeleteResult, DeleteOptions } from '../common/delete.types';

@Injectable()
export class SpendItemsDeleteService extends BaseDeleteService<SpendItem> {
  protected override readonly logger = new Logger(SpendItemsDeleteService.name);

  constructor(
    @InjectRepository(SpendItem) repository: Repository<SpendItem>,
    @InjectRepository(SpendVersion) private readonly versions: Repository<SpendVersion>,
    @InjectRepository(SpendAmount) private readonly amounts: Repository<SpendAmount>,
    @InjectRepository(SpendAllocation) private readonly allocations: Repository<SpendAllocation>,
    audit: AuditService,
  ) {
    super(repository, null, audit, {
      entityName: 'SpendItem',
      auditTable: 'spend_items',
      cascadeRelations: [],
    });
  }

  /**
   * Delete a single item with CASCADE to all children
   * Automatically deletes versions, amounts, allocations, and tasks
   */
  override async delete(itemId: string, opts?: DeleteOptions): Promise<void> {
    const manager = opts?.manager ?? this.repository.manager;
    const itemRepo = this.getRepo(manager);
    const versionRepo = manager.getRepository(SpendVersion);
    const amountRepo = manager.getRepository(SpendAmount);
    const allocationRepo = manager.getRepository(SpendAllocation);

    const item = await itemRepo.findOne({ where: { id: itemId } as any });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Get versions for cascade deletion
    const versions = await versionRepo.find({ where: { spend_item_id: itemId } });
    const versionIds = versions.map(v => v.id);

    // CASCADE DELETE: Delete in reverse dependency order
    // 1. Delete allocations (depends on versions)
    if (versionIds.length > 0) {
      await allocationRepo.delete({ version_id: In(versionIds) });
    }

    // 2. Delete amounts (depends on versions)
    if (versionIds.length > 0) {
      await amountRepo.delete({ version_id: In(versionIds) });
    }

    // 3. Delete versions (depends on item)
    if (versionIds.length > 0) {
      await versionRepo.delete({ spend_item_id: itemId });
    }

    // 4. Delete tasks (depends on item) from unified table
    await manager.query(`DELETE FROM tasks WHERE related_object_type = 'spend_item' AND related_object_id = $1`, [itemId]);

    // 5. Finally delete the item itself
    await itemRepo.delete({ id: itemId } as any);

    // Audit log
    if (!opts?.skipAudit) {
      await this.audit.log(
        {
          table: 'spend_items',
          recordId: itemId,
          action: 'delete',
          before: item,
          after: null,
          userId: opts?.userId ?? null,
        },
        { manager }
      );
    }
  }

  /**
   * Bulk delete multiple items
   * Returns both successful deletions and failures
   */
  async bulkDelete(itemIds: string[], userId: string | null, opts?: { manager?: EntityManager }): Promise<BulkDeleteResult> {
    const manager = opts?.manager ?? this.repository.manager;
    const itemRepo = this.getRepo(manager);
    const result: BulkDeleteResult = { deleted: [], failed: [] };

    for (const itemId of itemIds) {
      try {
        await this.delete(itemId, { manager, userId });
        result.deleted.push(itemId);
      } catch (error: any) {
        // Get product name for error reporting
        let name = 'Unknown';
        try {
          const item = await itemRepo.findOne({ where: { id: itemId } as any });
          if (item) name = item.product_name;
        } catch (err: any) {
          this.logger.warn(`Failed to fetch spend item name for error reporting: ${err?.message || 'Unknown error'}`);
        }

        result.failed.push({
          id: itemId,
          name,
          reason: error.message || 'Unknown error',
        });
      }
    }

    return result;
  }
}
