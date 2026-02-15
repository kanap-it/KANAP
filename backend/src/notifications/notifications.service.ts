import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DataSource, EntityManager } from 'typeorm';
import { EmailAttachment, EmailService } from '../email/email.service';
import { StorageService } from '../common/storage/storage.service';
import { resolveNotificationBaseUrl } from '../common/url';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesData, WorkspaceSettings } from './notifications.constants';
import {
  buildStatusChangeEmail,
  buildTeamAddedEmail,
  buildTeamMemberAddedEmail,
  buildCommentEmail,
  buildShareEmail,
  buildTaskAssignedEmail,
  buildExpirationWarningEmail,
  EmailContent,
} from './notification-templates';
import { renderCommentForEmail } from './comment-email-renderer';

type ItemType = 'request' | 'project' | 'task' | 'contract' | 'opex';
type TriggerType = 'status_change' | 'team_added' | 'team_change_as_lead' | 'comment' | 'assignment' | 'expiration_warning';

interface NotificationRecipient {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AttachmentMeta {
  storagePath: string;
  mimeType: string | null;
  originalFilename: string | null;
}

type CommentItemType = 'request' | 'project' | 'task';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // In-memory dedupe: key -> timestamp
  private recentNotifications = new Map<string, number>();
  private readonly DEDUPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  // Cache for tenant slugs (tenantId -> slug)
  private tenantSlugCache = new Map<string, string>();
  private readonly MAX_INLINE_IMAGES_PER_EMAIL = 8;
  private readonly MAX_INLINE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB per image
  private readonly MAX_INLINE_IMAGES_TOTAL_BYTES = 15 * 1024 * 1024; // 15 MB total

  constructor(
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly storage: StorageService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  /**
   * Check if we should send a notification (dedupe logic).
   */
  private shouldNotify(userId: string, itemType: string, itemId: string, trigger: string): boolean {
    const key = `${userId}:${itemType}:${itemId}:${trigger}`;
    const lastNotified = this.recentNotifications.get(key);
    const now = Date.now();

    if (lastNotified && now - lastNotified < this.DEDUPE_WINDOW_MS) {
      return false;
    }

    this.recentNotifications.set(key, now);
    return true;
  }

  /**
   * Periodic cleanup of dedupe cache (every 10 minutes).
   */
  @Interval(10 * 60 * 1000)
  private cleanupDedupeCache() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, timestamp] of this.recentNotifications) {
      if (now - timestamp > this.DEDUPE_WINDOW_MS) {
        this.recentNotifications.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned ${cleaned} expired entries from notification dedupe cache`);
    }
  }

  /**
   * Get tenant slug from tenantId (cached).
   */
  private async getTenantSlug(tenantId: string): Promise<string | null> {
    // Check cache first
    const cached = this.tenantSlugCache.get(tenantId);
    if (cached) return cached;

    try {
      const result = await this.dataSource.query(
        `SELECT slug FROM tenants WHERE id = $1`,
        [tenantId],
      );
      if (result.length > 0) {
        const slug = result[0].slug;
        this.tenantSlugCache.set(tenantId, slug);
        return slug;
      }
    } catch (error) {
      this.logger.warn(`Failed to get tenant slug for ${tenantId}: ${error}`);
    }
    return null;
  }

  /**
   * Build base URL for a tenant.
   */
  private buildTenantBaseUrl(tenantSlug: string | null): string {
    return resolveNotificationBaseUrl(tenantSlug);
  }

  /**
   * Build item URL based on type and tenant.
   */
  private async buildItemUrl(itemType: ItemType, itemId: string, tenantId: string): Promise<string> {
    const slug = await this.getTenantSlug(tenantId);
    const base = this.buildTenantBaseUrl(slug);

    switch (itemType) {
      case 'request':
        return `${base}/portfolio/requests/${itemId}`;
      case 'project':
        return `${base}/portfolio/projects/${itemId}`;
      case 'task':
        return `${base}/tasks/${itemId}`;
      case 'contract':
        return `${base}/budget/contracts/${itemId}`;
      case 'opex':
        return `${base}/budget/opex/${itemId}`;
      default:
        return base;
    }
  }

  /**
   * Check if user wants this notification based on their preferences.
   */
  private checkPreferences(
    prefs: NotificationPreferencesData,
    workspace: 'portfolio' | 'tasks' | 'budget',
    trigger: TriggerType,
    role?: 'assignee' | 'requestor' | 'viewer' | 'owner',
  ): boolean {
    if (!prefs.emails_enabled) return false;

    const ws = prefs.workspace_settings[workspace];
    if (!ws.enabled) return false;

    switch (trigger) {
      case 'status_change':
        return ws.status_changes;
      case 'team_added':
        return (ws as WorkspaceSettings['portfolio']).team_additions ?? false;
      case 'team_change_as_lead':
        return (ws as WorkspaceSettings['portfolio']).team_changes_as_lead ?? false;
      case 'comment':
        return ws.comments;
      case 'assignment':
        // Only for tasks workspace
        if (workspace === 'tasks') {
          const taskSettings = ws as WorkspaceSettings['tasks'];
          if (role === 'assignee') return taskSettings.as_assignee;
          if (role === 'requestor') return taskSettings.as_requestor;
          if (role === 'viewer') return taskSettings.as_viewer;
        }
        return true;
      case 'expiration_warning':
        return (ws as WorkspaceSettings['budget']).expiration_warnings ?? false;
      default:
        return true;
    }
  }

  /**
   * Convert inline image URLs in comment HTML to CID references and attach the files.
   * Falls back gracefully to original URLs when an image cannot be resolved.
   */
  private async embedInlineImagesForComment(params: {
    itemType: CommentItemType;
    itemId: string;
    tenantId: string;
    commentHtml: string;
  }): Promise<{ html: string; attachments: EmailAttachment[] }> {
    const html = params.commentHtml || '';
    if (!html) {
      return { html, attachments: [] };
    }

    const imgSrcRegex = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    const attachmentIds: string[] = [];
    const seen = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = imgSrcRegex.exec(html)) !== null) {
      const src = match[1];
      const attachmentId = this.extractInlineAttachmentIdFromSrc(params.itemType, src);
      if (!attachmentId || seen.has(attachmentId)) continue;
      seen.add(attachmentId);
      attachmentIds.push(attachmentId);
    }

    if (attachmentIds.length === 0) {
      return { html, attachments: [] };
    }

    const cidByAttachmentId = new Map<string, string>();
    const attachments: EmailAttachment[] = [];
    let totalBytes = 0;

    for (const attachmentId of attachmentIds) {
      if (attachments.length >= this.MAX_INLINE_IMAGES_PER_EMAIL) break;
      if (totalBytes >= this.MAX_INLINE_IMAGES_TOTAL_BYTES) break;

      const meta = await this.getAttachmentMetaForCommentImage(
        params.itemType,
        params.itemId,
        params.tenantId,
        attachmentId,
      );
      if (!meta) continue;

      const mimeType = String(meta.mimeType || '').toLowerCase();
      if (!mimeType.startsWith('image/')) continue;

      const remainingBudget = this.MAX_INLINE_IMAGES_TOTAL_BYTES - totalBytes;
      const maxBytes = Math.min(this.MAX_INLINE_IMAGE_BYTES, remainingBudget);
      const loaded = await this.readObjectAsBase64(meta.storagePath, maxBytes);
      if (!loaded) continue;

      totalBytes += loaded.size;
      const contentId = `kanap-inline-${attachmentId}`;
      cidByAttachmentId.set(attachmentId, contentId);

      attachments.push({
        filename: this.safeInlineFilename(meta.originalFilename, mimeType, attachmentId),
        content: loaded.base64,
        contentType: mimeType,
        contentId,
      });
    }

    if (attachments.length === 0) {
      return { html, attachments: [] };
    }

    const rewrittenHtml = this.replaceInlineImageSourcesWithCid(
      params.itemType,
      html,
      cidByAttachmentId,
    );

    return {
      html: rewrittenHtml,
      attachments,
    };
  }

  private replaceInlineImageSourcesWithCid(
    itemType: CommentItemType,
    html: string,
    cidByAttachmentId: Map<string, string>,
  ): string {
    return html.replace(
      /(<img\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)(\2)/gi,
      (fullMatch, prefix: string, quote: string, src: string) => {
        const attachmentId = this.extractInlineAttachmentIdFromSrc(itemType, src);
        if (!attachmentId) return fullMatch;
        const contentId = cidByAttachmentId.get(attachmentId);
        if (!contentId) return fullMatch;
        return `${prefix}${quote}cid:${contentId}${quote}`;
      },
    );
  }

  private extractInlineAttachmentIdFromSrc(
    itemType: CommentItemType,
    src: string,
  ): string | null {
    const raw = String(src || '').trim();
    if (!raw) return null;

    let pathname: string;
    try {
      if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) {
        const parsed = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
        pathname = parsed.pathname;
      } else if (raw.startsWith('/')) {
        pathname = raw.split(/[?#]/, 1)[0];
      } else {
        return null;
      }
    } catch {
      return null;
    }

    switch (itemType) {
      case 'project': {
        const match = pathname.match(
          /^\/(?:api\/)?portfolio\/projects\/inline\/[^/]+\/([a-f0-9-]+)\/?$/i,
        );
        return match ? match[1] : null;
      }
      case 'request': {
        const match = pathname.match(
          /^\/(?:api\/)?portfolio\/requests\/inline\/[^/]+\/([a-f0-9-]+)\/?$/i,
        );
        return match ? match[1] : null;
      }
      case 'task': {
        const match = pathname.match(
          /^\/(?:api\/)?tasks\/attachments\/[^/]+\/([a-f0-9-]+)\/inline\/?$/i,
        );
        return match ? match[1] : null;
      }
      default:
        return null;
    }
  }

  private async getAttachmentMetaForCommentImage(
    itemType: CommentItemType,
    itemId: string,
    tenantId: string,
    attachmentId: string,
  ): Promise<AttachmentMeta | null> {
    const runner = this.dataSource.createQueryRunner();
    try {
      await runner.connect();
      await runner.startTransaction();
      await runner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);

      let query = '';
      if (itemType === 'project') {
        query = `
          SELECT storage_path, mime_type, original_filename
          FROM portfolio_project_attachments
          WHERE id = $1 AND project_id = $2 AND tenant_id = $3
          LIMIT 1
        `;
      } else if (itemType === 'request') {
        query = `
          SELECT storage_path, mime_type, original_filename
          FROM portfolio_request_attachments
          WHERE id = $1 AND request_id = $2 AND tenant_id = $3
          LIMIT 1
        `;
      } else {
        query = `
          SELECT storage_path, mime_type, original_filename
          FROM task_attachments
          WHERE id = $1 AND task_id = $2 AND tenant_id = $3
          LIMIT 1
        `;
      }

      const rows = await runner.query(query, [attachmentId, itemId, tenantId]);
      await runner.commitTransaction();

      if (!rows.length) {
        this.logger.debug(`No attachment metadata found for inline image ${attachmentId} (${itemType}/${itemId})`);
        return null;
      }

      return {
        storagePath: rows[0].storage_path,
        mimeType: rows[0].mime_type ?? null,
        originalFilename: rows[0].original_filename ?? null,
      };
    } catch (error) {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
      this.logger.warn(`Failed to resolve attachment metadata for inline image ${attachmentId}: ${error}`);
      return null;
    } finally {
      await runner.release();
    }
  }

  private async readObjectAsBase64(
    storagePath: string,
    maxBytes: number,
  ): Promise<{ base64: string; size: number } | null> {
    try {
      const obj = await this.storage.getObjectStream(storagePath);
      const chunks: Buffer[] = [];
      let total = 0;

      for await (const chunk of obj.stream as any) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += buffer.length;
        if (total > maxBytes) {
          this.logger.warn(`Skipping inline image ${storagePath}: exceeds size limit`);
          return null;
        }
        chunks.push(buffer);
      }

      if (total === 0) return null;

      return {
        base64: Buffer.concat(chunks).toString('base64'),
        size: total,
      };
    } catch (error) {
      this.logger.warn(`Failed to load inline image ${storagePath}: ${error}`);
      return null;
    }
  }

  private safeInlineFilename(
    originalFilename: string | null,
    mimeType: string,
    attachmentId: string,
  ): string {
    const clean = (originalFilename || '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^_+/, '')
      .slice(0, 80);
    if (clean) return clean;

    const ext = this.extensionFromMimeType(mimeType);
    return `inline-${attachmentId}${ext}`;
  }

  private extensionFromMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/gif':
        return '.gif';
      case 'image/webp':
        return '.webp';
      case 'image/svg+xml':
        return '.svg';
      default:
        return '';
    }
  }

  /**
   * Send notification email (fire-and-forget with error logging).
   */
  private async sendNotification(to: string, content: EmailContent): Promise<void> {
    try {
      await this.emailService.send({
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
        attachments: content.attachments,
      });
    } catch (error) {
      this.logger.error(`Failed to send notification to ${to}: ${error}`);
    }
  }

  // ============================================
  // PUBLIC NOTIFICATION METHODS
  // ============================================

  /**
   * Notify about status change on an item.
   */
  async notifyStatusChange(params: {
    itemType: ItemType;
    itemId: string;
    itemName: string;
    oldStatus: string;
    newStatus: string;
    recipients: NotificationRecipient[];
    tenantId: string;
    excludeUserId?: string;
    manager?: EntityManager;
  }): Promise<void> {
    const workspace = this.getWorkspaceForItemType(params.itemType);
    const itemUrl = await this.buildItemUrl(params.itemType, params.itemId, params.tenantId);
    const content = buildStatusChangeEmail({
      itemType: params.itemType,
      itemName: params.itemName,
      itemUrl,
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
    });

    for (const recipient of params.recipients) {
      if (recipient.userId === params.excludeUserId) continue;
      if (!this.shouldNotify(recipient.userId, params.itemType, params.itemId, 'status_change')) continue;

      // Don't pass manager - notifications are fire-and-forget, so the transaction
      // may be closed by the time this runs. Preferences service uses its own connection.
      const prefs = await this.preferencesService.getForUser(
        recipient.userId,
        params.tenantId,
      );

      if (!this.checkPreferences(prefs, workspace, 'status_change')) continue;

      this.sendNotification(recipient.email, content);
    }
  }

  /**
   * Notify user they were added to a team.
   */
  async notifyTeamAdded(params: {
    itemType: 'request' | 'project';
    itemId: string;
    itemName: string;
    role: string;
    addedUser: NotificationRecipient;
    tenantId: string;
    manager?: EntityManager;
  }): Promise<void> {
    if (!this.shouldNotify(params.addedUser.userId, params.itemType, params.itemId, 'team_added')) {
      return;
    }

    const prefs = await this.preferencesService.getForUser(
      params.addedUser.userId,
      params.tenantId,
    );

    if (!this.checkPreferences(prefs, 'portfolio', 'team_added')) return;

    const itemUrl = await this.buildItemUrl(params.itemType, params.itemId, params.tenantId);
    const content = buildTeamAddedEmail({
      itemType: params.itemType,
      itemName: params.itemName,
      itemUrl,
      role: params.role,
    });

    this.sendNotification(params.addedUser.email, content);
  }

  /**
   * Notify IT Lead when a team member is added to a request/project they lead.
   * Skips notification if:
   * - No IT Lead assigned
   * - IT Lead is the actor (person making the change)
   * - IT Lead is the user being added (they already get notifyTeamAdded)
   */
  async notifyItLeadOfTeamChange(params: {
    itemType: 'request' | 'project';
    itemId: string;
    itemName: string;
    addedUserName: string;
    role: string;
    itLeadId: string | null;
    actorId: string | null;
    addedUserId: string;
    tenantId: string;
  }): Promise<void> {
    // Skip if no IT Lead assigned
    if (!params.itLeadId) return;

    // Skip if IT Lead is the actor (they already know)
    if (params.itLeadId === params.actorId) return;

    // Skip if IT Lead is the one being added (they get notifyTeamAdded instead)
    if (params.itLeadId === params.addedUserId) return;

    // Check dedupe
    if (!this.shouldNotify(params.itLeadId, params.itemType, params.itemId, 'team_change_as_lead')) {
      return;
    }

    // Check IT Lead's preferences
    const prefs = await this.preferencesService.getForUser(
      params.itLeadId,
      params.tenantId,
    );

    if (!this.checkPreferences(prefs, 'portfolio', 'team_change_as_lead')) return;

    // Get IT Lead's email (and verify they're eligible to receive notifications)
    const itLeadRows = await this.dataSource.query(
      `SELECT u.id, u.email FROM users u
       JOIN roles ro ON ro.id = u.role_id
       WHERE u.id = $1 AND u.status = 'enabled'
         AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')`,
      [params.itLeadId],
    );

    if (itLeadRows.length === 0) return;

    const itemUrl = await this.buildItemUrl(params.itemType, params.itemId, params.tenantId);
    const content = buildTeamMemberAddedEmail({
      itemType: params.itemType,
      itemName: params.itemName,
      itemUrl,
      addedUserName: params.addedUserName,
      role: params.role,
    });

    this.sendNotification(itLeadRows[0].email, content);
  }

  /**
   * Notify about a new comment.
   */
  async notifyComment(params: {
    itemType: 'request' | 'project' | 'task';
    itemId: string;
    itemName: string;
    authorId: string;
    authorName: string;
    commentContent: string;
    recipients: NotificationRecipient[];
    tenantId: string;
    manager?: EntityManager;
  }): Promise<void> {
    const workspace = this.getWorkspaceForItemType(params.itemType);
    const tenantSlug = await this.getTenantSlug(params.tenantId);
    const tenantBaseUrl = this.buildTenantBaseUrl(tenantSlug);
    const itemUrl = await this.buildItemUrl(params.itemType, params.itemId, params.tenantId);
    const renderedComment = renderCommentForEmail({
      commentHtml: params.commentContent,
      tenantBaseUrl,
      tenantSlug,
    });
    const embeddedComment = await this.embedInlineImagesForComment({
      itemType: params.itemType,
      itemId: params.itemId,
      tenantId: params.tenantId,
      commentHtml: renderedComment.html,
    });

    const content = buildCommentEmail({
      itemType: params.itemType,
      itemName: params.itemName,
      itemUrl,
      authorName: params.authorName,
      commentHtml: embeddedComment.html,
      commentTextPreview: renderedComment.textPreview,
    });
    content.attachments = embeddedComment.attachments;

    for (const recipient of params.recipients) {
      // Don't notify the author
      if (recipient.userId === params.authorId) continue;
      if (!this.shouldNotify(recipient.userId, params.itemType, params.itemId, 'comment')) continue;

      // Don't pass manager - notifications are fire-and-forget, so the transaction
      // may be closed by the time this runs. Preferences service uses its own connection.
      const prefs = await this.preferencesService.getForUser(
        recipient.userId,
        params.tenantId,
      );

      if (!this.checkPreferences(prefs, workspace, 'comment')) continue;

      this.sendNotification(recipient.email, content);
    }
  }

  /**
   * Notify about task assignment.
   */
  async notifyTaskAssigned(params: {
    taskId: string;
    taskTitle: string;
    assigneeId: string;
    assigneeEmail: string;
    assignerName: string;
    dueDate?: string;
    tenantId: string;
    manager?: EntityManager;
  }): Promise<void> {
    if (!this.shouldNotify(params.assigneeId, 'task', params.taskId, 'assignment')) {
      return;
    }

    const prefs = await this.preferencesService.getForUser(
      params.assigneeId,
      params.tenantId,
    );

    if (!this.checkPreferences(prefs, 'tasks', 'assignment', 'assignee')) return;

    const taskUrl = await this.buildItemUrl('task', params.taskId, params.tenantId);
    const content = buildTaskAssignedEmail({
      taskTitle: params.taskTitle,
      taskUrl,
      assignerName: params.assignerName,
      dueDate: params.dueDate,
    });

    this.sendNotification(params.assigneeEmail, content);
  }

  /**
   * Notify about expiration warning (for scheduled job).
   */
  async notifyExpirationWarning(params: {
    itemType: 'contract' | 'opex';
    itemId: string;
    itemName: string;
    expirationDate: string;
    daysRemaining: number;
    warningType: 'expiration' | 'cancellation_deadline';
    recipients: NotificationRecipient[];
    tenantId: string;
    manager?: EntityManager;
  }): Promise<void> {
    const itemUrl = await this.buildItemUrl(params.itemType, params.itemId, params.tenantId);
    const content = buildExpirationWarningEmail({
      itemType: params.itemType,
      itemName: params.itemName,
      itemUrl,
      expirationDate: params.expirationDate,
      daysRemaining: params.daysRemaining,
      warningType: params.warningType,
    });

    for (const recipient of params.recipients) {
      // Use a longer dedupe window for expiration warnings (7 days)
      const key = `${recipient.userId}:${params.itemType}:${params.itemId}:expiration:${params.warningType}`;
      const lastNotified = this.recentNotifications.get(key);
      const now = Date.now();
      const EXPIRATION_DEDUPE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

      if (lastNotified && now - lastNotified < EXPIRATION_DEDUPE_MS) {
        continue;
      }
      this.recentNotifications.set(key, now);

      // Don't pass manager - notifications are fire-and-forget, so the transaction
      // may be closed by the time this runs. Preferences service uses its own connection.
      const prefs = await this.preferencesService.getForUser(
        recipient.userId,
        params.tenantId,
      );

      if (!this.checkPreferences(prefs, 'budget', 'expiration_warning')) continue;

      this.sendNotification(recipient.email, content);
    }
  }

  /**
   * Notify recipients about a shared item (fire-and-forget, no dedupe).
   */
  async notifyShare(params: {
    itemType: 'request' | 'project' | 'task';
    itemId: string;
    itemName: string;
    senderName: string;
    message?: string;
    recipients: NotificationRecipient[];
    rawEmails?: string[];
    tenantId: string;
  }): Promise<void> {
    const itemUrl = await this.buildItemUrl(params.itemType, params.itemId, params.tenantId);
    const content = buildShareEmail({
      itemType: params.itemType,
      itemName: params.itemName,
      itemUrl,
      senderName: params.senderName,
      message: params.message,
    });

    for (const recipient of params.recipients) {
      this.sendNotification(recipient.email, content);
    }
    for (const email of params.rawEmails ?? []) {
      this.sendNotification(email, content);
    }
  }

  /**
   * Get workspace for item type.
   */
  private getWorkspaceForItemType(itemType: ItemType): 'portfolio' | 'tasks' | 'budget' {
    switch (itemType) {
      case 'request':
      case 'project':
        return 'portfolio';
      case 'task':
        return 'tasks';
      case 'contract':
      case 'opex':
        return 'budget';
      default:
        return 'portfolio';
    }
  }

  // ============================================
  // RECIPIENT QUERY HELPERS
  // ============================================

  /**
   * Get recipients for a portfolio request.
   * Excludes users with system roles (e.g., Contact) who cannot log in.
   */
  async getRequestRecipients(
    requestId: string,
    manager: EntityManager,
  ): Promise<NotificationRecipient[]> {
    const rows = await manager.query(
      `SELECT DISTINCT u.id as "userId", u.email, u.first_name as "firstName", u.last_name as "lastName"
       FROM portfolio_requests r
       LEFT JOIN users u ON u.id IN (
         r.requestor_id, r.business_sponsor_id, r.business_lead_id,
         r.it_sponsor_id, r.it_lead_id
       )
       LEFT JOIN roles ro ON ro.id = u.role_id
       WHERE r.id = $1 AND u.id IS NOT NULL AND u.status = 'enabled'
         AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')
       UNION
       SELECT u.id as "userId", u.email, u.first_name as "firstName", u.last_name as "lastName"
       FROM portfolio_request_team rt
       JOIN users u ON u.id = rt.user_id
       JOIN roles ro ON ro.id = u.role_id
       WHERE rt.request_id = $1 AND u.status = 'enabled'
         AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')`,
      [requestId],
    );
    return rows;
  }

  /**
   * Get recipients for a portfolio project.
   * Excludes users with system roles (e.g., Contact) who cannot log in.
   */
  async getProjectRecipients(
    projectId: string,
    manager: EntityManager,
  ): Promise<NotificationRecipient[]> {
    const rows = await manager.query(
      `SELECT DISTINCT u.id as "userId", u.email, u.first_name as "firstName", u.last_name as "lastName"
       FROM portfolio_projects p
       LEFT JOIN users u ON u.id IN (
         p.business_sponsor_id, p.business_lead_id,
         p.it_sponsor_id, p.it_lead_id
       )
       LEFT JOIN roles ro ON ro.id = u.role_id
       WHERE p.id = $1 AND u.id IS NOT NULL AND u.status = 'enabled'
         AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')
       UNION
       SELECT u.id as "userId", u.email, u.first_name as "firstName", u.last_name as "lastName"
       FROM portfolio_project_team pt
       JOIN users u ON u.id = pt.user_id
       JOIN roles ro ON ro.id = u.role_id
       WHERE pt.project_id = $1 AND u.status = 'enabled'
         AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')`,
      [projectId],
    );
    return rows;
  }

  /**
   * Get recipients for a task based on their roles.
   * Excludes users with system roles (e.g., Contact) who cannot log in.
   */
  async getTaskRecipients(
    taskId: string,
    manager: EntityManager,
  ): Promise<Array<NotificationRecipient & { role: 'assignee' | 'requestor' | 'owner' | 'viewer' }>> {
    const task = await manager.query(
      `SELECT t.assignee_user_id, t.creator_id, t.owner_ids, t.viewer_ids
       FROM tasks t
       WHERE t.id = $1`,
      [taskId],
    );

    if (!task.length) return [];

    const t = task[0];
    const userIds = new Set<string>();
    const roleMap = new Map<string, 'assignee' | 'requestor' | 'owner' | 'viewer'>();

    if (t.assignee_user_id) {
      userIds.add(t.assignee_user_id);
      roleMap.set(t.assignee_user_id, 'assignee');
    }
    if (t.creator_id) {
      userIds.add(t.creator_id);
      if (!roleMap.has(t.creator_id)) roleMap.set(t.creator_id, 'requestor');
    }
    for (const ownerId of t.owner_ids || []) {
      userIds.add(ownerId);
      if (!roleMap.has(ownerId)) roleMap.set(ownerId, 'owner');
    }
    for (const viewerId of t.viewer_ids || []) {
      userIds.add(viewerId);
      if (!roleMap.has(viewerId)) roleMap.set(viewerId, 'viewer');
    }

    if (userIds.size === 0) return [];

    const users = await manager.query(
      `SELECT u.id as "userId", u.email, u.first_name as "firstName", u.last_name as "lastName"
       FROM users u
       JOIN roles ro ON ro.id = u.role_id
       WHERE u.id = ANY($1) AND u.status = 'enabled'
         AND (ro.is_system = false OR LOWER(ro.role_name) = 'administrator')`,
      [Array.from(userIds)],
    );

    return users.map((u: any) => ({
      ...u,
      role: roleMap.get(u.userId) || 'owner',
    }));
  }
}
