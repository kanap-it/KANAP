import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { PortfolioActivity, ActivityType } from '../portfolio/portfolio-activity.entity';
import { Task } from './task.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

export interface TaskActivityItem {
  id: string;
  type: ActivityType;
  content: string | null;
  context: string | null;
  author_id: string | null;
  first_name: string | null;
  last_name: string | null;
  decision_outcome: string | null;
  changed_fields: Record<string, [unknown, unknown]> | null;
  created_at: Date;
  updated_at: Date | null;
}

export interface CreateTaskActivityDto {
  type: 'comment' | 'change';
  content?: string;
  context?: string;
  changed_fields?: Record<string, [unknown, unknown]>;
}

@Injectable()
export class TaskActivitiesService {
  constructor(
    @InjectRepository(PortfolioActivity)
    private readonly activityRepo: Repository<PortfolioActivity>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * List activities for a task
   */
  async listForTask(
    taskId: string,
    opts?: { manager?: EntityManager },
  ): Promise<TaskActivityItem[]> {
    const mg = opts?.manager ?? this.activityRepo.manager;

    const rows = await mg.query<Array<{
      id: string;
      type: ActivityType;
      content: string | null;
      context: string | null;
      author_id: string | null;
      first_name: string | null;
      last_name: string | null;
      decision_outcome: string | null;
      changed_fields: Record<string, [unknown, unknown]> | null;
      created_at: Date;
      updated_at: Date | null;
    }>>(
      `SELECT
        a.id,
        a.type,
        a.content,
        a.context,
        a.author_id,
        u.first_name,
        u.last_name,
        a.decision_outcome,
        a.changed_fields,
        a.created_at,
        a.updated_at
      FROM portfolio_activities a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.task_id = $1
        AND a.tenant_id = app_current_tenant()
      ORDER BY a.created_at DESC`,
      [taskId],
    );

    return rows;
  }

  /**
   * Create a comment or change activity for a task
   */
  async create(
    taskId: string,
    dto: CreateTaskActivityDto,
    tenantId: string,
    userId: string | null,
    opts?: { manager?: EntityManager },
  ): Promise<PortfolioActivity> {
    const mg = opts?.manager ?? this.activityRepo.manager;

    // Verify task exists
    const task = await mg.getRepository(Task).findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const repo = mg.getRepository(PortfolioActivity);
    const activity = repo.create({
      task_id: taskId,
      tenant_id: tenantId,
      author_id: userId,
      type: dto.type || 'comment',
      content: dto.content?.trim() || null,
      context: dto.context?.trim() || null,
      changed_fields: dto.changed_fields || null,
    });

    const saved = await repo.save(activity);

    // Fire-and-forget notification for comments
    if (dto.type === 'comment' && dto.content && userId) {
      const author = await mg.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      const authorName = author.length > 0 ? `${author[0].first_name} ${author[0].last_name}`.trim() || 'Someone' : 'Someone';
      const recipients = await this.notifications.getTaskRecipients(taskId, mg);
      this.notifications.notifyComment({
        itemType: 'task',
        itemId: taskId,
        itemName: task.title,
        authorId: userId,
        authorName,
        commentContent: dto.content,
        recipients: recipients.map(r => ({ userId: r.userId, email: r.email })),
        tenantId,
        manager: mg,
      });
    }

    return saved;
  }

  /**
   * Log a field change activity (internal use)
   */
  async logChange(
    taskId: string,
    changedFields: Record<string, [unknown, unknown]>,
    tenantId: string,
    userId: string | null,
    opts?: { manager?: EntityManager },
  ): Promise<PortfolioActivity> {
    return this.create(
      taskId,
      {
        type: 'change',
        changed_fields: changedFields,
      },
      tenantId,
      userId,
      opts,
    );
  }

  /**
   * Update a comment activity (author-only)
   */
  async updateComment(
    taskId: string,
    activityId: string,
    content: string,
    userId: string,
    opts?: { manager?: EntityManager },
  ): Promise<PortfolioActivity> {
    const mg = opts?.manager ?? this.activityRepo.manager;
    const repo = mg.getRepository(PortfolioActivity);

    // Find the activity
    const activity = await repo.findOne({ where: { id: activityId, task_id: taskId } });
    if (!activity) {
      throw new NotFoundException('Comment not found');
    }

    // Only allow editing comments, not decisions or changes
    if (activity.type !== 'comment') {
      throw new BadRequestException('Only comments can be edited');
    }

    // Only allow the author to edit
    if (activity.author_id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    activity.content = content?.trim() || null;
    activity.updated_at = new Date();

    return repo.save(activity);
  }
}
