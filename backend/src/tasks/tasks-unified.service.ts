import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Task, TaskPriorityLevel } from './task.entity';
import { TaskTimeEntry } from './task-time-entry.entity';
import { AuditService } from '../audit/audit.service';
import { ItemNumberService } from '../common/item-number.service';
import { PortfolioProjectPhase } from '../portfolio/portfolio-project-phase.entity';
import { PortfolioActivity } from '../portfolio/portfolio-activity.entity';
import { UserTimeAggregateService } from '../portfolio/services/user-time-aggregate.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ShareItemDto } from '../notifications/dto/share-item.dto';
import { TaskActivitiesService } from './task-activities.service';
import { TaskAttachmentsService } from './task-attachments.service';
import { detectChanges, resolveDisplayNames, TASK_TRACKED_FIELDS, FieldConfig } from '../common/change-detection';
import { normalizeMarkdownRichText } from '../common/markdown-rich-text';

export type RelatedType = 'spend_item' | 'contract' | 'capex_item' | 'project' | null;
type ProjectDefaults = {
  source_id: string | null;
  category_id: string | null;
  stream_id: string | null;
  company_id: string | null;
};

type TaskAuditOptions = {
  source?: string;
  sourceRef?: string | null;
};

type TaskMutationOptions = {
  manager?: EntityManager;
  tenantId?: string;
  audit?: TaskAuditOptions;
};

@Injectable()
export class TasksUnifiedService {
  private readonly logger = new Logger(TasksUnifiedService.name);

  constructor(
    @InjectRepository(Task) private readonly repo: Repository<Task>,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
    private readonly userTimeAggregateService: UserTimeAggregateService,
    private readonly notifications: NotificationsService,
    private readonly itemNumberService: ItemNumberService,
    private readonly taskActivitiesSvc: TaskActivitiesService,
    private readonly taskAttachmentsSvc: TaskAttachmentsService,
  ) {}

  /**
   * Check if a task has any time logged
   */
  private async hasTimeLogged(taskId: string, manager: EntityManager): Promise<boolean> {
    const repo = manager.getRepository(TaskTimeEntry);
    const count = await repo.count({ where: { task_id: taskId } });
    return count > 0;
  }

  private isNonProjectLinked(type: RelatedType): type is 'spend_item' | 'contract' | 'capex_item' {
    return type === 'spend_item' || type === 'contract' || type === 'capex_item';
  }

  private hasOwn(payload: Partial<Task>, key: keyof Task): boolean {
    return Object.prototype.hasOwnProperty.call(payload, key);
  }

  private notifyTaskAssignedSafely(params: Parameters<NotificationsService['notifyTaskAssigned']>[0]): void {
    void this.notifications.notifyTaskAssigned(params).catch((error) => {
      this.logger.error(`Failed to notify task assignment for task ${params.taskId}: ${error}`);
    });
  }

  private notifyStatusChangeSafely(params: Parameters<NotificationsService['notifyStatusChange']>[0]): void {
    void this.notifications.notifyStatusChange(params).catch((error) => {
      this.logger.error(`Failed to notify task status change for task ${params.itemId}: ${error}`);
    });
  }

  private async queueTaskAssignmentNotification(
    saved: Task,
    previousAssigneeId: string | null,
    userId: string | undefined,
    tenantId: string | undefined,
    manager: EntityManager,
  ): Promise<void> {
    if (!tenantId || !saved.assignee_user_id || previousAssigneeId === saved.assignee_user_id) {
      return;
    }

    const assignee = await manager.query(
      `SELECT u.email, u.locale FROM users u
       JOIN roles ro ON ro.id = u.role_id
       WHERE u.id = $1 AND u.status = 'enabled'
         AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')`,
      [saved.assignee_user_id],
    );

    if (assignee.length === 0) return;

    const assigner = userId
      ? await manager.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId])
      : [];
    const assignerName = assigner.length > 0
      ? `${assigner[0].first_name} ${assigner[0].last_name}`.trim() || 'Someone'
      : 'Someone';

    this.notifyTaskAssignedSafely({
      taskId: saved.id,
      taskTitle: saved.title,
      assigneeId: saved.assignee_user_id,
      assigneeEmail: assignee[0].email,
      assignerName,
      dueDate: saved.due_date ? String(saved.due_date).split('T')[0] : undefined,
      tenantId,
      manager,
      locale: assignee[0].locale,
    });
  }

  private async resolveRelatedObjectName(
    type: RelatedType,
    id: string | null,
    manager: EntityManager,
  ): Promise<string | null> {
    if (!type || !id) return null;

    if (type === 'project') {
      const [row] = await manager.query(
        'SELECT item_number, name FROM portfolio_projects WHERE id = $1 LIMIT 1',
        [id],
      );
      if (!row) return id;
      const prefix = row.item_number ? `PRJ-${row.item_number}: ` : '';
      return `${prefix}${row.name}`;
    }

    if (type === 'spend_item') {
      const [row] = await manager.query(
        'SELECT product_name FROM spend_items WHERE id = $1 LIMIT 1',
        [id],
      );
      if (!row) return id;
      return `Spend: ${row.product_name}`;
    }

    if (type === 'contract') {
      const [row] = await manager.query(
        'SELECT name FROM contracts WHERE id = $1 LIMIT 1',
        [id],
      );
      if (!row) return id;
      return `Contract: ${row.name}`;
    }

    if (type === 'capex_item') {
      const [row] = await manager.query(
        'SELECT description FROM capex_items WHERE id = $1 LIMIT 1',
        [id],
      );
      if (!row) return id;
      return `CAPEX: ${row.description}`;
    }

    return id;
  }

  private async resolveTargetContext(
    target: { type: RelatedType; id: string | null },
    manager: EntityManager,
  ): Promise<{ type: RelatedType; id: string | null; projectDefaults?: ProjectDefaults }> {
    if (target.type === null) {
      if (target.id !== null) {
        throw new BadRequestException('related_object_id must be null when related_object_type is null');
      }
      return { type: null, id: null };
    }

    if (!target.id) {
      throw new BadRequestException('related_object_id is required when related_object_type is set');
    }

    if (target.type === 'project') {
      const [project] = await manager.query(
        'SELECT id, source_id, category_id, stream_id, company_id FROM portfolio_projects WHERE id = $1 LIMIT 1',
        [target.id],
      );
      if (!project) throw new NotFoundException('Project not found');
      return {
        type: 'project',
        id: target.id,
        projectDefaults: {
          source_id: project.source_id ?? null,
          category_id: project.category_id ?? null,
          stream_id: project.stream_id ?? null,
          company_id: project.company_id ?? null,
        },
      };
    }

    const tableByType: Record<'spend_item' | 'contract' | 'capex_item', { table: string; label: string }> = {
      spend_item: { table: 'spend_items', label: 'Spend item' },
      contract: { table: 'contracts', label: 'Contract' },
      capex_item: { table: 'capex_items', label: 'CAPEX item' },
    };
    const targetMeta = tableByType[target.type];
    const [row] = await manager.query(`SELECT id FROM ${targetMeta.table} WHERE id = $1 LIMIT 1`, [target.id]);
    if (!row) throw new NotFoundException(`${targetMeta.label} not found`);
    return { type: target.type, id: target.id };
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

  async createForTarget(target: { type: RelatedType; id: string | null; payload: Partial<Task> }, userId?: string, opts?: TaskMutationOptions) {
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

    // Validate classification fields - only allowed for standalone and project tasks
    const canEditClassification = isStandalone || target.type === 'project';
    if (!canEditClassification) {
      if (payload.source_id !== undefined || payload.company_id !== undefined ||
          payload.category_id !== undefined || payload.stream_id !== undefined) {
        throw new BadRequestException('Classification fields can only be set on standalone or project tasks');
      }
    }

    // Default classification from project if not explicitly provided
    let defaults = { source_id: null as any, category_id: null as any, stream_id: null as any, company_id: null as any };
    if (target.type === 'project' && target.id) {
      const [project] = await manager.query(
        'SELECT source_id, category_id, stream_id, company_id FROM portfolio_projects WHERE id = $1',
        [target.id],
      );
      if (project) defaults = project;
    }

    // Build entity with new fields
    const entity = repo.create({
      related_object_type: target.type,
      related_object_id: target.id,
      title: payload.title,
      description: normalizeMarkdownRichText(payload.description, { fieldName: 'description' }) as any,
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
      // Classification fields (populated for standalone and project tasks)
      source_id: canEditClassification ? (payload.source_id !== undefined ? payload.source_id : defaults.source_id) as any : null,
      category_id: canEditClassification ? (payload.category_id !== undefined ? payload.category_id : defaults.category_id) as any : null,
      stream_id: canEditClassification ? (payload.stream_id !== undefined ? payload.stream_id : defaults.stream_id) as any : null,
      company_id: canEditClassification ? (payload.company_id !== undefined ? payload.company_id : defaults.company_id) as any : null,
      creator_id: (payload.creator_id ?? userId ?? null) as any,
      owner_ids: payload.owner_ids ?? [],
      viewer_ids: payload.viewer_ids ?? [],
    });
    if (opts?.tenantId) {
      entity.item_number = await this.itemNumberService.nextItemNumber('task', opts.tenantId, manager);
    }
    const saved = await repo.save(entity);
    await this.audit.log({
      table: 'tasks',
      recordId: saved.id,
      action: 'create',
      before: null,
      after: saved,
      userId,
      source: opts?.audit?.source,
      sourceRef: opts?.audit?.sourceRef ?? null,
    }, { manager });

    if (target.type === 'project' && target.id) {
      if (!opts?.tenantId) throw new BadRequestException('tenantId is required for project task activity logging');
      if (!userId) throw new BadRequestException('userId is required for project task activity logging');
      await manager.getRepository(PortfolioActivity).save({
        project_id: target.id,
        tenant_id: opts.tenantId,
        author_id: userId,
        type: 'change',
        changed_fields: { task_created: [null, saved.title] },
      });
    }

    await this.queueTaskAssignmentNotification(saved, null, userId, opts?.tenantId, manager);

    return saved;
  }

  async updateForTarget(target: { type: RelatedType; id: string | null; payload: Partial<Task> & { id: string } }, userId?: string, opts?: TaskMutationOptions) {
    const manager = opts?.manager ?? this.repo.manager;
    const tenantId = opts?.tenantId;
    const repo = manager.getRepository(Task);
    const { payload } = target;
    if (!payload?.id) throw new BadRequestException('id is required');
    const existing = await repo.findOne({ where: { id: payload.id } });
    if (!existing) throw new NotFoundException('Task not found');

    const normalizedDescription = this.hasOwn(payload, 'description')
      ? normalizeMarkdownRichText(payload.description, { fieldName: 'description' })
      : undefined;

    // Capture "before" state for notification comparison
    const before = { ...existing };

    const isStandalone = existing.related_object_type === null;

    // Validate task belongs to target (skip for standalone tasks)
    if (!isStandalone) {
      if (existing.related_object_type !== target.type || existing.related_object_id !== target.id) {
        throw new BadRequestException('Task does not belong to target');
      }
    }

    // Strip classification fields for non-standalone, non-project tasks (defense in depth)
    const canEditClassification = isStandalone || existing.related_object_type === 'project';
    if (!canEditClassification) {
      delete payload.source_id;
      delete payload.company_id;
      delete payload.category_id;
      delete payload.stream_id;
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
    if (this.hasOwn(payload, 'description')) {
      next.description = normalizedDescription as any;
    }
    const saved = await repo.save(next);
    await this.audit.log({
      table: 'tasks',
      recordId: saved.id,
      action: 'update',
      before: existing,
      after: saved,
      userId,
      source: opts?.audit?.source,
      sourceRef: opts?.audit?.sourceRef ?? null,
    }, { manager });

    if (this.hasOwn(payload, 'description') && before.description !== saved.description) {
      await this.taskAttachmentsSvc.cleanupOrphanedImages(saved.id, 'description', before.description, saved.description, {
        manager,
      });
    }

    const changes = detectChanges(before as unknown as Record<string, unknown>, saved as unknown as Record<string, unknown>, TASK_TRACKED_FIELDS);
    if (changes.length > 0) {
      if (!tenantId) throw new BadRequestException('tenantId is required for task change activity logging');
      if (!userId) throw new BadRequestException('userId is required for task change activity logging');
      const changedFields = await resolveDisplayNames(changes, TASK_TRACKED_FIELDS, manager);
      await this.taskActivitiesSvc.logChange(saved.id, changedFields, tenantId, userId, { manager });
    }

    // Fire-and-forget notifications
    if (tenantId) {
      await this.queueTaskAssignmentNotification(saved, before.assignee_user_id, userId, tenantId, manager);

      // Notify on status change
      if (before.status !== saved.status) {
        const recipients = await this.notifications.getTaskRecipients(saved.id, manager);
        this.notifyStatusChangeSafely({
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
  async updateById(taskId: string, payload: Partial<Task>, userId?: string, opts?: TaskMutationOptions) {
    const manager = opts?.manager ?? this.repo.manager;
    const tenantId = opts?.tenantId;
    const repo = manager.getRepository(Task);
    const existing = await repo.findOne({ where: { id: taskId } });
    if (!existing) throw new NotFoundException('Task not found');

    // Capture "before" state for notification comparison
    const before = { ...existing };

    const nextPayload = { ...payload } as Partial<Task>;
    const hasRelatedType = this.hasOwn(nextPayload, 'related_object_type');
    const hasRelatedId = this.hasOwn(nextPayload, 'related_object_id');
    if (hasRelatedType !== hasRelatedId) {
      throw new BadRequestException('related_object_type and related_object_id must be provided together');
    }

    const resolvedTarget = await this.resolveTargetContext(
      hasRelatedType
        ? {
            type: (nextPayload.related_object_type ?? null) as RelatedType,
            id: (nextPayload.related_object_id ?? null) as string | null,
          }
        : {
            type: existing.related_object_type,
            id: existing.related_object_id,
          },
      manager,
    );

    if (this.hasOwn(nextPayload, 'description')) {
      nextPayload.description = normalizeMarkdownRichText(nextPayload.description, { fieldName: 'description' }) as any;
    }

    const relationChanged =
      resolvedTarget.type !== existing.related_object_type ||
      resolvedTarget.id !== existing.related_object_id;

    delete nextPayload.related_object_type;
    delete nextPayload.related_object_id;

    // Strip classification fields for non-standalone, non-project tasks (defense in depth)
    const canEditClassification = resolvedTarget.type === null || resolvedTarget.type === 'project';
    if (!canEditClassification) {
      delete nextPayload.source_id;
      delete nextPayload.company_id;
      delete nextPayload.category_id;
      delete nextPayload.stream_id;
    }

    if (relationChanged) {
      if (existing.related_object_type === 'project' && resolvedTarget.type !== 'project') {
        nextPayload.phase_id = null;
      }

      if (resolvedTarget.type === null) {
        nextPayload.phase_id = null;
      }

      if (this.isNonProjectLinked(resolvedTarget.type)) {
        nextPayload.phase_id = null;
        nextPayload.source_id = null;
        nextPayload.category_id = null;
        nextPayload.stream_id = null;
        nextPayload.company_id = null;
      }

      if (resolvedTarget.type === 'project' && resolvedTarget.id) {
        const defaults = resolvedTarget.projectDefaults ?? {
          source_id: null,
          category_id: null,
          stream_id: null,
          company_id: null,
        };
        const isDifferentProject = existing.related_object_type !== 'project' || existing.related_object_id !== resolvedTarget.id;
        if (isDifferentProject && nextPayload.phase_id === undefined) {
          nextPayload.phase_id = null;
        }

        const classificationKeys: Array<'source_id' | 'category_id' | 'stream_id' | 'company_id'> = [
          'source_id', 'category_id', 'stream_id', 'company_id',
        ];
        for (const key of classificationKeys) {
          if ((nextPayload as any)[key] !== undefined) continue;
          const currentValue = (existing as any)[key];
          if (currentValue !== null && currentValue !== undefined) continue;
          const defaultValue = (defaults as any)[key];
          if (defaultValue !== null && defaultValue !== undefined) {
            (nextPayload as any)[key] = defaultValue;
          }
        }
      }
    }

    // Validate phase if updating project task
    if (resolvedTarget.type === 'project' && resolvedTarget.id && nextPayload.phase_id !== undefined && nextPayload.phase_id !== null) {
      const phaseRepo = manager.getRepository(PortfolioProjectPhase);
      const phase = await phaseRepo.findOne({ where: { id: nextPayload.phase_id, project_id: resolvedTarget.id } });
      if (!phase) throw new BadRequestException('Phase does not belong to specified project');
    }

    // Validate: Cannot mark task as "done" without time logged (only for project tasks)
    if (resolvedTarget.type === 'project' && nextPayload.status === 'done' && existing.status !== 'done') {
      const hasTime = await this.hasTimeLogged(taskId, manager);
      if (!hasTime) {
        throw new BadRequestException('Cannot mark task as done without logging time');
      }
    }

    const next = {
      ...existing,
      ...nextPayload,
      related_object_type: resolvedTarget.type,
      related_object_id: resolvedTarget.id,
    } as Task;
    const saved = await repo.save(next);
    await this.audit.log({
      table: 'tasks',
      recordId: saved.id,
      action: 'update',
      before: existing,
      after: saved,
      userId,
      source: opts?.audit?.source,
      sourceRef: opts?.audit?.sourceRef ?? null,
    }, { manager });

    const changes = detectChanges(before as unknown as Record<string, unknown>, saved as unknown as Record<string, unknown>, TASK_TRACKED_FIELDS);
    if (relationChanged) {
      const oldRelated = await this.resolveRelatedObjectName(before.related_object_type as RelatedType, before.related_object_id, manager);
      const newRelated = await this.resolveRelatedObjectName(saved.related_object_type as RelatedType, saved.related_object_id, manager);
      if (oldRelated !== newRelated) {
        changes.push({ field: 'related_to', before: oldRelated, after: newRelated });
      }
    }
    if (changes.length > 0) {
      if (!tenantId) throw new BadRequestException('tenantId is required for task change activity logging');
      if (!userId) throw new BadRequestException('userId is required for task change activity logging');
      const taskChangeFields: FieldConfig[] = [...TASK_TRACKED_FIELDS, { field: 'related_to' }];
      const changedFields = await resolveDisplayNames(changes, taskChangeFields, manager);
      await this.taskActivitiesSvc.logChange(saved.id, changedFields, tenantId, userId, { manager });
    }

    if (relationChanged) {
      await this.userTimeAggregateService.recalculateForTask(saved.id, manager);
    }

    // Fire-and-forget notifications
    if (tenantId) {
      await this.queueTaskAssignmentNotification(saved, before.assignee_user_id, userId, tenantId, manager);

      // Notify on status change
      if (before.status !== saved.status) {
        const recipients = await this.notifications.getTaskRecipients(saved.id, manager);
        this.notifyStatusChangeSafely({
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
    opts?: { manager?: EntityManager; tenantId?: string },
  ) {
    return this.updateById(
      params.id,
      {
        related_object_type: params.next.type as any,
        related_object_id: params.next.id,
      } as Partial<Task>,
      userId ?? undefined,
      { manager: opts?.manager ?? this.repo.manager, tenantId: opts?.tenantId },
    );
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
          `SELECT u.id AS "userId", u.email, u.first_name AS "firstName", u.last_name AS "lastName", u.locale
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
