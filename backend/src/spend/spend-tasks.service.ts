import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { TasksUnifiedService } from '../tasks/tasks-unified.service';

@Injectable()
export class SpendTasksService {
  constructor(
    private readonly unified: TasksUnifiedService,
    private readonly audit: AuditService,
  ) {}

  listForItem(itemId: string, opts?: { manager?: EntityManager }) {
    return this.unified.listForTarget({ type: 'spend_item', id: itemId }, opts);
  }

  async createForItem(itemId: string, body: any, userId?: string, opts?: { manager?: EntityManager; tenantId?: string }) {
    const saved = await this.unified.createForTarget({ type: 'spend_item', id: itemId, payload: body }, userId, opts);
    // Keep legacy audit table name for backward compatibility note: we also log to 'tasks' in unified service
    await this.audit.log({ table: 'spend_tasks', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager: opts?.manager });
    return saved;
  }

  async updateForItem(itemId: string, body: any, userId?: string, opts?: { manager?: EntityManager; tenantId?: string }) {
    const saved = await this.unified.updateForTarget({ type: 'spend_item', id: itemId, payload: body }, userId, opts);
    await this.audit.log({ table: 'spend_tasks', recordId: saved.id, action: 'update', before: null, after: saved, userId }, { manager: opts?.manager });
    return saved;
  }
}
