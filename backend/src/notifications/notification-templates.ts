/**
 * Email template functions for notifications.
 * Each returns { subject, html, text } for use with EmailService.
 */
import type { EmailAttachment } from '../email/email.service';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

// Helper functions
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getBaseUrl(url: string): string {
  const match = url.match(/^(https?:\/\/[^/]+)/);
  return match ? match[1] : '';
}

/**
 * Shared email wrapper: gray background, 600px white card, blue KANAP header, footer.
 * Used by all notification and auth emails for brand consistency.
 */
export function emailWrapper(
  body: string,
  options?: { subtitle?: string; preferencesUrl?: string },
): string {
  const subtitleCell = options?.subtitle
    ? `<td align="right" style="color:rgba(255,255,255,0.85);font-size:14px;">${escapeHtml(options.subtitle)}</td>`
    : '';
  const preferencesLink = options?.preferencesUrl
    ? `<p style="margin:0;"><a href="${options.preferencesUrl}" style="color:#2D69E0;text-decoration:none;">Manage notification preferences</a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
<!-- Header -->
<tr><td style="background-color:#2D69E0;padding:24px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="color:#ffffff;font-size:20px;font-weight:bold;letter-spacing:1px;">KANAP</td>
${subtitleCell}
</tr>
</table>
</td></tr>
<!-- Body -->
<tr><td style="padding:32px;">
${body}
</td></tr>
<!-- Footer -->
<tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
${preferencesLink}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Template: Status Change
export function buildStatusChangeEmail(params: {
  itemType: 'request' | 'project' | 'task' | 'contract' | 'opex';
  itemName: string;
  itemUrl: string;
  oldStatus: string;
  newStatus: string;
}): EmailContent {
  const typeLabel = {
    request: 'Request',
    project: 'Project',
    task: 'Task',
    contract: 'Contract',
    opex: 'OPEX Item',
  }[params.itemType];

  const subject = `${typeLabel} "${params.itemName}" status updated`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${typeLabel} Status Update</h2>
    <p>The ${typeLabel.toLowerCase()} <strong>${escapeHtml(params.itemName)}</strong> has been updated.</p>
    <p>Status changed from <strong>${formatStatus(params.oldStatus)}</strong>
       to <strong>${formatStatus(params.newStatus)}</strong>.</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:#2D69E0;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const html = emailWrapper(body, { preferencesUrl });

  const text =
    `${typeLabel} "${params.itemName}" status changed from ${formatStatus(params.oldStatus)} to ${formatStatus(params.newStatus)}.\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html, text };
}

// Template: Team Addition
export function buildTeamAddedEmail(params: {
  itemType: 'request' | 'project';
  itemName: string;
  itemUrl: string;
  role: string;
}): EmailContent {
  const typeLabel = params.itemType === 'request' ? 'Request' : 'Project';

  const subject = `You've been added to ${typeLabel} "${params.itemName}"`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">You've Been Added to a ${typeLabel}</h2>
    <p>You have been added as <strong>${formatRole(params.role)}</strong>
       on <strong>${escapeHtml(params.itemName)}</strong>.</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:#2D69E0;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const html = emailWrapper(body, { preferencesUrl });

  const text =
    `You've been added as ${formatRole(params.role)} on ${typeLabel} "${params.itemName}".\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html, text };
}

// Template: Team Member Added (for IT Lead notification)
export function buildTeamMemberAddedEmail(params: {
  itemType: 'request' | 'project';
  itemName: string;
  itemUrl: string;
  addedUserName: string;
  role: string;
}): EmailContent {
  const typeLabel = params.itemType === 'request' ? 'Request' : 'Project';

  const subject = `New team member on ${typeLabel} "${params.itemName}"`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">New Team Member</h2>
    <p><strong>${escapeHtml(params.addedUserName)}</strong> has been added as
       <strong>${formatRole(params.role)}</strong> on ${typeLabel.toLowerCase()}
       <strong>${escapeHtml(params.itemName)}</strong>.</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:#2D69E0;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const html = emailWrapper(body, { preferencesUrl });

  const text =
    `${params.addedUserName} has been added as ${formatRole(params.role)} on ${typeLabel} "${params.itemName}".\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html, text };
}

// Template: Comment Added
export function buildCommentEmail(params: {
  itemType: 'request' | 'project' | 'task';
  itemName: string;
  itemUrl: string;
  authorName: string;
  commentHtml: string;
  commentTextPreview: string;
}): EmailContent {
  const typeLabel = { request: 'Request', project: 'Project', task: 'Task' }[params.itemType];

  const subject = `New comment on ${typeLabel} "${params.itemName}"`;
  const safeHtml = params.commentHtml || '<p>(No comment content)</p>';
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">New Comment</h2>
    <p><strong>${escapeHtml(params.authorName)}</strong> commented on ${typeLabel.toLowerCase()}
       <strong>${escapeHtml(params.itemName)}</strong>:</p>
    <div style="border-left:3px solid #2D69E0;padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:16px 0;color:#374151;">
      ${safeHtml}
    </div>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:#2D69E0;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const html = emailWrapper(body, { preferencesUrl });

  const text =
    `${params.authorName} commented on ${typeLabel} "${params.itemName}": "${params.commentTextPreview}".\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html, text };
}

// Template: Share Item
export function buildShareEmail(params: {
  itemType: 'request' | 'project' | 'task';
  itemName: string;
  itemUrl: string;
  senderName: string;
  message?: string;
}): EmailContent {
  const typeLabel = { request: 'Request', project: 'Project', task: 'Task' }[params.itemType];

  const subject = `${params.senderName} shared ${typeLabel} "${params.itemName}" with you`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const messageBlock = params.message
    ? `<div style="border-left:3px solid #2D69E0;padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:16px 0;color:#374151;">
      ${escapeHtml(params.message)}
    </div>`
    : '';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${typeLabel} Shared With You</h2>
    <p><strong>${escapeHtml(params.senderName)}</strong> shared the ${typeLabel.toLowerCase()}
       <strong>${escapeHtml(params.itemName)}</strong> with you.</p>
    ${messageBlock}
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:#2D69E0;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const html = emailWrapper(body, { preferencesUrl });

  const messageText = params.message ? `\nMessage: "${params.message}"\n` : '';
  const text =
    `${params.senderName} shared ${typeLabel} "${params.itemName}" with you.${messageText}\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html, text };
}

// Template: Task Assigned
export function buildTaskAssignedEmail(params: {
  taskTitle: string;
  taskUrl: string;
  assignerName: string;
  dueDate?: string;
}): EmailContent {
  const subject = `Task assigned: "${params.taskTitle}"`;
  const preferencesUrl = getBaseUrl(params.taskUrl) + '/settings/notifications';

  const dueLine = params.dueDate
    ? `<p>Due date: <strong>${params.dueDate}</strong></p>`
    : '';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">Task Assigned to You</h2>
    <p><strong>${escapeHtml(params.assignerName)}</strong> assigned you the task
       <strong>${escapeHtml(params.taskTitle)}</strong>.</p>
    ${dueLine}
    <p style="margin-top:24px;"><a href="${params.taskUrl}" style="display:inline-block;background-color:#2D69E0;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View Task</a></p>
  `;
  const html = emailWrapper(body, { preferencesUrl });

  const text =
    `${params.assignerName} assigned you the task "${params.taskTitle}".${params.dueDate ? ` Due: ${params.dueDate}.` : ''}\n` +
    `View: ${params.taskUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html, text };
}

// Template: Expiration Warning
export function buildExpirationWarningEmail(params: {
  itemType: 'contract' | 'opex';
  itemName: string;
  itemUrl: string;
  expirationDate: string;
  daysRemaining: number;
  warningType: 'expiration' | 'cancellation_deadline';
}): EmailContent {
  const typeLabel = params.itemType === 'contract' ? 'Contract' : 'OPEX Item';
  const warningLabel =
    params.warningType === 'cancellation_deadline' ? 'cancellation deadline' : 'expiration';

  const subject = `${typeLabel} "${params.itemName}" ${warningLabel} in ${params.daysRemaining} days`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${typeLabel} ${params.warningType === 'cancellation_deadline' ? 'Cancellation Deadline' : 'Expiration'} Warning</h2>
    <p>The ${typeLabel.toLowerCase()} <strong>${escapeHtml(params.itemName)}</strong> has a
       ${warningLabel} coming up on <strong>${params.expirationDate}</strong>
       (${params.daysRemaining} days remaining).</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:#2D69E0;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const html = emailWrapper(body, { preferencesUrl });

  const text =
    `${typeLabel} "${params.itemName}" ${warningLabel} on ${params.expirationDate} (${params.daysRemaining} days).\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html, text };
}

// ============================================
// Weekly Review — helper functions
// ============================================

function buildStatsBar(stats: Array<{ label: string; count: number }>): string {
  const cells = stats
    .map(
      (s) => `<td align="center" style="padding:12px 8px;width:${Math.floor(100 / stats.length)}%;">
<div style="font-size:24px;font-weight:bold;color:#2D69E0;">${s.count}</div>
<div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${escapeHtml(s.label)}</div>
</td>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-radius:6px;margin-bottom:24px;">
<tr>${cells}</tr>
</table>`;
}

function buildSection(title: string, emoji: string, contentHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
<tr><td style="padding-bottom:8px;border-bottom:2px solid #e5e7eb;">
<span style="font-size:16px;font-weight:bold;color:#111827;">${emoji} ${escapeHtml(title)}</span>
</td></tr>
<tr><td style="padding-top:12px;">
${contentHtml}
</td></tr>
</table>`;
}

function buildItemRow(linkHtml: string, metaHtml?: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
<tr><td style="padding:10px 12px;background-color:#f9fafb;border-left:3px solid #2D69E0;border-radius:0 4px 4px 0;">
<div style="font-size:14px;color:#111827;">${linkHtml}</div>
${metaHtml ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">${metaHtml}</div>` : ''}
</td></tr>
</table>`;
}

function priorityBadge(priority: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    blocker: { bg: '#dc2626', text: '#ffffff' },
    high: { bg: '#ea580c', text: '#ffffff' },
    normal: { bg: '#2D69E0', text: '#ffffff' },
    low: { bg: '#9ca3af', text: '#ffffff' },
    optional: { bg: '#e5e7eb', text: '#374151' },
  };
  const c = colors[priority] || colors.normal;
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;background-color:${c.bg};color:${c.text};text-transform:uppercase;">${escapeHtml(formatStatus(priority))}</span>`;
}

function statusBadge(status: string): string {
  const colors: Record<string, { bg: string; text: string }> = {
    planned: { bg: '#dbeafe', text: '#1e40af' },
    in_progress: { bg: '#fef3c7', text: '#92400e' },
    in_testing: { bg: '#ede9fe', text: '#5b21b6' },
    completed: { bg: '#d1fae5', text: '#065f46' },
    done: { bg: '#d1fae5', text: '#065f46' },
  };
  const c = colors[status] || { bg: '#f3f4f6', text: '#374151' };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;background-color:${c.bg};color:${c.text};">${escapeHtml(formatStatus(status))}</span>`;
}

function buildCtaButton(appUrl: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
<tr><td align="center">
<a href="${appUrl}" style="display:inline-block;background-color:#2D69E0;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;">Go to KANAP</a>
</td></tr>
</table>`;
}

// Template: Weekly Review
export function buildWeeklyReviewEmail(params: {
  userName: string;
  weekLabel: string;
  appUrl: string;
  tasksClosed: Array<{ id: string; title: string }>;
  projectsWithChanges: Array<{ id: string; name: string; oldStatus: string; newStatus: string }>;
  tasksClosedOnProjects: Array<{ id: string; title: string; projectName: string }>;
  topTasks: Array<{ id: string; title: string; priority: string; dueDate?: string }>;
  topProjectsAsLead: Array<{ id: string; name: string; status: string }>;
  topProjectsAsContributor: Array<{ id: string; name: string; status: string }>;
  newRequests: Array<{ id: string; name: string }>;
}): EmailContent {
  const subject = `Your KANAP Weekly Review - Week of ${params.weekLabel}`;
  const preferencesUrl = params.appUrl + '/settings/notifications';

  const hasContent =
    params.tasksClosed.length > 0 ||
    params.projectsWithChanges.length > 0 ||
    params.tasksClosedOnProjects.length > 0 ||
    params.topTasks.length > 0 ||
    params.topProjectsAsLead.length > 0 ||
    params.topProjectsAsContributor.length > 0 ||
    params.newRequests.length > 0;

  let body = `<p style="font-size:16px;color:#111827;margin:0 0 24px 0;">Hi ${escapeHtml(params.userName)}, here's your summary for the week of ${params.weekLabel}.</p>`;

  if (!hasContent) {
    body += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td align="center" style="padding:32px;background-color:#f9fafb;border-radius:8px;">
<div style="font-size:32px;margin-bottom:12px;">&#11088;</div>
<div style="font-size:14px;color:#6b7280;">No activity to report this week. Keep up the good work!</div>
</td></tr>
</table>`;
    body += buildCtaButton(params.appUrl);
    const html = emailWrapper(body, { subtitle: 'Weekly Review', preferencesUrl });
    const text =
      `KANAP Weekly Review - ${params.weekLabel}\n\n` +
      `Hi ${params.userName},\n\n` +
      `No activity to report this week. Keep up the good work!\n\n` +
      `Go to KANAP: ${params.appUrl}\n\n` +
      `Manage notification preferences: ${preferencesUrl}`;
    return { subject, html, text };
  }

  // Stats bar
  body += buildStatsBar([
    { label: 'Completed', count: params.tasksClosed.length },
    { label: 'Status Changes', count: params.projectsWithChanges.length },
    { label: 'Open Tasks', count: params.topTasks.length },
  ]);

  // Section 1: Tasks You Completed
  if (params.tasksClosed.length > 0) {
    const items = params.tasksClosed
      .map((t) =>
        buildItemRow(`<a href="${params.appUrl}/tasks/${t.id}" style="color:#2D69E0;text-decoration:none;">${escapeHtml(t.title)}</a>`),
      )
      .join('');
    body += buildSection('Tasks You Completed', '&#9989;', items);
  }

  // Section 2: Project Status Changes
  if (params.projectsWithChanges.length > 0) {
    const items = params.projectsWithChanges
      .map((p) =>
        buildItemRow(
          `<a href="${params.appUrl}/portfolio/projects/${p.id}" style="color:#2D69E0;text-decoration:none;">${escapeHtml(p.name)}</a>`,
          `${statusBadge(p.oldStatus)} &rarr; ${statusBadge(p.newStatus)}`,
        ),
      )
      .join('');
    body += buildSection('Project Status Changes', '&#128260;', items);
  }

  // Section 3: Tasks Completed on Your Projects
  if (params.tasksClosedOnProjects.length > 0) {
    const items = params.tasksClosedOnProjects
      .map((t) =>
        buildItemRow(
          `<a href="${params.appUrl}/tasks/${t.id}" style="color:#2D69E0;text-decoration:none;">${escapeHtml(t.title)}</a>`,
          escapeHtml(t.projectName),
        ),
      )
      .join('');
    body += buildSection('Tasks Completed on Your Projects', '&#128203;', items);
  }

  // Section 4: Your Top Priority Tasks
  if (params.topTasks.length > 0) {
    const items = params.topTasks
      .map((t) => {
        const due = t.dueDate ? `Due: ${t.dueDate}` : '';
        const meta = [priorityBadge(t.priority), due].filter(Boolean).join(' &middot; ');
        return buildItemRow(
          `<a href="${params.appUrl}/tasks/${t.id}" style="color:#2D69E0;text-decoration:none;">${escapeHtml(t.title)}</a>`,
          meta,
        );
      })
      .join('');
    body += buildSection('Your Top Priority Tasks', '&#128293;', items);
  }

  // Section 5: Projects You Lead
  if (params.topProjectsAsLead.length > 0) {
    const items = params.topProjectsAsLead
      .map((p) =>
        buildItemRow(
          `<a href="${params.appUrl}/portfolio/projects/${p.id}" style="color:#2D69E0;text-decoration:none;">${escapeHtml(p.name)}</a>`,
          statusBadge(p.status),
        ),
      )
      .join('');
    body += buildSection('Projects You Lead', '&#11088;', items);
  }

  // Section 6: Projects You Contribute To
  if (params.topProjectsAsContributor.length > 0) {
    const items = params.topProjectsAsContributor
      .map((p) =>
        buildItemRow(
          `<a href="${params.appUrl}/portfolio/projects/${p.id}" style="color:#2D69E0;text-decoration:none;">${escapeHtml(p.name)}</a>`,
          statusBadge(p.status),
        ),
      )
      .join('');
    body += buildSection('Projects You Contribute To', '&#129309;', items);
  }

  // Section 7: New Requests
  if (params.newRequests.length > 0) {
    const items = params.newRequests
      .map((r) =>
        buildItemRow(`<a href="${params.appUrl}/portfolio/requests/${r.id}" style="color:#2D69E0;text-decoration:none;">${escapeHtml(r.name)}</a>`),
      )
      .join('');
    body += buildSection('New Requests', '&#128229;', items);
  }

  body += buildCtaButton(params.appUrl);

  const html = emailWrapper(body, { subtitle: 'Weekly Review', preferencesUrl });

  // Build plaintext fallback
  let text = `KANAP Weekly Review - ${params.weekLabel}\n\n`;
  text += `Hi ${params.userName}, here's your summary for the week of ${params.weekLabel}.\n\n`;

  if (params.tasksClosed.length > 0) {
    text += `TASKS YOU COMPLETED (${params.tasksClosed.length})\n`;
    for (const t of params.tasksClosed) {
      text += `  - ${t.title}: ${params.appUrl}/tasks/${t.id}\n`;
    }
    text += '\n';
  }

  if (params.projectsWithChanges.length > 0) {
    text += `PROJECT STATUS CHANGES (${params.projectsWithChanges.length})\n`;
    for (const p of params.projectsWithChanges) {
      text += `  - ${p.name}: ${formatStatus(p.oldStatus)} -> ${formatStatus(p.newStatus)}: ${params.appUrl}/portfolio/projects/${p.id}\n`;
    }
    text += '\n';
  }

  if (params.tasksClosedOnProjects.length > 0) {
    text += `TASKS COMPLETED ON YOUR PROJECTS (${params.tasksClosedOnProjects.length})\n`;
    for (const t of params.tasksClosedOnProjects) {
      text += `  - ${t.title} (${t.projectName}): ${params.appUrl}/tasks/${t.id}\n`;
    }
    text += '\n';
  }

  if (params.topTasks.length > 0) {
    text += `YOUR TOP PRIORITY TASKS (${params.topTasks.length})\n`;
    for (const t of params.topTasks) {
      const due = t.dueDate ? ` (Due: ${t.dueDate})` : '';
      text += `  - [${formatStatus(t.priority)}] ${t.title}${due}: ${params.appUrl}/tasks/${t.id}\n`;
    }
    text += '\n';
  }

  if (params.topProjectsAsLead.length > 0) {
    text += `PROJECTS YOU LEAD (${params.topProjectsAsLead.length})\n`;
    for (const p of params.topProjectsAsLead) {
      text += `  - ${p.name} (${formatStatus(p.status)}): ${params.appUrl}/portfolio/projects/${p.id}\n`;
    }
    text += '\n';
  }

  if (params.topProjectsAsContributor.length > 0) {
    text += `PROJECTS YOU CONTRIBUTE TO (${params.topProjectsAsContributor.length})\n`;
    for (const p of params.topProjectsAsContributor) {
      text += `  - ${p.name} (${formatStatus(p.status)}): ${params.appUrl}/portfolio/projects/${p.id}\n`;
    }
    text += '\n';
  }

  if (params.newRequests.length > 0) {
    text += `NEW REQUESTS (${params.newRequests.length})\n`;
    for (const r of params.newRequests) {
      text += `  - ${r.name}: ${params.appUrl}/portfolio/requests/${r.id}\n`;
    }
    text += '\n';
  }

  text += `Go to KANAP: ${params.appUrl}\n\n`;
  text += `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html, text };
}
