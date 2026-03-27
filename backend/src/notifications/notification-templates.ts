/**
 * Email template functions for notifications.
 * Each returns { subject, html, text, attachments } for use with EmailService.
 */
import type { EmailAttachment } from '../email/email.service';
import type { EmailBranding } from '../email/email-branding';
import { getDefaultEmailBranding } from '../email/email-branding';
import { getEmailStrings, interpolate } from '../i18n/email-i18n';
import type { EmailStrings } from '../i18n/email-locales/en';

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

type ItemTypeLabelKey = 'request' | 'project' | 'task' | 'contract' | 'opex';

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

function getItemTypeStrings(strings: EmailStrings, itemType: ItemTypeLabelKey) {
  return strings.common.itemTypes[itemType];
}

function buildManagePreferencesText(
  locale: string | null | undefined,
  preferencesUrl: string,
): string {
  return interpolate(getEmailStrings(locale).common.footer.managePreferencesText, {
    url: preferencesUrl,
  });
}

function buildViewText(locale: string | null | undefined, url: string): string {
  return interpolate(getEmailStrings(locale).common.labels.viewText, { url });
}

function buildOpenDocumentText(locale: string | null | undefined, url: string): string {
  return interpolate(getEmailStrings(locale).common.labels.openDocumentText, { url });
}

function joinTextBlocks(lines: Array<string | null | undefined>): string {
  return lines.filter((line): line is string => Boolean(line && line.trim().length > 0)).join('\n\n');
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
    locale?: string;
  },
): EmailWrapperResult {
  const branding = options?.branding ?? getDefaultEmailBranding();
  const strings = getEmailStrings(options?.locale);
  const pc = branding.primaryColor;
  const hasLogo = branding.logoBuffer.length > 0;
  const preferencesLink = options?.preferencesUrl
    ? `<a href="${options.preferencesUrl}" style="color:#9ca3af;text-decoration:none;font-size:11px;">${escapeHtml(strings.common.footer.managePreferencesLink)}</a>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(strings.common.htmlLang)}">
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
<span style="display:inline-block;vertical-align:middle;margin-left:6px;color:#9ca3af;font-size:11px;font-weight:600;letter-spacing:0.5px;">${escapeHtml(strings.common.footer.poweredBy)}</span>`
    : `<span style="display:inline-block;vertical-align:middle;color:#9ca3af;font-size:11px;font-weight:600;letter-spacing:0.5px;">${escapeHtml(strings.common.footer.poweredBy)}</span>`}
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
        encoding: 'base64',
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
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const typeLabel = getItemTypeStrings(strings, params.itemType);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';

  const subject = interpolate(strings.notifications.statusChange.subject, {
    itemType: typeLabel.label,
    itemName: params.itemName,
  });
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';
  const actionButtons = params.actionButtons && params.actionButtons.length > 0
    ? params.actionButtons
    : [{ label: typeLabel.view, url: params.itemUrl }];

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${interpolate(strings.notifications.statusChange.heading, {
      itemType: typeLabel.label,
    })}</h2>
    <p>${interpolate(strings.notifications.statusChange.updatedHtml, {
      itemTypeLower: typeLabel.lower,
      itemName: escapeHtml(params.itemName),
    })}</p>
    <p>${interpolate(strings.notifications.statusChange.statusChangedHtml, {
      oldStatus: formatStatus(params.oldStatus),
      newStatus: formatStatus(params.newStatus),
    })}</p>
    ${buildActionButtons(actionButtons, pc)}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });

  const actionText = actionButtons.map((b) => `${b.label}: ${b.url}`).join('\n');
  const text = joinTextBlocks([
    interpolate(strings.notifications.statusChange.text, {
      itemType: typeLabel.label,
      itemName: params.itemName,
      oldStatus: formatStatus(params.oldStatus),
      newStatus: formatStatus(params.newStatus),
    }),
    actionText,
    buildManagePreferencesText(params.locale, preferencesUrl),
  ]);

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
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const typeLabel = getItemTypeStrings(strings, params.itemType);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';

  const subject = interpolate(strings.notifications.statusChangeWithComment.subject, {
    itemType: typeLabel.label,
    itemName: params.itemName,
    newStatus: formatStatus(params.newStatus),
  });
  const safeHtml = params.commentHtml || strings.common.labels.noCommentContentHtml;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';
  const actionButtons = params.actionButtons && params.actionButtons.length > 0
    ? params.actionButtons
    : [{ label: typeLabel.view, url: params.itemUrl }];

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${interpolate(strings.notifications.statusChange.heading, {
      itemType: typeLabel.label,
    })}</h2>
    <p>${interpolate(strings.notifications.statusChange.updatedHtml, {
      itemTypeLower: typeLabel.lower,
      itemName: escapeHtml(params.itemName),
    })}</p>
    <p>${interpolate(strings.notifications.statusChange.statusChangedHtml, {
      oldStatus: formatStatus(params.oldStatus),
      newStatus: formatStatus(params.newStatus),
    })}</p>
    <p style="margin:18px 0 8px 0;color:#111827;">${interpolate(strings.notifications.statusChangeWithComment.commentIntroHtml, {
      authorName: escapeHtml(params.authorName),
    })}</p>
    <div style="border-left:3px solid ${pc};padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:8px 0 16px 0;color:#374151;">
      ${safeHtml}
    </div>
    ${buildActionButtons(actionButtons, pc)}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });

  const actionText = actionButtons.map((b) => `${b.label}: ${b.url}`).join('\n');
  const text = joinTextBlocks([
    interpolate(strings.notifications.statusChange.text, {
      itemType: typeLabel.label,
      itemName: params.itemName,
      oldStatus: formatStatus(params.oldStatus),
      newStatus: formatStatus(params.newStatus),
    }),
    interpolate(strings.notifications.statusChangeWithComment.textComment, {
      authorName: params.authorName,
      commentPreview: params.commentTextPreview,
    }),
    actionText,
    buildManagePreferencesText(params.locale, preferencesUrl),
  ]);

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Team Addition
export function buildTeamAddedEmail(params: {
  itemType: 'request' | 'project';
  itemName: string;
  itemUrl: string;
  role: string;
  branding?: EmailBranding;
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const typeLabel = getItemTypeStrings(strings, params.itemType);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = interpolate(strings.notifications.teamAdded.subject, {
    itemType: typeLabel.label,
    itemName: params.itemName,
  });
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${interpolate(strings.notifications.teamAdded.heading, {
      itemType: typeLabel.label,
    })}</h2>
    <p>${interpolate(strings.notifications.teamAdded.bodyHtml, {
      role: formatRole(params.role),
      itemName: escapeHtml(params.itemName),
    })}</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">${escapeHtml(typeLabel.view)}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });

  const text = joinTextBlocks([
    interpolate(strings.notifications.teamAdded.text, {
      role: formatRole(params.role),
      itemType: typeLabel.label,
      itemName: params.itemName,
    }),
    buildViewText(params.locale, params.itemUrl),
    buildManagePreferencesText(params.locale, preferencesUrl),
  ]);

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
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const typeLabel = getItemTypeStrings(strings, params.itemType);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = interpolate(strings.notifications.teamMemberAdded.subject, {
    itemType: typeLabel.label,
    itemName: params.itemName,
  });
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${strings.notifications.teamMemberAdded.heading}</h2>
    <p>${interpolate(strings.notifications.teamMemberAdded.bodyHtml, {
      addedUserName: escapeHtml(params.addedUserName),
      role: formatRole(params.role),
      itemTypeLower: typeLabel.lower,
      itemName: escapeHtml(params.itemName),
    })}</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">${escapeHtml(typeLabel.view)}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });

  const text = joinTextBlocks([
    interpolate(strings.notifications.teamMemberAdded.text, {
      addedUserName: params.addedUserName,
      role: formatRole(params.role),
      itemType: typeLabel.label,
      itemName: params.itemName,
    }),
    buildViewText(params.locale, params.itemUrl),
    buildManagePreferencesText(params.locale, preferencesUrl),
  ]);

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
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const typeLabel = getItemTypeStrings(strings, params.itemType);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = interpolate(strings.notifications.comment.subject, {
    itemType: typeLabel.label,
    itemName: params.itemName,
  });
  const safeHtml = params.commentHtml || strings.common.labels.noCommentContentHtml;
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${strings.notifications.comment.heading}</h2>
    <p>${interpolate(strings.notifications.comment.introHtml, {
      authorName: escapeHtml(params.authorName),
      itemTypeLower: typeLabel.lower,
      itemName: escapeHtml(params.itemName),
    })}</p>
    <div style="border-left:3px solid ${pc};padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:16px 0;color:#374151;">
      ${safeHtml}
    </div>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">${escapeHtml(typeLabel.view)}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });

  const text = joinTextBlocks([
    interpolate(strings.notifications.comment.text, {
      authorName: params.authorName,
      itemType: typeLabel.label,
      itemName: params.itemName,
      commentPreview: params.commentTextPreview,
    }),
    buildViewText(params.locale, params.itemUrl),
    buildManagePreferencesText(params.locale, preferencesUrl),
  ]);

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
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const typeLabel = getItemTypeStrings(strings, params.itemType);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = interpolate(strings.notifications.share.subject, {
    senderName: params.senderName,
    itemType: typeLabel.label,
    itemName: params.itemName,
  });
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const messageBlock = params.message
    ? `<div style="border-left:3px solid ${pc};padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:16px 0;color:#374151;">
      ${escapeHtml(params.message)}
    </div>`
    : '';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${interpolate(strings.notifications.share.heading, {
      itemType: typeLabel.label,
    })}</h2>
    <p>${interpolate(strings.notifications.share.introHtml, {
      senderName: escapeHtml(params.senderName),
      itemTypeLower: typeLabel.lower,
      itemName: escapeHtml(params.itemName),
    })}</p>
    ${messageBlock}
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">${escapeHtml(typeLabel.view)}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });

  const text = joinTextBlocks([
    interpolate(strings.notifications.share.text, {
      senderName: params.senderName,
      itemType: typeLabel.label,
      itemName: params.itemName,
    }),
    params.message
      ? interpolate(strings.common.labels.messageText, { message: params.message })
      : null,
    buildViewText(params.locale, params.itemUrl),
    buildManagePreferencesText(params.locale, preferencesUrl),
  ]);

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Task Assigned
export function buildTaskAssignedEmail(params: {
  taskTitle: string;
  taskUrl: string;
  assignerName: string;
  dueDate?: string;
  branding?: EmailBranding;
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);
  const taskType = strings.common.itemTypes.task;
  const subject = interpolate(strings.notifications.taskAssigned.subject, {
    taskTitle: params.taskTitle,
  });
  const preferencesUrl = getBaseUrl(params.taskUrl) + '/settings/notifications';

  const dueLine = params.dueDate
    ? `<p>${interpolate(strings.common.labels.dueDateHtml, { value: params.dueDate })}</p>`
    : '';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${strings.notifications.taskAssigned.heading}</h2>
    <p>${interpolate(strings.notifications.taskAssigned.introHtml, {
      assignerName: escapeHtml(params.assignerName),
      taskTitle: escapeHtml(params.taskTitle),
    })}</p>
    ${dueLine}
    <p style="margin-top:24px;"><a href="${params.taskUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">${escapeHtml(taskType.view)}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });

  const text = joinTextBlocks([
    `${interpolate(strings.notifications.taskAssigned.text, {
      assignerName: params.assignerName,
      taskTitle: params.taskTitle,
    })}${params.dueDate
      ? interpolate(strings.notifications.taskAssigned.dueTextSuffix, { dueDate: params.dueDate })
      : ''}`,
    buildViewText(params.locale, params.taskUrl),
    buildManagePreferencesText(params.locale, preferencesUrl),
  ]);

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
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const subject = interpolate(
    params.stage === 'review'
      ? strings.knowledge.requested.subjectReview
      : strings.knowledge.requested.subjectApproval,
    {
      documentRef: params.documentRef,
      documentTitle: params.documentTitle,
    },
  );
  const preferencesUrl = params.documentUrl ? `${getBaseUrl(params.documentUrl)}/settings/notifications` : undefined;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${params.stage === 'review'
      ? strings.knowledge.requested.headingReview
      : strings.knowledge.requested.headingApproval}</h2>
    <p>${interpolate(
      params.stage === 'review'
        ? strings.knowledge.requested.introReviewHtml
        : strings.knowledge.requested.introApprovalHtml,
      {
        requesterName: escapeHtml(params.requesterName),
        documentRef: escapeHtml(params.documentRef),
      },
    )}</p>
    <p>${interpolate(strings.common.labels.titleHtml, { value: escapeHtml(params.documentTitle) })}</p>
    ${buildActionButtons(
      params.documentUrl
        ? [{ label: strings.common.labels.openDocument, url: params.documentUrl }]
        : undefined,
      pc,
    )}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });
  const text = joinTextBlocks([
    interpolate(
      params.stage === 'review'
        ? strings.knowledge.requested.introReviewText
        : strings.knowledge.requested.introApprovalText,
      {
        requesterName: params.requesterName,
        documentRef: params.documentRef,
      },
    ),
    interpolate(strings.common.labels.titleText, { value: params.documentTitle }),
    params.documentUrl ? buildOpenDocumentText(params.locale, params.documentUrl) : null,
    preferencesUrl ? buildManagePreferencesText(params.locale, preferencesUrl) : null,
  ]);

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Knowledge Workflow Approved
export function buildKnowledgeWorkflowApprovedEmail(params: {
  documentRef: string;
  documentTitle: string;
  documentUrl?: string | null;
  branding?: EmailBranding;
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const subject = interpolate(strings.knowledge.approved.subject, {
    documentRef: params.documentRef,
    documentTitle: params.documentTitle,
  });
  const preferencesUrl = params.documentUrl ? `${getBaseUrl(params.documentUrl)}/settings/notifications` : undefined;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${strings.knowledge.approved.heading}</h2>
    <p>${interpolate(strings.knowledge.approved.bodyHtml, {
      documentRef: escapeHtml(params.documentRef),
    })}</p>
    <p>${interpolate(strings.common.labels.titleHtml, { value: escapeHtml(params.documentTitle) })}</p>
    ${buildActionButtons(
      params.documentUrl
        ? [{ label: strings.common.labels.openDocument, url: params.documentUrl }]
        : undefined,
      pc,
    )}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });
  const text = joinTextBlocks([
    interpolate(strings.knowledge.approved.text, { documentRef: params.documentRef }),
    interpolate(strings.common.labels.titleText, { value: params.documentTitle }),
    params.documentUrl ? buildOpenDocumentText(params.locale, params.documentUrl) : null,
    preferencesUrl ? buildManagePreferencesText(params.locale, preferencesUrl) : null,
  ]);

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
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const subject = interpolate(strings.knowledge.changesRequested.subject, {
    documentRef: params.documentRef,
    documentTitle: params.documentTitle,
  });
  const preferencesUrl = params.documentUrl ? `${getBaseUrl(params.documentUrl)}/settings/notifications` : undefined;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${strings.knowledge.changesRequested.heading}</h2>
    <p>${interpolate(strings.knowledge.changesRequested.introHtml, {
      actorName: escapeHtml(params.actorName),
      documentRef: escapeHtml(params.documentRef),
    })}</p>
    <p>${interpolate(strings.common.labels.titleHtml, { value: escapeHtml(params.documentTitle) })}</p>
    <div style="border-left:3px solid ${pc};padding:12px 16px;background-color:#f9fafb;border-radius:0 4px 4px 0;margin:16px 0;color:#374151;">
      ${escapeHtml(params.comment)}
    </div>
    ${buildActionButtons(
      params.documentUrl
        ? [{ label: strings.common.labels.openDocument, url: params.documentUrl }]
        : undefined,
      pc,
    )}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });
  const text = joinTextBlocks([
    interpolate(strings.knowledge.changesRequested.text, {
      actorName: params.actorName,
      documentRef: params.documentRef,
    }),
    interpolate(strings.common.labels.titleText, { value: params.documentTitle }),
    interpolate(strings.knowledge.changesRequested.commentText, { comment: params.comment }),
    params.documentUrl ? buildOpenDocumentText(params.locale, params.documentUrl) : null,
    preferencesUrl ? buildManagePreferencesText(params.locale, preferencesUrl) : null,
  ]);

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Knowledge Workflow Cancelled
export function buildKnowledgeWorkflowCancelledEmail(params: {
  documentRef: string;
  documentTitle: string;
  documentUrl?: string | null;
  actorName: string;
  branding?: EmailBranding;
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const subject = interpolate(strings.knowledge.cancelled.subject, {
    documentRef: params.documentRef,
    documentTitle: params.documentTitle,
  });
  const preferencesUrl = params.documentUrl ? `${getBaseUrl(params.documentUrl)}/settings/notifications` : undefined;
  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${strings.knowledge.cancelled.heading}</h2>
    <p>${interpolate(strings.knowledge.cancelled.introHtml, {
      actorName: escapeHtml(params.actorName),
      documentRef: escapeHtml(params.documentRef),
    })}</p>
    <p>${interpolate(strings.common.labels.titleHtml, { value: escapeHtml(params.documentTitle) })}</p>
    ${buildActionButtons(
      params.documentUrl
        ? [{ label: strings.common.labels.openDocument, url: params.documentUrl }]
        : undefined,
      pc,
    )}
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });
  const text = joinTextBlocks([
    interpolate(strings.knowledge.cancelled.text, {
      actorName: params.actorName,
      documentRef: params.documentRef,
    }),
    interpolate(strings.common.labels.titleText, { value: params.documentTitle }),
    params.documentUrl ? buildOpenDocumentText(params.locale, params.documentUrl) : null,
    preferencesUrl ? buildManagePreferencesText(params.locale, preferencesUrl) : null,
  ]);

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
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const typeLabel = getItemTypeStrings(strings, params.itemType);
  const warningStrings = strings.notifications.expirationWarning.warningTypes[params.warningType];
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const btnText = contrastTextColor(pc);

  const subject = interpolate(strings.notifications.expirationWarning.subject, {
    itemType: typeLabel.label,
    itemName: params.itemName,
    warningLabel: warningStrings.label,
    daysRemaining: params.daysRemaining,
  });
  const preferencesUrl = getBaseUrl(params.itemUrl) + '/settings/notifications';

  const body = `
    <h2 style="margin:0 0 16px 0;color:#111827;">${interpolate(strings.notifications.expirationWarning.heading, {
      itemType: typeLabel.label,
      warningHeading: warningStrings.heading,
    })}</h2>
    <p>${interpolate(strings.notifications.expirationWarning.bodyHtml, {
      itemTypeLower: typeLabel.lower,
      itemName: escapeHtml(params.itemName),
      warningLabel: warningStrings.label,
      expirationDate: params.expirationDate,
      daysRemaining: params.daysRemaining,
    })}</p>
    <p style="margin-top:24px;"><a href="${params.itemUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">${escapeHtml(typeLabel.view)}</a></p>
  `;
  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });

  const text = joinTextBlocks([
    interpolate(strings.notifications.expirationWarning.text, {
      itemType: typeLabel.label,
      itemName: params.itemName,
      warningLabel: warningStrings.label,
      expirationDate: params.expirationDate,
      daysRemaining: params.daysRemaining,
    }),
    buildViewText(params.locale, params.itemUrl),
    buildManagePreferencesText(params.locale, preferencesUrl),
  ]);

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

function buildCtaButton(appUrl: string, pc: string, label: string): string {
  const btnText = contrastTextColor(pc);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
<tr><td align="center">
<a href="${appUrl}" style="display:inline-block;background-color:${pc};color:${btnText};text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;">${escapeHtml(label)}</a>
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
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const branding = params.branding;
  const pc = branding?.primaryColor ?? '#2D69E0';
  const subject = interpolate(strings.notifications.weeklyReview.subject, {
    weekLabel: params.weekLabel,
  });
  const preferencesUrl = params.appUrl + '/settings/notifications';

  const hasContent =
    params.tasksClosed.length > 0 ||
    params.projectsWithChanges.length > 0 ||
    params.tasksClosedOnProjects.length > 0 ||
    params.topTasks.length > 0 ||
    params.topProjectsAsLead.length > 0 ||
    params.topProjectsAsContributor.length > 0 ||
    params.newRequests.length > 0;

  let body = `<p style="font-size:16px;color:#111827;margin:0 0 24px 0;">${interpolate(strings.notifications.weeklyReview.introHtml, {
    userName: escapeHtml(params.userName),
    weekLabel: escapeHtml(params.weekLabel),
  })}</p>`;

  if (!hasContent) {
    body += `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td align="center" style="padding:32px;background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
<div style="font-size:32px;margin-bottom:12px;">&#11088;</div>
<div style="font-size:14px;color:#6b7280;">${escapeHtml(strings.notifications.weeklyReview.empty)}</div>
</td></tr>
</table>`;
    body += buildCtaButton(params.appUrl, pc, strings.common.buttons.goToKanap);
    const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });
    const text = joinTextBlocks([
      interpolate(strings.notifications.weeklyReview.introText, {
        userName: params.userName,
        weekLabel: params.weekLabel,
      }),
      strings.notifications.weeklyReview.empty,
      `${strings.common.buttons.goToKanap}: ${params.appUrl}`,
      buildManagePreferencesText(params.locale, preferencesUrl),
    ]);
    return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
  }

  // Stats bar
  body += buildStatsBar([
    { label: strings.notifications.weeklyReview.stats.completed, count: params.tasksClosed.length },
    { label: strings.notifications.weeklyReview.stats.statusChanges, count: params.projectsWithChanges.length },
    { label: strings.notifications.weeklyReview.stats.openTasks, count: params.topTasks.length },
  ], pc);

  // Section 1: Tasks You Completed
  if (params.tasksClosed.length > 0) {
    const items = params.tasksClosed
      .map((t) =>
        buildItemRow(`<a href="${params.appUrl}/tasks/${t.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(t.title)}</a>`, pc),
      )
      .join('');
    body += buildSection(strings.notifications.weeklyReview.sections.tasksCompleted, '&#9989;', items);
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
    body += buildSection(strings.notifications.weeklyReview.sections.projectStatusChanges, '&#128260;', items);
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
    body += buildSection(strings.notifications.weeklyReview.sections.tasksCompletedOnProjects, '&#128203;', items);
  }

  // Section 4: Your Top Priority Tasks
  if (params.topTasks.length > 0) {
    const items = params.topTasks
      .map((t) => {
        const due = t.dueDate
          ? escapeHtml(interpolate(strings.notifications.weeklyReview.dueLabel, { dueDate: t.dueDate }))
          : '';
        const meta = [priorityBadge(t.priority), due].filter(Boolean).join(' &middot; ');
        return buildItemRow(
          `<a href="${params.appUrl}/tasks/${t.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(t.title)}</a>`,
          pc,
          meta,
        );
      })
      .join('');
    body += buildSection(strings.notifications.weeklyReview.sections.topTasks, '&#128293;', items);
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
    body += buildSection(strings.notifications.weeklyReview.sections.projectsLead, '&#11088;', items);
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
    body += buildSection(strings.notifications.weeklyReview.sections.projectsContribute, '&#129309;', items);
  }

  // Section 7: New Requests
  if (params.newRequests.length > 0) {
    const items = params.newRequests
      .map((r) =>
        buildItemRow(`<a href="${params.appUrl}/portfolio/requests/${r.id}" style="color:${pc};text-decoration:none;font-weight:500;">${escapeHtml(r.name)}</a>`, pc),
      )
      .join('');
    body += buildSection(strings.notifications.weeklyReview.sections.newRequests, '&#128229;', items);
  }

  body += buildCtaButton(params.appUrl, pc, strings.common.buttons.goToKanap);

  const wrapper = emailWrapper(body, { preferencesUrl, branding, locale: params.locale });

  // Build plaintext fallback
  let text = `${subject}\n\n`;
  text += `${interpolate(strings.notifications.weeklyReview.introText, {
    userName: params.userName,
    weekLabel: params.weekLabel,
  })}\n\n`;

  if (params.tasksClosed.length > 0) {
    text += `${strings.notifications.weeklyReview.sections.tasksCompleted} (${params.tasksClosed.length})\n`;
    for (const t of params.tasksClosed) {
      text += `  - ${t.title}: ${params.appUrl}/tasks/${t.id}\n`;
    }
    text += '\n';
  }

  if (params.projectsWithChanges.length > 0) {
    text += `${strings.notifications.weeklyReview.sections.projectStatusChanges} (${params.projectsWithChanges.length})\n`;
    for (const p of params.projectsWithChanges) {
      text += `  - ${p.name}: ${formatStatus(p.oldStatus)} -> ${formatStatus(p.newStatus)}: ${params.appUrl}/portfolio/projects/${p.id}\n`;
    }
    text += '\n';
  }

  if (params.tasksClosedOnProjects.length > 0) {
    text += `${strings.notifications.weeklyReview.sections.tasksCompletedOnProjects} (${params.tasksClosedOnProjects.length})\n`;
    for (const t of params.tasksClosedOnProjects) {
      text += `  - ${t.title} (${t.projectName}): ${params.appUrl}/tasks/${t.id}\n`;
    }
    text += '\n';
  }

  if (params.topTasks.length > 0) {
    text += `${strings.notifications.weeklyReview.sections.topTasks} (${params.topTasks.length})\n`;
    for (const t of params.topTasks) {
      const due = t.dueDate
        ? ` (${interpolate(strings.notifications.weeklyReview.dueLabel, { dueDate: t.dueDate })})`
        : '';
      text += `  - [${formatStatus(t.priority)}] ${t.title}${due}: ${params.appUrl}/tasks/${t.id}\n`;
    }
    text += '\n';
  }

  if (params.topProjectsAsLead.length > 0) {
    text += `${strings.notifications.weeklyReview.sections.projectsLead} (${params.topProjectsAsLead.length})\n`;
    for (const p of params.topProjectsAsLead) {
      text += `  - ${p.name} (${formatStatus(p.status)}): ${params.appUrl}/portfolio/projects/${p.id}\n`;
    }
    text += '\n';
  }

  if (params.topProjectsAsContributor.length > 0) {
    text += `${strings.notifications.weeklyReview.sections.projectsContribute} (${params.topProjectsAsContributor.length})\n`;
    for (const p of params.topProjectsAsContributor) {
      text += `  - ${p.name} (${formatStatus(p.status)}): ${params.appUrl}/portfolio/projects/${p.id}\n`;
    }
    text += '\n';
  }

  if (params.newRequests.length > 0) {
    text += `${strings.notifications.weeklyReview.sections.newRequests} (${params.newRequests.length})\n`;
    for (const r of params.newRequests) {
      text += `  - ${r.name}: ${params.appUrl}/portfolio/requests/${r.id}\n`;
    }
    text += '\n';
  }

  text += `${strings.common.buttons.goToKanap}: ${params.appUrl}\n\n`;
  text += buildManagePreferencesText(params.locale, preferencesUrl);

  return { subject, html: wrapper.html, text, attachments: wrapper.attachments };
}

// Template: Trial Activation Email
export function buildActivationEmail(params: {
  greeting: string;
  activationUrl: string;
  locale?: string;
}): EmailContent {
  const strings = getEmailStrings(params.locale);
  const subject = strings.auth.activation.subject;
  const body = `
    <p>${interpolate(strings.common.labels.greetingHelloName, { name: escapeHtml(params.greeting) })}</p>
    <p>${strings.auth.activation.intro}</p>
    <p style="text-align:center;margin:32px 0;">
      <a href="${params.activationUrl}" style="background:#2D69E0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;font-weight:600;">${escapeHtml(strings.common.buttons.activateWorkspace)}</a>
    </p>
    <p>${strings.auth.activation.copyPaste}</p>
    <p style="word-break:break-all;"><a href="${params.activationUrl}">${escapeHtml(params.activationUrl)}</a></p>
    <p>${interpolate(strings.auth.activation.expires, {})}</p>
  `;
  // Activation emails always use KANAP default branding (no tenant yet)
  const wrapper = emailWrapper(body, { locale: params.locale });
  const text = joinTextBlocks([
    interpolate(strings.common.labels.greetingHelloName, { name: params.greeting }),
    strings.auth.activation.textIntro,
    interpolate(strings.auth.activation.textAction, { url: params.activationUrl }),
    strings.auth.activation.expires,
  ]);
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
