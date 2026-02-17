import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Task, TaskPriorityLevel } from './task.entity';
import { TaskTimeEntry } from './task-time-entry.entity';
import { AuditService } from '../audit/audit.service';
import { ItemNumberService } from '../common/item-number.service';
import { PortfolioProjectPhase } from '../portfolio/portfolio-project-phase.entity';
import { UserTimeAggregateService } from '../portfolio/services/user-time-aggregate.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShareItemDto } from '../notifications/dto/share-item.dto';

export type RelatedType = 'spend_item' | 'contract' | 'capex_item' | 'project' | null;

@Injectable()
export class TasksUnifiedService {
  constructor(
    @InjectRepository(Task) private readonly repo: Repository<Task>,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
    private readonly userTimeAggregateService: UserTimeAggregateService,
    private readonly notifications: NotificationsService,
    private readonly itemNumberService: ItemNumberService,
  ) {}

  /**
   * Check if a task has any time logged
   */
  private async hasTimeLogged(taskId: string, manager: EntityManager): Promise<boolean> {
    const repo = manager.getRepository(TaskTimeEntry);
    const count = await repo.count({ where: { task_id: taskId } });
    return count > 0;
  }

  listForTarget(target: { type: RelatedType; id: string | null }, opts?: { manager?: EntityManager }) {
    const repo = (opts?.manager ?? this.repo.manager).getRepository(Task);
    if (target.type === null) {
      // List standalone tasks
      return repo.find({
        where: { related_object_type: null as any } as any,
        order: { created_at: 'DESC' as any },
      });
    }
    return repo.find({
      where: { related_object_type: target.type, related_object_id: target.id } as any,
      order: { created_at: 'DESC' as any },
    });
  }

  async createForTarget(target: { type: RelatedType; id: string | null; payload: Partial<Task> }, userId?: string, opts?: { manager?: EntityManager; tenantId?: string }) {
    const manager = opts?.manager ?? this.repo.manager;
    const repo = manager.getRepository(Task);
    const { payload } = target;
    if (!payload?.title || !payload.title.toString().trim()) throw new BadRequestException('title required');

    const isStandalone = target.type === null;

    // Validate phase belongs to project for project tasks
    if (target.type === 'project' && target.id && payload.phase_id) {
      const phaseRepo = manager.getRepository(PortfolioProjectPhase);
      const phase = await phaseRepo.findOne({ where: { id: payload.phase_id, project_id: target.id } });
      if (!phase) throw new BadRequestException('Phase does not belong to specified project');
    }

    // Validate classification fields - only allowed for standalone tasks
    if (!isStandalone) {
      if (payload.source_id !== undefined || payload.company_id !== undefined) {
        throw new BadRequestException('source_id and company_id can only be set on standalone tasks');
      }
      // For project tasks, category_id/stream_id are inherited from project
      if (target.type === 'project') {
        if (payload.category_id !== undefined || payload.stream_id !== undefined) {
          throw new BadRequestException('Category and stream are inherited from project for project tasks');
        }
      }
    }

    // Build entity with new fields
    const entity = repo.create({
      related_object_type: target.type,
      related_object_id: target.id,
      title: payload.title,
      description: (payload.description ?? null) as any,
      status: ((payload.status as any) ?? 'open') as any,
      due_date: (payload.due_date ?? null) as any,
      assignee_user_id: (payload.assignee_user_id ?? null) as any,
      // Task type
      task_type_id: (payload.task_type_id ?? null) as any,
      // Fields for project tasks
      phase_id: (payload.phase_id ?? null) as any,
      priority_level: (payload.priority_level ?? 'normal') as TaskPriorityLevel,
      start_date: (payload.start_date ?? null) as any,
      labels: payload.labels ?? [],
      // Classification fields (only populated for standalone tasks)
      source_id: isStandalone ? (payload.source_id ?? null) as any : null,
      category_id: isStandalone ? (payload.category_id ?? null) as any : null,
      stream_id: isStandalone ? (payload.stream_id ?? null) as any : null,
      company_id: isStandalone ? (payload.company_id ?? null) as any : null,
      creator_id: (payload.creator_id ?? userId ?? null) as any,
      owner_ids: payload.owner_ids ?? [],
      viewer_ids: payload.viewer_ids ?? [],
    });
    if (opts?.tenantId) {
      entity.item_number = await this.itemNumberService.nextItemNumber('task', opts.tenantId, manager);
    }
    const saved = await repo.save(entity);
    await this.audit.log({ table: 'tasks', recordId: saved.id, action: 'create', before: null, after: saved, userId }, { manager });
    return saved;
  }

  async updateForTarget(target: { type: RelatedType; id: string | null; payload: Partial<Task> & { id: string } }, userId?: string, opts?: { manager?: EntityManager; tenantId?: string }) {
    const manager = opts?.manager ?? this.repo.manager;
    const tenantId = opts?.tenantId;
    const repo = manager.getRepository(Task);
    const { payload } = target;
    if (!payload?.id) throw new BadRequestException('id is required');
    const existing = await repo.findOne({ where: { id: payload.id } });
    if (!existing) throw new NotFoundException('Task not found');

    // Capture "before" state for notification comparison
    const before = { ...existing };

    const isStandalone = existing.related_object_type === null;

    // Validate task belongs to target (skip for standalone tasks)
    if (!isStandalone) {
      if (existing.related_object_type !== target.type || existing.related_object_id !== target.id) {
        throw new BadRequestException('Task does not belong to target');
      }
    }

    // Strip classification fields for non-standalone tasks (defense in depth)
    // These fields should not be set on linked tasks - they're either inherited or N/A
    if (!isStandalone) {
      delete payload.source_id;
      delete payload.company_id;
      if (existing.related_object_type === 'project') {
        delete payload.category_id;
        delete payload.stream_id;
      }
    }

    // Validate phase belongs to project for project tasks
    if (target.type === 'project' && target.id && payload.phase_id !== undefined && payload.phase_id !== null) {
      const phaseRepo = manager.getRepository(PortfolioProjectPhase);
      const phase = await phaseRepo.findOne({ where: { id: payload.phase_id, project_id: target.id } });
      if (!phase) throw new BadRequestException('Phase does not belong to specified project');
    }

    // Validate: Cannot mark task as "done" without time logged (only for project tasks)
    if (target.type === 'project' && payload.status === 'done' && existing.status !== 'done') {
      const hasTime = await this.hasTimeLogged(payload.id, manager);
      if (!hasTime) {
        throw new BadRequestException('Cannot mark task as done without logging time');
      }
    }

    const next = { ...existing, ...payload } as Task;
    const saved = await repo.save(next);
    await this.audit.log({ table: 'tasks', recordId: saved.id, action: 'update', before: existing, after: saved, userId }, { manager });

    // Fire-and-forget notifications
    if (tenantId) {
      // Notify on task assignment change
      // Exclude users with system roles (e.g., Contact) who cannot log in
      if (before.assignee_user_id !== saved.assignee_user_id && saved.assignee_user_id) {
        const assignee = await manager.query(
          `SELECT u.email FROM users u
           JOIN roles ro ON ro.id = u.role_id
           WHERE u.id = $1 AND u.status = 'enabled'
             AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')`,
          [saved.assignee_user_id]
        );
        if (assignee.length > 0) {
          const assigner = await manager.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
          const assignerName = assigner.length > 0 ? `${assigner[0].first_name} ${assigner[0].last_name}`.trim() || 'Someone' : 'Someone';
          this.notifications.notifyTaskAssigned({
            taskId: saved.id,
            taskTitle: saved.title,
            assigneeId: saved.assignee_user_id,
            assigneeEmail: assignee[0].email,
            assignerName,
            dueDate: saved.due_date ? String(saved.due_date).split('T')[0] : undefined,
            tenantId,
            manager,
          });
        }
      }

      // Notify on status change
      if (before.status !== saved.status) {
        const recipients = await this.notifications.getTaskRecipients(saved.id, manager);
        this.notifications.notifyStatusChange({
          itemType: 'task',
          itemId: saved.id,
          itemName: saved.title,
          oldStatus: before.status,
          newStatus: saved.status,
          recipients,
          tenantId,
          excludeUserId: userId,
          manager,
        });
      }
    }

    return saved;
  }

  /**
   * Update a task directly by ID (for standalone tasks or general updates)
   */
  async updateById(taskId: string, payload: Partial<Task>, userId?: string, opts?: { manager?: EntityManager; tenantId?: string }) {
    const manager = opts?.manager ?? this.repo.manager;
    const tenantId = opts?.tenantId;
    const repo = manager.getRepository(Task);
    const existing = await repo.findOne({ where: { id: taskId } });
    if (!existing) throw new NotFoundException('Task not found');

    // Capture "before" state for notification comparison
    const before = { ...existing };

    const isStandalone = existing.related_object_type === null;

    // Strip classification fields for non-standalone tasks (defense in depth)
    // These fields should not be set on linked tasks - they're either inherited or N/A
    if (!isStandalone) {
      delete payload.source_id;
      delete payload.company_id;
      if (existing.related_object_type === 'project') {
        delete payload.category_id;
        delete payload.stream_id;
      }
    }

    // Validate phase if updating project task
    if (existing.related_object_type === 'project' && existing.related_object_id && payload.phase_id !== undefined && payload.phase_id !== null) {
      const phaseRepo = manager.getRepository(PortfolioProjectPhase);
      const phase = await phaseRepo.findOne({ where: { id: payload.phase_id, project_id: existing.related_object_id } });
      if (!phase) throw new BadRequestException('Phase does not belong to specified project');
    }

    // Validate: Cannot mark task as "done" without time logged (only for project tasks)
    if (existing.related_object_type === 'project' && payload.status === 'done' && existing.status !== 'done') {
      const hasTime = await this.hasTimeLogged(taskId, manager);
      if (!hasTime) {
        throw new BadRequestException('Cannot mark task as done without logging time');
      }
    }

    const next = { ...existing, ...payload } as Task;
    const saved = await repo.save(next);
    await this.audit.log({ table: 'tasks', recordId: saved.id, action: 'update', before: existing, after: saved, userId }, { manager });

    // Fire-and-forget notifications
    if (tenantId) {
      // Notify on task assignment change
      // Exclude users with system roles (e.g., Contact) who cannot log in
      if (before.assignee_user_id !== saved.assignee_user_id && saved.assignee_user_id) {
        const assignee = await manager.query(
          `SELECT u.email FROM users u
           JOIN roles ro ON ro.id = u.role_id
           WHERE u.id = $1 AND u.status = 'enabled'
             AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')`,
          [saved.assignee_user_id]
        );
        if (assignee.length > 0) {
          const assigner = await manager.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
          const assignerName = assigner.length > 0 ? `${assigner[0].first_name} ${assigner[0].last_name}`.trim() || 'Someone' : 'Someone';
          this.notifications.notifyTaskAssigned({
            taskId: saved.id,
            taskTitle: saved.title,
            assigneeId: saved.assignee_user_id,
            assigneeEmail: assignee[0].email,
            assignerName,
            dueDate: saved.due_date ? String(saved.due_date).split('T')[0] : undefined,
            tenantId,
            manager,
          });
        }
      }

      // Notify on status change
      if (before.status !== saved.status) {
        const recipients = await this.notifications.getTaskRecipients(saved.id, manager);
        this.notifications.notifyStatusChange({
          itemType: 'task',
          itemId: saved.id,
          itemName: saved.title,
          oldStatus: before.status,
          newStatus: saved.status,
          recipients,
          tenantId,
          excludeUserId: userId,
          manager,
        });
      }
    }

    return saved;
  }

  async moveTask(
    params: { id: string; next: { type: RelatedType; id: string | null } },
    userId?: string | null,
    opts?: { manager?: EntityManager },
  ) {
    const repo = (opts?.manager ?? this.repo.manager).getRepository(Task);
    const existing = await repo.findOne({ where: { id: params.id } });
    if (!existing) throw new NotFoundException('Task not found');
    const before = { ...existing };
    existing.related_object_type = params.next.type;
    existing.related_object_id = params.next.id;
    const saved = await repo.save(existing);
    await this.audit.log(
      { table: 'tasks', recordId: saved.id, action: 'update', before, after: saved, userId: userId ?? undefined },
      { manager: opts?.manager ?? this.repo.manager },
    );
    await this.userTimeAggregateService.recalculateForTask(saved.id, opts?.manager ?? this.repo.manager);
    return saved;
  }

  async share(taskId: string, dto: ShareItemDto, tenantId: string, userId: string, opts?: { manager?: EntityManager }) {
    const userIds = dto.recipient_user_ids ?? [];
    const rawEmails = dto.recipient_emails ?? [];
    if (userIds.length === 0 && rawEmails.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    const manager = opts?.manager ?? this.repo.manager;

    const task = await manager.findOne(Task, { where: { id: taskId }, select: ['id', 'title'] });
    if (!task) throw new NotFoundException('Task not found');

    const senderRows = await manager.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId],
    );
    const senderName = senderRows.length > 0
      ? `${senderRows[0].first_name} ${senderRows[0].last_name}`.trim() || 'Someone'
      : 'Someone';

    const recipientRows = userIds.length > 0
      ? await manager.query(
          `SELECT u.id AS "userId", u.email, u.first_name AS "firstName", u.last_name AS "lastName"
           FROM users u
           JOIN roles ro ON ro.id = u.role_id
           WHERE u.id = ANY($1) AND u.status = 'enabled'
             AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')`,
          [userIds],
        )
      : [];

    if (recipientRows.length > 0 || rawEmails.length > 0) {
      this.notifications.notifyShare({
        itemType: 'task',
        itemId: taskId,
        itemName: task.title,
        senderName,
        message: dto.message,
        recipients: recipientRows,
        rawEmails,
        tenantId,
      });
    }

    return { success: true };
  }
}
