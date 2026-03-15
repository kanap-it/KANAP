import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { EmailService } from '../email/email.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationsService } from './notifications.service';
import { buildWeeklyReviewEmail } from './notification-templates';
import { resolveNotificationBaseUrl } from '../common/url';
import { ACTIVE_TASK_STATUSES } from '../tasks/task.entity';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class ScheduledNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledNotificationsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.logger.log('ScheduledNotificationsService initialized - cron jobs registered');
    this.logger.log(`Current server time: ${dayjs().format('YYYY-MM-DD HH:mm:ss')} UTC`);
  }

  // Cache for tenant slugs (tenantId -> slug)
  private tenantSlugCache = new Map<string, string>();

  /**
   * Get the tenant-specific base URL (e.g. https://acme.dev.kanap.net).
   * Falls back to the raw APP_URL if the slug cannot be resolved.
   */
  private async getTenantAppUrl(tenantId: string): Promise<string> {
    try {
      let slug = this.tenantSlugCache.get(tenantId);
      if (!slug) {
        const result = await this.dataSource.query(
          `SELECT slug FROM tenants WHERE id = $1`,
          [tenantId],
        );
        if (result.length > 0 && result[0].slug) {
          slug = result[0].slug;
          this.tenantSlugCache.set(tenantId, slug);
        }
      }
      return resolveNotificationBaseUrl(slug ?? null);
    } catch (error) {
      this.logger.warn(`Failed to get tenant slug for ${tenantId}: ${error}`);
    }

    return resolveNotificationBaseUrl(null);
  }

  // ============================================
  // EXPIRATION WARNINGS - Daily at 8 AM UTC
  // ============================================

  @Cron('0 8 * * *')
  async checkExpirations(): Promise<void> {
    this.logger.log('[Expirations] Running expiration warnings check...');

    try {
      // Get all active tenants (tenants table has no RLS)
      const tenants = await this.dataSource.query(`
        SELECT id FROM tenants WHERE status = 'active'
      `);

      this.logger.log(`[Expirations] Processing ${tenants.length} active tenants`);

      let totalContracts = 0;
      let totalOpex = 0;

      for (const tenant of tenants) {
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();
        await runner.startTransaction();

        try {
          // Set tenant context for RLS
          await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);

          const contractCount = await this.checkContractExpirationsForTenant(runner.manager, tenant.id);
          const opexCount = await this.checkOpexExpirationsForTenant(runner.manager, tenant.id);

          totalContracts += contractCount;
          totalOpex += opexCount;

          await runner.commitTransaction();
        } catch (error) {
          await runner.rollbackTransaction().catch(() => {});
          throw error;
        } finally {
          await runner.release();
        }
      }

      this.logger.log(
        `[Expirations] Complete: ${totalContracts} contracts, ${totalOpex} OPEX items processed`,
      );
    } catch (error) {
      this.logger.error(`[Expirations] Failed: ${error}`);
    }
  }

  private async checkContractExpirationsForTenant(mg: any, tenantId: string): Promise<number> {
    // Find contracts expiring within 30 days
    // Contract end_date is calculated as start_date + duration_months
    const contracts = await mg.query(`
      SELECT
        c.id,
        c.name,
        c.tenant_id,
        c.owner_user_id,
        c.start_date,
        c.duration_months,
        c.notice_period_months,
        (c.start_date + (c.duration_months || ' months')::interval - '1 day'::interval)::date as end_date,
        ((c.start_date + (c.duration_months || ' months')::interval - '1 day'::interval) - (c.notice_period_months || ' months')::interval)::date as cancellation_deadline,
        u.id as owner_id,
        u.email as owner_email
      FROM contracts c
      LEFT JOIN users u ON u.id = c.owner_user_id AND u.status = 'enabled'
      WHERE c.status = 'ENABLED'
        AND c.owner_user_id IS NOT NULL
        AND (
          -- End date within 30 days
          (c.start_date + (c.duration_months || ' months')::interval - '1 day'::interval)::date
            BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
          OR
          -- Cancellation deadline within 30 days
          ((c.start_date + (c.duration_months || ' months')::interval - '1 day'::interval) - (c.notice_period_months || ' months')::interval)::date
            BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        )
    `);

    for (const contract of contracts) {
      if (!contract.owner_email) continue;

      const endDate = dayjs(contract.end_date);
      const cancellationDeadline = dayjs(contract.cancellation_deadline);
      const today = dayjs();

      // Check cancellation deadline first (more urgent)
      if (cancellationDeadline.isAfter(today) && cancellationDeadline.diff(today, 'day') <= 30) {
        const daysRemaining = cancellationDeadline.diff(today, 'day');
        await this.notificationsService.notifyExpirationWarning({
          itemType: 'contract',
          itemId: contract.id,
          itemName: contract.name,
          expirationDate: cancellationDeadline.format('YYYY-MM-DD'),
          daysRemaining,
          warningType: 'cancellation_deadline',
          recipients: [{ userId: contract.owner_id, email: contract.owner_email }],
          tenantId: contract.tenant_id,
          manager: mg,
        });
      }

      // Check expiration
      if (endDate.isAfter(today) && endDate.diff(today, 'day') <= 30) {
        const daysRemaining = endDate.diff(today, 'day');
        await this.notificationsService.notifyExpirationWarning({
          itemType: 'contract',
          itemId: contract.id,
          itemName: contract.name,
          expirationDate: endDate.format('YYYY-MM-DD'),
          daysRemaining,
          warningType: 'expiration',
          recipients: [{ userId: contract.owner_id, email: contract.owner_email }],
          tenantId: contract.tenant_id,
          manager: mg,
        });
      }
    }

    return contracts.length;
  }

  private async checkOpexExpirationsForTenant(mg: any, tenantId: string): Promise<number> {
    // Find OPEX items expiring within 30 days
    const opexItems = await mg.query(`
      SELECT
        s.id,
        s.product_name,
        s.tenant_id,
        s.effective_end,
        s.owner_it_id,
        s.owner_business_id,
        it_user.id as it_owner_id,
        it_user.email as it_owner_email,
        biz_user.id as biz_owner_id,
        biz_user.email as biz_owner_email
      FROM spend_items s
      LEFT JOIN users it_user ON it_user.id = s.owner_it_id AND it_user.status = 'enabled'
      LEFT JOIN users biz_user ON biz_user.id = s.owner_business_id AND biz_user.status = 'enabled'
      WHERE s.status = 'ENABLED'
        AND s.effective_end IS NOT NULL
        AND s.effective_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND (s.owner_it_id IS NOT NULL OR s.owner_business_id IS NOT NULL)
    `);

    for (const item of opexItems) {
      const expirationDate = dayjs(item.effective_end);
      const daysRemaining = expirationDate.diff(dayjs(), 'day');

      const recipients = [];
      if (item.it_owner_email) {
        recipients.push({ userId: item.it_owner_id, email: item.it_owner_email });
      }
      if (item.biz_owner_email) {
        recipients.push({ userId: item.biz_owner_id, email: item.biz_owner_email });
      }

      if (recipients.length > 0) {
        await this.notificationsService.notifyExpirationWarning({
          itemType: 'opex',
          itemId: item.id,
          itemName: item.product_name,
          expirationDate: expirationDate.format('YYYY-MM-DD'),
          daysRemaining,
          warningType: 'expiration',
          recipients,
          tenantId: item.tenant_id,
          manager: mg,
        });
      }
    }

    return opexItems.length;
  }

  private getCurrentWeekScheduledSlot(
    userNow: dayjs.Dayjs,
    weeklyReviewDay: number,
    weeklyReviewHour: number,
  ): dayjs.Dayjs {
    return userNow
      .startOf('day')
      .subtract(userNow.day(), 'day')
      .add(weeklyReviewDay, 'day')
      .hour(weeklyReviewHour)
      .minute(0)
      .second(0)
      .millisecond(0);
  }

  private getMostRecentScheduledSlot(
    userNow: dayjs.Dayjs,
    weeklyReviewDay: number,
    weeklyReviewHour: number,
  ): dayjs.Dayjs {
    const scheduledThisWeek = this.getCurrentWeekScheduledSlot(userNow, weeklyReviewDay, weeklyReviewHour);
    if (userNow.isBefore(scheduledThisWeek)) {
      return scheduledThisWeek.subtract(7, 'day');
    }
    return scheduledThisWeek;
  }

  private getNextScheduledSlot(
    userNow: dayjs.Dayjs,
    weeklyReviewDay: number,
    weeklyReviewHour: number,
  ): dayjs.Dayjs {
    const scheduledThisWeek = this.getCurrentWeekScheduledSlot(userNow, weeklyReviewDay, weeklyReviewHour);
    if (userNow.isBefore(scheduledThisWeek)) {
      return scheduledThisWeek;
    }
    return scheduledThisWeek.add(7, 'day');
  }

  private evaluateWeeklyReviewSchedule(
    now: dayjs.Dayjs,
    user: {
      timezone: string;
      weekly_review_day: number;
      weekly_review_hour: number;
      weekly_review_last_sent_at?: string | null;
      preferences_updated_at?: string | null;
    },
  ): { shouldSend: boolean; userNow: dayjs.Dayjs; dueAt: dayjs.Dayjs; reason: string } {
    const userNow = now.tz(user.timezone);
    const dueAt = this.getMostRecentScheduledSlot(
      userNow,
      user.weekly_review_day,
      user.weekly_review_hour,
    );

    const lastSentAt = user.weekly_review_last_sent_at
      ? dayjs(user.weekly_review_last_sent_at).tz(user.timezone)
      : null;
    if (lastSentAt && (lastSentAt.isAfter(dueAt) || lastSentAt.isSame(dueAt))) {
      return { shouldSend: false, userNow, dueAt, reason: 'already_sent_for_slot' };
    }

    const prefsUpdatedAt = user.preferences_updated_at
      ? dayjs(user.preferences_updated_at).tz(user.timezone)
      : null;
    if (!lastSentAt && prefsUpdatedAt && prefsUpdatedAt.isAfter(dueAt)) {
      return { shouldSend: false, userNow, dueAt, reason: 'schedule_updated_after_due_slot' };
    }

    return { shouldSend: true, userNow, dueAt, reason: 'due' };
  }

  private async markWeeklyReviewSent(mg: any, userId: string, tenantId: string): Promise<void> {
    await mg.query(
      `UPDATE user_notification_preferences
       SET weekly_review_last_sent_at = now()
       WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    );
  }

  // ============================================
  // WEEKLY REVIEW - Every hour at minute 0
  // ============================================

  @Cron('0 * * * *')
  async sendWeeklyReviews(): Promise<void> {
    const now = dayjs();
    this.logger.log(
      `[WeeklyReview] Cron triggered at ${now.format('YYYY-MM-DD HH:mm:ss')} UTC`,
    );

    try {
      // First, get all active tenants (tenants table has no RLS)
      const tenants = await this.dataSource.query(`
        SELECT id FROM tenants WHERE status = 'active'
      `);

      this.logger.log(`[WeeklyReview] Processing ${tenants.length} active tenants`);

      let totalSent = 0;
      let totalSkipped = 0;
      let totalUsers = 0;

      for (const tenant of tenants) {
        try {
          // Create a query runner with tenant context for RLS
          const runner = this.dataSource.createQueryRunner();
          await runner.connect();
          await runner.startTransaction();

          try {
            // Set tenant context for RLS
            await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);

            // Find users opted in to weekly reviews within this tenant.
            const users = await runner.query(`
              SELECT
                u.id as user_id,
                u.tenant_id,
                COALESCE(p.weekly_review_day, 1) as weekly_review_day,
                COALESCE(p.weekly_review_hour, 8) as weekly_review_hour,
                COALESCE(p.timezone, 'Europe/Paris') as timezone,
                p.weekly_review_last_sent_at,
                p.updated_at as preferences_updated_at,
                u.email,
                u.first_name,
                u.last_name
              FROM users u
              JOIN roles ro ON ro.id = u.role_id
              LEFT JOIN user_notification_preferences p
                ON p.user_id = u.id AND p.tenant_id = u.tenant_id
              WHERE u.status = 'enabled'
                AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')
                AND COALESCE(p.weekly_review_enabled, false) = true
                AND COALESCE(p.emails_enabled, false) = true
            `);

            totalUsers += users.length;
            this.logger.log(`[WeeklyReview] Tenant ${tenant.id}: ${users.length} eligible users`);

            for (const user of users) {
              try {
                const schedule = this.evaluateWeeklyReviewSchedule(now, user);
                if (schedule.shouldSend) {
                  this.logger.log(
                    `[WeeklyReview] Sending to ${user.email} (tz=${user.timezone}, local=${schedule.userNow.format('ddd HH:mm')}, due=${schedule.dueAt.format('ddd HH:mm')})`,
                  );
                  const sent = await this.sendWeeklyReviewForUser(user, runner.manager);
                  if (sent) {
                    await this.markWeeklyReviewSent(runner.manager, user.user_id, user.tenant_id);
                    totalSent++;
                  } else {
                    totalSkipped++;
                  }
                } else {
                  totalSkipped++;
                  // Log first few skipped users for debugging
                  if (totalSkipped <= 3) {
                    this.logger.debug(
                      `[WeeklyReview] Skipped ${user.email}: reason=${schedule.reason}, local=${schedule.userNow.format('ddd HH:mm')}, due=${schedule.dueAt.format('ddd HH:mm')}, wants day=${user.weekly_review_day} hour=${user.weekly_review_hour}`,
                    );
                  }
                }
              } catch (tzError) {
                this.logger.warn(`[WeeklyReview] Failed for ${user.user_id}: ${tzError}`);
              }
            }

            await runner.commitTransaction();
          } catch (error) {
            await runner.rollbackTransaction().catch(() => {});
            throw error;
          } finally {
            await runner.release();
          }
        } catch (tenantError) {
          this.logger.warn(`[WeeklyReview] Failed for tenant ${tenant.id}: ${tenantError}`);
        }
      }

      this.logger.log(
        `[WeeklyReview] Complete: ${totalUsers} users found, sent=${totalSent}, skipped=${totalSkipped}`,
      );
    } catch (error) {
      this.logger.error(`[WeeklyReview] Failed: ${error}`);
    }
  }

  /**
   * Send a test weekly review email to the current user.
   * Used to verify the email pipeline works.
   */
  async sendTestWeeklyReview(
    userId: string,
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      // Set tenant context for RLS
      await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);

      // Get user data with the same role + preference gates used by scheduler.
      const users = await runner.query(
        `SELECT
          u.id as user_id,
          u.tenant_id,
          u.email,
          u.first_name,
          u.last_name,
          COALESCE(p.weekly_review_enabled, false) as weekly_review_enabled,
          COALESCE(p.emails_enabled, false) as emails_enabled,
          COALESCE(p.weekly_review_day, 1) as weekly_review_day,
          COALESCE(p.weekly_review_hour, 8) as weekly_review_hour,
          COALESCE(p.timezone, 'Europe/Paris') as timezone,
          p.weekly_review_last_sent_at,
          p.updated_at as preferences_updated_at,
          ro.is_system as role_is_system,
          ro.role_name
        FROM users u
        JOIN roles ro ON ro.id = u.role_id
        LEFT JOIN user_notification_preferences p ON p.user_id = u.id AND p.tenant_id = u.tenant_id
        WHERE u.id = $1
          AND u.tenant_id = $2
          AND u.status = 'enabled'`,
        [userId, tenantId],
      );

      if (users.length === 0) {
        await runner.rollbackTransaction();
        return { success: false, message: 'User not found or disabled' };
      }

      const user = users[0];
      const roleName = String(user.role_name ?? '').toLowerCase();
      const roleEligible = user.role_is_system === false || roleName === 'administrator';
      if (!roleEligible) {
        await runner.rollbackTransaction();
        return {
          success: false,
          message: 'Weekly review is unavailable for your current role.',
        };
      }

      if (!user.emails_enabled || !user.weekly_review_enabled) {
        await runner.rollbackTransaction();
        return {
          success: false,
          message:
            'Enable both "Email Notifications" and "Weekly Review Email" to preview scheduled weekly reviews.',
        };
      }

      this.logger.log(`Sending test weekly review to ${user.email}...`);

      const sent = await this.sendWeeklyReviewForUser(user, runner.manager);
      if (!sent) {
        await runner.rollbackTransaction();
        return { success: false, message: `Failed to send weekly review to ${user.email}` };
      }

      const userNow = dayjs().tz(user.timezone);
      const nextScheduled = this.getNextScheduledSlot(
        userNow,
        user.weekly_review_day,
        user.weekly_review_hour,
      );
      await runner.commitTransaction();
      return {
        success: true,
        message:
          `Weekly review sent to ${user.email}. ` +
          `Next scheduled run: ${nextScheduled.format('ddd YYYY-MM-DD HH:mm')} (${user.timezone}).`,
      };
    } catch (error) {
      await runner.rollbackTransaction().catch(() => {});
      this.logger.error(`Failed to send test weekly review: ${error}`);
      return { success: false, message: `Failed: ${error}` };
    } finally {
      await runner.release();
    }
  }

  private async sendWeeklyReviewForUser(
    user: {
      user_id: string;
      tenant_id: string;
      email: string;
      first_name: string;
      last_name: string;
      timezone: string;
    },
    mg: any,
  ): Promise<boolean> {
    const userId = user.user_id;
    const tenantId = user.tenant_id;

    // Calculate week boundaries in user's timezone
    const userNow = dayjs().tz(user.timezone);
    const weekStart = userNow.subtract(7, 'day').startOf('day').utc().toISOString();
    const weekEnd = userNow.startOf('day').utc().toISOString();
    const weekLabel = `${dayjs(weekStart).format('MMMM D')} - ${dayjs(weekEnd).subtract(1, 'day').format('MMMM D, YYYY')}`;

    // Set tenant context for RLS
    await mg.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);

    // Query 1: Tasks I closed last week
    const tasksClosed = await mg.query(
      `SELECT t.id, t.title
       FROM tasks t
       WHERE t.tenant_id = $1
         AND t.status = 'done'
         AND t.updated_at >= $2
         AND t.updated_at < $3
         AND (
           t.assignee_user_id = $4
           OR t.creator_id = $4
           OR t.owner_ids @> to_jsonb($4::text)
         )
       ORDER BY t.updated_at DESC
       LIMIT 20`,
      [tenantId, weekStart, weekEnd, userId],
    );

    // Query 2: My projects with status changes
    const projectsWithChanges = await mg.query(
      `SELECT DISTINCT ON (p.id) p.id, p.name, p.status,
              al.before_json->>'status' as "oldStatus"
       FROM portfolio_projects p
       JOIN audit_log al ON al.record_id = p.id
         AND al.table_name = 'portfolio_projects'
         AND al.action = 'update'
         AND al.before_json->>'status' IS DISTINCT FROM al.after_json->>'status'
         AND al.created_at >= $2
         AND al.created_at < $3
       WHERE p.tenant_id = $1
         AND (
           p.business_lead_id = $4
           OR p.it_lead_id = $4
           OR p.business_sponsor_id = $4
           OR p.it_sponsor_id = $4
           OR EXISTS (
             SELECT 1 FROM portfolio_project_team pt
             WHERE pt.project_id = p.id AND pt.user_id = $4
           )
         )
       ORDER BY p.id, al.created_at DESC`,
      [tenantId, weekStart, weekEnd, userId],
    );

    // Query 3: Tasks closed on my projects (excluding my own tasks)
    const tasksClosedOnProjects = await mg.query(
      `SELECT t.id, t.title, p.name as "projectName"
       FROM tasks t
       JOIN portfolio_projects p ON t.related_object_id = p.id
         AND t.related_object_type = 'project'
       WHERE t.tenant_id = $1
         AND t.status = 'done'
         AND t.updated_at >= $2
         AND t.updated_at < $3
         AND (
           p.business_lead_id = $4
           OR p.it_lead_id = $4
           OR p.business_sponsor_id = $4
           OR p.it_sponsor_id = $4
           OR EXISTS (
             SELECT 1 FROM portfolio_project_team pt
             WHERE pt.project_id = p.id AND pt.user_id = $4
           )
         )
         AND NOT (
           t.assignee_user_id = $4
           OR t.creator_id = $4
           OR t.owner_ids @> to_jsonb($4::text)
         )
       ORDER BY t.updated_at DESC
       LIMIT 20`,
      [tenantId, weekStart, weekEnd, userId],
    );

    // Query 4: Top priority tasks
    const topTasks = await mg.query(
      `SELECT t.id, t.title, t.due_date as "dueDate", t.priority_level as priority
       FROM tasks t
       WHERE t.tenant_id = $1
         AND t.status = ANY($3)
         AND (
           t.assignee_user_id = $2
           OR t.creator_id = $2
           OR t.owner_ids @> to_jsonb($2::text)
         )
       ORDER BY
         CASE t.priority_level
           WHEN 'blocker' THEN 1
           WHEN 'high' THEN 2
           WHEN 'normal' THEN 3
           WHEN 'low' THEN 4
           WHEN 'optional' THEN 5
         END,
         t.due_date NULLS LAST
       LIMIT 10`,
      [tenantId, userId, ACTIVE_TASK_STATUSES],
    );

    // Query 5: Top priority projects as lead
    const topProjectsAsLead = await mg.query(
      `SELECT p.id, p.name, p.status
       FROM portfolio_projects p
       WHERE p.tenant_id = $1
         AND p.status IN ('planned', 'in_progress', 'in_testing')
         AND (p.business_lead_id = $2 OR p.it_lead_id = $2)
       ORDER BY
         COALESCE(p.priority_score, 0) DESC,
         p.planned_end NULLS LAST
       LIMIT 5`,
      [tenantId, userId],
    );

    // Query 6: Top priority projects as contributor
    const topProjectsAsContributor = await mg.query(
      `SELECT p.id, p.name, p.status
       FROM portfolio_projects p
       WHERE p.tenant_id = $1
         AND p.status IN ('planned', 'in_progress', 'in_testing')
         AND (
           p.business_sponsor_id = $2
           OR p.it_sponsor_id = $2
           OR EXISTS (
             SELECT 1 FROM portfolio_project_team pt
             WHERE pt.project_id = p.id AND pt.user_id = $2
           )
         )
         AND p.business_lead_id IS DISTINCT FROM $2
         AND p.it_lead_id IS DISTINCT FROM $2
       ORDER BY
         COALESCE(p.priority_score, 0) DESC,
         p.planned_end NULLS LAST
       LIMIT 5`,
      [tenantId, userId],
    );

    // Query 7: New requests where the user is involved (team member, lead, or sponsor)
    const newRequests = await mg.query(
      `SELECT r.id, r.name
       FROM portfolio_requests r
       WHERE r.tenant_id = $1
         AND r.created_at >= $3
         AND r.created_at < $4
         AND (
           r.business_lead_id = $2
           OR r.it_lead_id = $2
           OR r.business_sponsor_id = $2
           OR r.it_sponsor_id = $2
           OR EXISTS (
             SELECT 1 FROM portfolio_request_team rt
             WHERE rt.request_id = r.id AND rt.user_id = $2
           )
         )
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [tenantId, userId, weekStart, weekEnd],
    );

    // Build and send email
    const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'there';

    const content = buildWeeklyReviewEmail({
      userName,
      weekLabel,
      appUrl: await this.getTenantAppUrl(tenantId),
      tasksClosed: tasksClosed.map((t: any) => ({ id: t.id, title: t.title })),
      projectsWithChanges: projectsWithChanges.map((p: any) => ({
        id: p.id,
        name: p.name,
        oldStatus: p.oldStatus || 'unknown',
        newStatus: p.status,
      })),
      tasksClosedOnProjects: tasksClosedOnProjects.map((t: any) => ({
        id: t.id,
        title: t.title,
        projectName: t.projectName,
      })),
      topTasks: topTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate ? dayjs(t.dueDate).format('YYYY-MM-DD') : undefined,
      })),
      topProjectsAsLead: topProjectsAsLead.map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
      })),
      topProjectsAsContributor: topProjectsAsContributor.map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
      })),
      newRequests: newRequests.map((r: any) => ({
        id: r.id,
        name: r.name,
      })),
    });

    try {
      await this.emailService.send({
        to: user.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        attachments: content.attachments,
      });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send weekly review to ${user.email}: ${error}`);
      return false;
    }
  }
}
