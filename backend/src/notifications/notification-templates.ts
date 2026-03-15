/**
 * Email template functions for notifications.
 * Each returns { subject, html, text, attachments } for use with EmailService.
 */
import type { EmailAttachment } from '../email/email.service';
import type { EmailBranding } from '../email/email-branding';
import { getDefaultEmailBranding } from '../email/email-branding';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
}

export interface EmailWrapperResult {
  html: string;
  attachments: EmailAttachment[];
}

export interface ActionButton {
  label: string;
  url: string;
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
 * Compute a readable foreground color (white or dark) for text on a given background.
 * Uses relative luminance per WCAG 2.0.
 */
function contrastTextColor(hexBg: string): string {
  const hex = hexBg.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.4 ? '#111827' : '#ffffff';
}

function buildActionButtons(buttons: ActionButton[] | undefined, primaryColor: string): string {
  if (!buttons || buttons.length === 0) return '';
  const textColor = contrastTextColor(primaryColor);
  const rendered = buttons
    .map((button) => (
      `<a href="${button.url}" style="display:inline-block;background-color:${primaryColor};color:${textColor};text-decoration:none;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:600;margin-right:8px;margin-bottom:8px;">${escapeHtml(button.label)}</a>`
    ))
    .join('');
  return `<div style="margin-top:20px;">${rendered}</div>`;
}

/**
 * Shared email wrapper: thin colored accent bar, white card body, logo in footer.
 * Returns { html, attachments } — the logo is always included as a CID inline attachment.
 */
export function emailWrapper(
  body: string,
  options?: {
    preferencesUrl?: string;
    branding?: EmailBranding;
  },
): EmailWrapperResult {
  const branding = options?.branding ?? getDefaultEmailBranding();
  const pc = branding.primaryColor;
  const hasLogo = branding.logoBuffer.length > 0;
  const preferencesLink = options?.preferencesUrl
    ? `<a href="${options.preferencesUrl}" style="color:#9ca3af;text-decoration:none;font-size:11px;">Manage notification preferences</a>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
<!-- Accent bar -->
<tr><td style="background-color:${pc};height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>
<!-- Body -->
<tr><td style="padding:32px;line-height:1.6;font-size:15px;color:#374151;">
${body}
</td></tr>
<!-- Footer -->
<tr><td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
${hasLogo
    ? `<img src="cid:${branding.logoCid}" alt="KANAP" width="24" height="24" style="display:inline-block;vertical-align:middle;max-height:24px;width:auto;max-width:24px;" />
<span style="display:inline-block;vertical-align:middle;margin-left:6px;color:#9ca3af;font-size:11px;font-weight:600;letter-spacing:0.5px;">Powered by KANAP</span>`
    : '<span style="display:inline-block;vertical-align:middle;color:#9ca3af;font-size:11px;font-weight:600;letter-spacing:0.5px;">Powered by KANAP</span>'}
${preferencesLink ? `<br />${preferencesLink}` : ''}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const attachments: EmailAttachment[] = hasLogo
    ? [
      {
        filename: 'logo.png',
        content: branding.logoBuffer.toString('base64'),
        contentType: branding.logoContentType,
        contentId: branding.logoCid,
      },
    ]
    : [];

  return { html, attachments };
}

// Template: Status Change
export function buildStatusChangeEmail(params: {
  itemType: 'request' | 'project' | 'task' | 'contract' | 'opex';
  itemName: string;
  itemUrl: string;
  oldStatus: string;
  newStatus: string;
  actionButtons?: ActionButton[];
  branding?: EmailBranding;
}): EmailContent {
  const typeLabel = {
    request: 'Request',
    project: 'Project',
    task: 'Task',
    contract: 'Contract',
    opex: 'OPEX Item',
  }[params.itemType];
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';

  const subject = `${typeLabel} "${params.itemName}" status updated`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';
  const actionButtons = params.actionButtons && params.actionButtons.length > 0
    ? params.actionButtons
    : [{ label: `View ${typeLabel}`, url: params.itemUrl }];

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${typeLabel} Status Update</h2>
    <p>The ${typeLabel.toLowerCase()} <strong>${escapeHtml(params.itemName)}</strong> has been updated.</p>
    <p>Status changed from <strong>${formatStatus(params.oldStatus)}</strong>
       to <strong>${formatStatus(params.newStatus)}</strong>.</p>
    ${buildActionButtons(actionButtons, pc)}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });

  const actionText = actionButtons.map((b) => `${b.label}: ${b.url}`).join('\n');
  const text =
    `${typeLabel} "${params.itemName}" status changed from ${formatStatus(params.oldStatus)} to ${formatStatus(params.newStatus)}.\n` +
    `${actionText}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Status Change with Comment
export function buildStatusChangeWithCommentEmail(params: {
  itemType: 'request' | 'project' | 'task' | 'contract' | 'opex';
  itemName: string;
  itemUrl: string;
  oldStatus: string;
  newStatus: string;
  authorName: string;
  commentHtml: string;
  commentTextPreview: string;
  actionButtons?: ActionButton[];
  branding?: EmailBranding;
}): EmailContent {
  const typeLabel = {
    request: 'Request',
    project: 'Project',
    task: 'Task',
    contract: 'Contract',
    opex: 'OPEX Item',
  }[params.itemType];
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';

  const subject = `${typeLabel} "${params.itemName}": status changed to ${formatStatus(params.newStatus)}`;
  const safeHtml = params.commentHtml || '<p>(No comment content)</p>';
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';
  const actionButtons = params.actionButtons && params.actionButtons.length > 0
    ? params.actionButtons
    : [{ label: `View ${typeLabel}`, url: params.itemUrl }];

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${typeLabel} Status Update</h2>
    <p>The ${typeLabel.toLowerCase()} <strong>${escapeHtml(params.itemName)}</strong> has been updated.</p>
    <p>Status changed from <strong>${formatStatus(params.oldStatus)}</strong>
       to <strong>${formatStatus(params.newStatus)}</strong>.</p>
    <p style="margin:18px 0 8px 0;color:#111827;"><strong>${escapeHtml(params.authorName)}</strong> added a comment:</p>
    <div style="border-left:3px solid ${pc};padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:8px 0 16px 0;color:#374151;">
      ${safeHtml}
    </div>
    ${buildActionButtons(actionButtons, pc)}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });

  const actionText = actionButtons.map((b) => `${b.label}: ${b.url}`).join('\n');
  const text =
    `${typeLabel} "${params.itemName}" status changed from ${formatStatus(params.oldStatus)} to ${formatStatus(params.newStatus)}.\n` +
    `${params.authorName} commented: "${params.commentTextPreview}".\n` +
    `${actionText}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Team Addition
export function buildTeamAddedEmail(params: {
  itemType: 'request' | 'project';
  itemName: string;
  itemUrl: string;
  role: string;
  branding?: EmailBranding;
}): EmailContent {
  const typeLabel = params.itemType === 'request' ? 'Request' : 'Project';
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = `You've been added to ${typeLabel} "${params.itemName}"`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">You've Been Added to a ${typeLabel}</h2>
    <p>You have been added as <strong>${formatRole(params.role)}</strong>
       on <strong>${escapeHtml(params.itemName)}</strong>.</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });

  const text =
    `You've been added as ${formatRole(params.role)} on ${typeLabel} "${params.itemName}".\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Team Member Added (for IT Lead notification)
export function buildTeamMemberAddedEmail(params: {
  itemType: 'request' | 'project';
  itemName: string;
  itemUrl: string;
  addedUserName: string;
  role: string;
  branding?: EmailBranding;
}): EmailContent {
  const typeLabel = params.itemType === 'request' ? 'Request' : 'Project';
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = `New team member on ${typeLabel} "${params.itemName}"`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">New Team Member</h2>
    <p><strong>${escapeHtml(params.addedUserName)}</strong> has been added as
       <strong>${formatRole(params.role)}</strong> on ${typeLabel.toLowerCase()}
       <strong>${escapeHtml(params.itemName)}</strong>.</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });

  const text =
    `${params.addedUserName} has been added as ${formatRole(params.role)} on ${typeLabel} "${params.itemName}".\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Comment Added
export function buildCommentEmail(params: {
  itemType: 'request' | 'project' | 'task';
  itemName: string;
  itemUrl: string;
  authorName: string;
  commentHtml: string;
  commentTextPreview: string;
  branding?: EmailBranding;
}): EmailContent {
  const typeLabel = { request: 'Request', project: 'Project', task: 'Task' }[params.itemType];
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = `New comment on ${typeLabel} "${params.itemName}"`;
  const safeHtml = params.commentHtml || '<p>(No comment content)</p>';
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">New Comment</h2>
    <p><strong>${escapeHtml(params.authorName)}</strong> commented on ${typeLabel.toLowerCase()}
       <strong>${escapeHtml(params.itemName)}</strong>:</p>
    <div style="border-left:3px solid ${pc};padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:16px 0;color:#374151;">
      ${safeHtml}
    </div>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });

  const text =
    `${params.authorName} commented on ${typeLabel} "${params.itemName}": "${params.commentTextPreview}".\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Share Item
export function buildShareEmail(params: {
  itemType: 'request' | 'project' | 'task';
  itemName: string;
  itemUrl: string;
  senderName: string;
  message?: string;
  branding?: EmailBranding;
}): EmailContent {
  const typeLabel = { request: 'Request', project: 'Project', task: 'Task' }[params.itemType];
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = `${params.senderName} shared ${typeLabel} "${params.itemName}" with you`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const messageBlock = params.message
    ? `<div style="border-left:3px solid ${pc};padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:16px 0;color:#374151;">
      ${escapeHtml(params.message)}
    </div>`
    : '';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${typeLabel} Shared With You</h2>
    <p><strong>${escapeHtml(params.senderName)}</strong> shared the ${typeLabel.toLowerCase()}
       <strong>${escapeHtml(params.itemName)}</strong> with you.</p>
    ${messageBlock}
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });

  const messageText = params.message ? `\nMessage: "${params.message}"\n` : '';
  const text =
    `${params.senderName} shared ${typeLabel} "${params.itemName}" with you.${messageText}\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Task Assigned
export function buildTaskAssignedEmail(params: {
  taskTitle: string;
  taskUrl: string;
  assignerName: string;
  dueDate?: string;
  branding?: EmailBranding;
}): EmailContent {
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);
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
    <p style="margin-top:24px;"><a href="${params.taskUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View Task</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });

  const text =
    `${params.assignerName} assigned you the task "${params.taskTitle}".${params.dueDate ? ` Due: ${params.dueDate}.` : ''}\n` +
    `View: ${params.taskUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Knowledge Workflow Requested
export function buildKnowledgeWorkflowRequestedEmail(params: {
  documentRef: string;
  documentTitle: string;
  documentUrl?: string | null;
  requesterName: string;
  stage: 'review' | 'approval';
  branding?: EmailBranding;
}): EmailContent {
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const subject = `${params.stage === 'review' ? 'Review requested' : 'Approval requested'}: ${params.documentRef} ${params.documentTitle}`;
  const preferencesUrl = params.documentUrl ? `${getBaseUrl(params.documentUrl)}/settings/notifications` : undefined;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${params.stage === 'review' ? 'Document Review Requested' : 'Document Approval Requested'}</h2>
    <p><strong>${escapeHtml(params.requesterName)}</strong> requested ${params.stage === 'review' ? 'a review' : 'an approval'} for document
       <strong>${escapeHtml(params.documentRef)}</strong>.</p>
    <p>Title: <strong>${escapeHtml(params.documentTitle)}</strong></p>
    ${buildActionButtons(params.documentUrl ? [{ label: 'Open Document', url: params.documentUrl }] : undefined, pc)}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });
  const text = [
    `${params.requesterName} requested ${params.stage === 'review' ? 'a review' : 'an approval'} for ${params.documentRef}.`,
    `Title: ${params.documentTitle}`,
    params.documentUrl ? `Open document: ${params.documentUrl}` : null,
    preferencesUrl ? `Manage notification preferences: ${preferencesUrl}` : null,
  ].filter(Boolean).join('\n\n');

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Knowledge Workflow Approved
export function buildKnowledgeWorkflowApprovedEmail(params: {
  documentRef: string;
  documentTitle: string;
  documentUrl?: string | null;
  branding?: EmailBranding;
}): EmailContent {
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const subject = `Document approved: ${params.documentRef} ${params.documentTitle}`;
  const preferencesUrl = params.documentUrl ? `${getBaseUrl(params.documentUrl)}/settings/notifications` : undefined;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">Document Approved</h2>
    <p>The review workflow for <strong>${escapeHtml(params.documentRef)}</strong> has been approved and the document is now published.</p>
    <p>Title: <strong>${escapeHtml(params.documentTitle)}</strong></p>
    ${buildActionButtons(params.documentUrl ? [{ label: 'Open Document', url: params.documentUrl }] : undefined, pc)}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });
  const text = [
    `The review workflow for ${params.documentRef} has been approved and the document is now published.`,
    `Title: ${params.documentTitle}`,
    params.documentUrl ? `Open document: ${params.documentUrl}` : null,
    preferencesUrl ? `Manage notification preferences: ${preferencesUrl}` : null,
  ].filter(Boolean).join('\n\n');

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Knowledge Workflow Changes Requested
export function buildKnowledgeWorkflowChangesRequestedEmail(params: {
  documentRef: string;
  documentTitle: string;
  documentUrl?: string | null;
  actorName: string;
  comment: string;
  branding?: EmailBranding;
}): EmailContent {
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const subject = `Changes requested: ${params.documentRef} ${params.documentTitle}`;
  const preferencesUrl = params.documentUrl ? `${getBaseUrl(params.documentUrl)}/settings/notifications` : undefined;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">Changes Requested</h2>
    <p><strong>${escapeHtml(params.actorName)}</strong> requested changes for document
       <strong>${escapeHtml(params.documentRef)}</strong>.</p>
    <p>Title: <strong>${escapeHtml(params.documentTitle)}</strong></p>
    <div style="border-left:3px solid ${pc};padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:16px 0;color:#374151;">
      ${escapeHtml(params.comment)}
    </div>
    ${buildActionButtons(params.documentUrl ? [{ label: 'Open Document', url: params.documentUrl }] : undefined, pc)}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });
  const text = [
    `${params.actorName} requested changes for ${params.documentRef}.`,
    `Title: ${params.documentTitle}`,
    `Comment: ${params.comment}`,
    params.documentUrl ? `Open document: ${params.documentUrl}` : null,
    preferencesUrl ? `Manage notification preferences: ${preferencesUrl}` : null,
  ].filter(Boolean).join('\n\n');

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Knowledge Workflow Cancelled
export function buildKnowledgeWorkflowCancelledEmail(params: {
  documentRef: string;
  documentTitle: string;
  documentUrl?: string | null;
  actorName: string;
  branding?: EmailBranding;
}): EmailContent {
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const subject = `Review cancelled: ${params.documentRef} ${params.documentTitle}`;
  const preferencesUrl = params.documentUrl ? `${getBaseUrl(params.documentUrl)}/settings/notifications` : undefined;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">Review Cancelled</h2>
    <p><strong>${escapeHtml(params.actorName)}</strong> cancelled the active review workflow for document
       <strong>${escapeHtml(params.documentRef)}</strong>.</p>
    <p>Title: <strong>${escapeHtml(params.documentTitle)}</strong></p>
    ${buildActionButtons(params.documentUrl ? [{ label: 'Open Document', url: params.documentUrl }] : undefined, pc)}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });
  const text = [
    `${params.actorName} cancelled the active review workflow for ${params.documentRef}.`,
    `Title: ${params.documentTitle}`,
    params.documentUrl ? `Open document: ${params.documentUrl}` : null,
    preferencesUrl ? `Manage notification preferences: ${preferencesUrl}` : null,
  ].filter(Boolean).join('\n\n');

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Expiration Warning
export function buildExpirationWarningEmail(params: {
  itemType: 'contract' | 'opex';
  itemName: string;
  itemUrl: string;
  expirationDate: string;
  daysRemaining: number;
  warningType: 'expiration' | 'cancellation_deadline';
  branding?: EmailBranding;
}): EmailContent {
  const typeLabel = params.itemType === 'contract' ? 'Contract' : 'OPEX Item';
  const warningLabel =
    params.warningType === 'cancellation_deadline' ? 'cancellation deadline' : 'expiration';
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = `${typeLabel} "${params.itemName}" ${warningLabel} in ${params.daysRemaining} days`;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${typeLabel} ${params.warningType === 'cancellation_deadline' ? 'Cancellation Deadline' : 'Expiration'} Warning</h2>
    <p>The ${typeLabel.toLowerCase()} <strong>${escapeHtml(params.itemName)}</strong> has a
       ${warningLabel} coming up on <strong>${params.expirationDate}</strong>
       (${params.daysRemaining} days remaining).</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">View ${typeLabel}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding });

  const text =
    `${typeLabel} "${params.itemName}" ${warningLabel} on ${params.expirationDate} (${params.daysRemaining} days).\n` +
    `View: ${params.itemUrl}\n\n` +
    `Manage notification preferences: ${preferencesUrl}`;

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// ============================================
// Weekly Review — helper functions
// ============================================

function buildStatsBar(stats: Array<{ label: string; count: number }>, pc: string): string {
  const cells = stats
    .map(
      (s) => `<td align="center" style="padding:14px 8px;width:${Math.floor(100 / stats.length)}%;">
<div style="font-size:28px;font-weight:bold;color:${pc};line-height:1.2;">${s.count}</div>
<div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-top:6px;">${escapeHtml(s.label)}</div>
</td>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;margin-bottom:28px;border:1px solid #e5e7eb;">
<tr>${cells}</tr>
</table>`;
}

function buildSection(title: string, emoji: string, contentHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
<tr><td style="padding-bottom:10px;border-bottom:2px solid #e5e7eb;">
<span style="font-size:15px;font-weight:700;color:#111827;letter-spacing:0.2px;">${emoji} ${escapeHtml(title)}</span>
</td></tr>
<tr><td style="padding-top:12px;">
${contentHtml}
</td></tr>
</table>`;
}

function buildItemRow(linkHtml: string, pc: string, metaHtml?: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
<tr><td style="padding:10px 14px;background-color:#f9fafb;border-left:3px solid ${pc};border-radius:0 6px 6px 0;">
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
    pending: { bg: '#fff7ed', text: '#9a3412' },
    in_testing: { bg: '#ede9fe', text: '#5b21b6' },
    completed: { bg: '#d1fae5', text: '#065f46' },
    done: { bg: '#d1fae5', text: '#065f46' },
  };
  const c = colors[status] || { bg: '#f3f4f6', text: '#374151' };
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;background-color:${c.bg};color:${c.text};">${escapeHtml(formatStatus(status))}</span>`;
}

function buildCtaButton(appUrl: string, pc: string): string {
  const btnText = contrastTextColor(pc);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
<tr><td align="center">
<a href="${appUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;">Go to KANAP</a>
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
  branding?: EmailBranding;
}): EmailContent {
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
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

  let body = `<p style="font-size:16px;color:#111827;margin:0 0 24px 0;">Hi ${escapeHtml(params.userName)}, here's your summary for the week of <strong>${escapeHtml(params.weekLabel)}</strong>.</p>`;

  if (!hasContent) {
    body += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td align="center" style="padding:32px;background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
<div style="font-size:32px;margin-bottom:12px;">&#11088;</div>
<div style="font-size:14px;color:#6b7280;">No activity to report this week. Keep up the good work!</div>
</td></tr>
</table>`;
    body += buildCtaButton(params.appUrl, pc);
    const wrapper = emailWrapper(body, { preferencesUrl, branding });
    const text =
      `KANAP Weekly Review - ${params.weekLabel}\n\n` +
      `Hi ${params.userName},\n\n` +
      `No activity to report this week. Keep up the good work!\n\n` +
      `Go to KANAP: ${params.appUrl}\n\n` +
      `Manage notification preferences: ${preferencesUrl}`;
    return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
  }

  // Stats bar
  body += buildStatsBar([
    { label: 'Completed', count: params.tasksClosed.length },
    { label: 'Status Changes', count: params.projectsWithChanges.length },
    { label: 'Open Tasks', count: params.topTasks.length },
  ], pc);

  // Section 1: Tasks You Completed
  if (params.tasksClosed.length > 0) {
    const items = params.tasksClosed
      .map((t) =>
        buildItemRow(`<a href="${params.appUrl}/tasks/${t.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(t.title)}</a>`, pc),
      )
      .join('');
    body += buildSection('Tasks You Completed', '&#9989;', items);
  }

  // Section 2: Project Status Changes
  if (params.projectsWithChanges.length > 0) {
    const items = params.projectsWithChanges
      .map((p) =>
        buildItemRow(
          `<a href="${params.appUrl}/portfolio/projects/${p.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(p.name)}</a>`,
          pc,
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
          `<a href="${params.appUrl}/tasks/${t.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(t.title)}</a>`,
          pc,
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
          `<a href="${params.appUrl}/tasks/${t.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(t.title)}</a>`,
          pc,
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
          `<a href="${params.appUrl}/portfolio/projects/${p.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(p.name)}</a>`,
          pc,
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
          `<a href="${params.appUrl}/portfolio/projects/${p.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(p.name)}</a>`,
          pc,
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
        buildItemRow(`<a href="${params.appUrl}/portfolio/requests/${r.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(r.name)}</a>`, pc),
      )
      .join('');
    body += buildSection('New Requests', '&#128229;', items);
  }

  body += buildCtaButton(params.appUrl, pc);

  const wrapper = emailWrapper(body, { preferencesUrl, branding });

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

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Trial Activation Email
export function buildActivationEmail(params: {
  greeting: string;
  activationUrl: string;
}): EmailContent {
  const subject = 'Confirm your KANAP workspace';
  const body = `
    <p>Hello ${escapeHtml(params.greeting)},</p>
    <p>Thanks for your interest in KANAP. Please confirm your email to provision your tenant.</p>
    <p style="text-align:center;margin:32px 0;">
      <a href="${params.activationUrl}" style="background:#2D69E0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;font-weight:600;">Activate my workspace</a>
    </p>
    <p>If the button above does not work, copy and paste this link into your browser:</p>
    <p style="word-break:break-all;"><a href="${params.activationUrl}">${escapeHtml(params.activationUrl)}</a></p>
    <p>The link expires in 48 hours. If you did not request this trial you can ignore this message.</p>
  `;
  // Activation emails always use KANAP default branding (no tenant yet)
  const wrapper = emailWrapper(body);
  const text =
    `Hello ${params.greeting},\n\n` +
    `Thanks for your interest in KANAP. Confirm your email to provision your tenant.\n\n` +
    `Activate your workspace: ${params.activationUrl}\n\n` +
    `The link expires in 48 hours. If you did not request this trial you can ignore this message.`;
  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Contact Form (internal to support@kanap.net)
export function buildContactFormEmail(params: {
  name: string;
  email: string;
  company: string;
  message: string;
}): EmailContent {
  const subject = `Contact form submission from ${params.name} (${params.company})`;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">New contact form submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(params.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(params.email)}</p>
    <p><strong>Company:</strong> ${escapeHtml(params.company)}</p>
    <p><strong>Message:</strong></p>
    <div style="white-space:pre-wrap;background:#f9fafb;padding:16px;border-radius:6px;border:1px solid #e5e7eb;color:#374151;">${escapeHtml(params.message)}</div>
  `;
  const wrapper = emailWrapper(body);
  const text =
    `New contact form submission\n\n` +
    `Name: ${params.name}\nEmail: ${params.email}\nCompany: ${params.company}\n\n` +
    `Message:\n${params.message}`;
  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Enterprise Support Admin Notification (internal)
export function buildSupportRequestEmail(params: {
  companyName: string;
  contactName: string;
  billingEmail: string;
  country: string;
  vatId?: string;
}): EmailContent {
  const subject = `New Enterprise Support request: ${params.companyName}`;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">New Enterprise Support request</h2>
    <p><strong>Company:</strong> ${escapeHtml(params.companyName)}</p>
    <p><strong>Contact:</strong> ${escapeHtml(params.contactName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(params.billingEmail)}</p>
    <p><strong>Country:</strong> ${escapeHtml(params.country)}</p>
    <p><strong>VAT:</strong> ${escapeHtml(params.vatId || 'N/A')}</p>
  `;
  const wrapper = emailWrapper(body);
  const text =
    `Company: ${params.companyName}\nContact: ${params.contactName}\n` +
    `Email: ${params.billingEmail}\nCountry: ${params.country}\n` +
    `VAT: ${params.vatId || 'N/A'}`;
  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: New Tenant Admin Notification (internal)
export function buildNewTenantNotificationEmail(params: {
  tenantName: string;
  slug: string;
  email: string;
  countryIso: string;
}): EmailContent {
  const subject = `New tenant created: ${params.tenantName} (${params.slug})`;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">New tenant created</h2>
    <p><strong>Name:</strong> ${escapeHtml(params.tenantName)}</p>
    <p><strong>Slug:</strong> ${escapeHtml(params.slug)}</p>
    <p><strong>Registered email:</strong> ${escapeHtml(params.email)}</p>
    <p><strong>Country:</strong> ${escapeHtml(params.countryIso)}</p>
  `;
  const wrapper = emailWrapper(body);
  const text =
    `New tenant created\n\nName: ${params.tenantName}\nSlug: ${params.slug}\n` +
    `Registered email: ${params.email}\nCountry: ${params.countryIso}`;
  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}
