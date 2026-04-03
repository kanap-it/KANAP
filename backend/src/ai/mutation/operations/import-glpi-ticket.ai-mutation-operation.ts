import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { htmlToMarkdown, resolveHtmlContentSource } from '../../../common/html-to-markdown';
import { normalizeMarkdownRichText } from '../../../common/markdown-rich-text';
import { TaskPriorityLevel } from '../../../tasks/task.entity';
import { TaskAttachmentsService } from '../../../tasks/task-attachments.service';
import { TasksUnifiedService } from '../../../tasks/tasks-unified.service';
import { AiPolicyService } from '../../ai-policy.service';
import { AiMutationPreview } from '../../ai-mutation-preview.entity';
import { AiExecutionContextWithManager } from '../../ai.types';
import { GlpiService } from '../../glpi/glpi.service';
import { GlpiTicket } from '../../glpi/glpi.types';
import {
  AiMutationOperation,
  AiMutationPreviewPresentation,
  AiPreparedMutationPreview,
} from '../ai-mutation-operation.types';
import {
  AiTaskCreateTarget,
  AiTaskMutationSupportService,
} from '../ai-task-mutation-support.service';

const RELATION_TYPE_VALUES = ['standalone', 'project', 'spend_item', 'capex_item'] as const;
const PRIORITY_LEVEL_VALUES = ['blocker', 'high', 'normal', 'low', 'optional'] as const;

type ImportGlpiTicketRelationType = typeof RELATION_TYPE_VALUES[number];
type ImportGlpiTicketPriorityLevel = typeof PRIORITY_LEVEL_VALUES[number];

type ImportGlpiTicketInput = {
  ticket_id: number;
  relation_type: ImportGlpiTicketRelationType;
  relation_ref?: string | null;
  assignee?: string | null;
  priority_level?: ImportGlpiTicketPriorityLevel | null;
};

type ImportedImageOccurrence = {
  raw: string;
  target: string;
  index: number;
  rewrite: (nextTarget: string | null) => string;
};

function normalizeRelationType(value: unknown): unknown {
  if (value == null) {
    return undefined;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  if (normalized === 'opex' || normalized === 'budget' || normalized === 'budget_entry' || normalized === 'budget entry') {
    return 'spend_item';
  }
  if (normalized === 'capex') {
    return 'capex_item';
  }
  return normalized;
}

function textOrNull(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
}

function toDisplayPriority(value: unknown): string | null {
  switch (String(value || '')) {
    case 'blocker':
      return 'Blocker';
    case 'high':
      return 'High';
    case 'normal':
      return 'Normal';
    case 'low':
      return 'Low';
    case 'optional':
      return 'Optional';
    default:
      return null;
  }
}

function toDisplayRelation(mutation: Record<string, unknown>): string {
  const relationType = textOrNull(mutation.relation_type) ?? 'standalone';
  const relationLabel = textOrNull(mutation.relation_label);
  if (relationType === 'standalone') {
    return 'Standalone';
  }
  return relationLabel ?? relationType;
}

function buildTarget(preview: AiMutationPreview): AiMutationPreviewPresentation['target'] {
  const current = preview.current_values ?? {};
  return {
    entity_type: 'tasks',
    entity_id: preview.target_entity_id ?? null,
    ref: typeof current.target_ref === 'string' ? current.target_ref : null,
    title: typeof current.target_title === 'string' ? current.target_title : null,
  };
}

function mapPriority(priority: number | null): ImportGlpiTicketPriorityLevel {
  switch (priority) {
    case 1:
      return 'blocker';
    case 2:
      return 'high';
    case 4:
      return 'low';
    case 5:
      return 'optional';
    case 3:
    default:
      return 'normal';
  }
}

function mapGlpiTaskTypeName(type: number | null): string | null {
  switch (type) {
    case 1:
      return 'Incident';
    case 2:
      return 'Task';
    default:
      return null;
  }
}

function decodeHtmlAttribute(value: string): string {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, '\'')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function extractImageTargets(html: string | null): string[] {
  if (!html) {
    return [];
  }

  const seen = new Set<string>();
  const results: string[] = [];
  const regex = /<img\b[^>]*\bsrc\s*=\s*(['"])(.*?)\1[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const rawTarget = decodeHtmlAttribute(String(match[2] || '').trim());
    if (!rawTarget || seen.has(rawTarget)) {
      continue;
    }
    seen.add(rawTarget);
    results.push(rawTarget);
  }
  return results;
}

function buildSourceFooter(ticket: GlpiTicket): string {
  const lines = [
    '---',
    `Source: GLPI Ticket #${ticket.id}`,
    `GLPI URL: ${ticket.glpi_url}`,
    ticket.status ? `Status: ${ticket.status}` : null,
    ticket.priority != null ? `Priority: ${ticket.priority}` : null,
    ticket.urgency ? `Urgency: ${ticket.urgency}` : null,
    ticket.type != null ? `Type: ${ticket.type}` : null,
  ].filter((line): line is string => !!line);

  return lines.join('\n');
}

function buildDescription(ticket: GlpiTicket, contentHtml: string | null): string {
  const converted = htmlToMarkdown(contentHtml || '');
  const sections = [textOrNull(converted), buildSourceFooter(ticket)].filter((part): part is string => !!part);
  return sections.join('\n\n');
}

function buildMulterFile(document: { buffer: Buffer; mimeType: string; filename: string }): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: document.filename,
    encoding: '7bit',
    mimetype: document.mimeType,
    size: document.buffer.length,
    buffer: document.buffer,
    destination: '',
    filename: document.filename,
    path: '',
    stream: undefined as any,
  };
}

function registerReplacementKeys(
  replacements: Map<string, string>,
  baseUrl: string,
  rawTarget: string,
  inlineUrl: string,
): void {
  const decoded = decodeHtmlAttribute(rawTarget.trim());
  for (const candidate of [rawTarget.trim(), decoded]) {
    if (candidate) {
      replacements.set(candidate, inlineUrl);
    }
  }

  try {
    replacements.set(new URL(decoded, baseUrl).toString(), inlineUrl);
  } catch {
    // Keep the raw forms only when URL resolution fails.
  }
}

function findImageOccurrences(markdown: string): ImportedImageOccurrence[] {
  const text = String(markdown || '');
  const occurrences: ImportedImageOccurrence[] = [];

  const markdownImageRegex = /!\[[^\]]*]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
  let markdownMatch: RegExpExecArray | null;
  while ((markdownMatch = markdownImageRegex.exec(text)) !== null) {
    const raw = String(markdownMatch[0] || '');
    const target = String(markdownMatch[1] || '').trim();
    const index = Number(markdownMatch.index || 0);
    if (!raw || !target) continue;
    occurrences.push({
      raw,
      target,
      index,
      rewrite: (nextTarget) => (nextTarget ? raw.replace(target, nextTarget) : ''),
    });
  }

  const htmlImageRegex = /<img\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1[^>]*>/gi;
  let htmlMatch: RegExpExecArray | null;
  while ((htmlMatch = htmlImageRegex.exec(text)) !== null) {
    const raw = String(htmlMatch[0] || '');
    const target = String(htmlMatch[2] || '').trim();
    const index = Number(htmlMatch.index || 0);
    if (!raw || !target) continue;
    occurrences.push({
      raw,
      target,
      index,
      rewrite: (nextTarget) => (nextTarget ? buildMarkdownImage(raw, nextTarget) : ''),
    });
  }

  return occurrences.sort((a, b) => a.index - b.index);
}

function applyReplacements(
  content: string,
  replacements: Array<{ raw: string; replacement: string }>,
): string {
  if (replacements.length === 0) {
    return String(content || '');
  }

  let cursor = 0;
  let output = '';
  const text = String(content || '');

  for (const entry of replacements) {
    const nextIndex = text.indexOf(entry.raw, cursor);
    if (nextIndex < 0) {
      throw new BadRequestException('Failed to rewrite GLPI inline image references.');
    }
    output += text.slice(cursor, nextIndex);
    output += entry.replacement;
    cursor = nextIndex + entry.raw.length;
  }

  output += text.slice(cursor);
  return output;
}

function readHtmlAttribute(rawHtml: string, attributeName: string): string | null {
  const pattern = new RegExp(`\\b${attributeName}\\s*=\\s*([\"'])(.*?)\\1`, 'i');
  const match = rawHtml.match(pattern);
  return match?.[2] ? String(match[2]) : null;
}

function escapeMarkdownImageText(value: string): string {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function buildMarkdownImage(rawHtml: string, target: string): string {
  const alt = escapeMarkdownImageText(readHtmlAttribute(rawHtml, 'alt') || '');
  const title = readHtmlAttribute(rawHtml, 'title');
  const encodedTitle = title ? ` "${String(title).replace(/"/g, '\\"')}"` : '';
  return `![${alt}](${target}${encodedTitle})`;
}

function rewriteMarkdownImageTargets(
  markdown: string,
  replacements: Map<string, string>,
): string {
  const applied = findImageOccurrences(markdown)
    .map((occurrence) => {
      const replacement = replacements.get(occurrence.target);
      if (!replacement) {
        return null;
      }
      return {
        raw: occurrence.raw,
        replacement: occurrence.rewrite(replacement),
      };
    })
    .filter((entry): entry is { raw: string; replacement: string } => !!entry);

  return applyReplacements(markdown, applied);
}

const ImportGlpiTicketInputSchema = z.object({
  ticket_id: z.number().int().positive()
    .describe('GLPI ticket numeric identifier.'),
  relation_type: z.preprocess(
    normalizeRelationType,
    z.enum(RELATION_TYPE_VALUES).optional(),
  ).describe('Optional relation type. Use `project`, `spend_item`, `capex_item`, or `standalone`. Omit this to create a standalone task.'),
  relation_ref: z.union([z.string(), z.null()]).optional()
    .describe('Optional relation target reference. Required when relation_type is not standalone.'),
  assignee: z.union([z.string(), z.null()]).optional()
    .describe('Optional assignee email, full name, or unique user label in the current tenant.'),
  priority_level: z.union([z.enum(PRIORITY_LEVEL_VALUES), z.null()]).optional()
    .describe('Optional task priority override. Defaults to the GLPI priority mapping.'),
  priority: z.union([z.enum(PRIORITY_LEVEL_VALUES), z.null()]).optional()
    .describe('Alias for priority_level. Optional task priority override.'),
}).superRefine((value, ctx) => {
  const relationType = value.relation_type ?? 'standalone';
  const relationRef = textOrNull(value.relation_ref);
  if (relationType !== 'standalone' && !relationRef) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'relation_ref is required when relation_type is not standalone.',
      path: ['relation_ref'],
    });
  }
  if (relationType === 'standalone' && relationRef) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'relation_ref must be omitted when relation_type is standalone.',
      path: ['relation_ref'],
    });
  }
  if (
    value.priority_level != null
    && value.priority != null
    && value.priority_level !== value.priority
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`priority_level` and `priority` must match when both are provided.',
      path: ['priority'],
    });
  }
}).transform((value): ImportGlpiTicketInput => ({
  ticket_id: value.ticket_id,
  relation_type: value.relation_type ?? 'standalone',
  relation_ref: textOrNull(value.relation_ref),
  assignee: textOrNull(value.assignee),
  priority_level: value.priority_level ?? value.priority ?? null,
}));

@Injectable()
export class ImportGlpiTicketAiMutationOperation implements AiMutationOperation<ImportGlpiTicketInput> {
  readonly toolName = 'import_glpi_ticket' as const;
  readonly description = 'Create a preview to import one GLPI ticket into one KANAP task. Requires explicit user approval before execution.';
  readonly inputSchema = ImportGlpiTicketInputSchema;
  readonly inputSummary = {
    ticket_id: 'GLPI ticket numeric identifier.',
    relation_type: 'Optional relation type: project, spend_item, capex_item, or standalone.',
    relation_ref: 'Optional relation target reference. Required when relation_type is project, spend_item, or capex_item.',
    assignee: 'Optional assignee email, full name, or unique user label in the current tenant.',
    priority_level: 'Optional task priority override. Defaults to the GLPI priority mapping.',
    priority: 'Alias for priority_level.',
  };
  readonly businessResource = 'tasks';
  readonly writePreview = {
    entity_type: 'tasks',
    fields: ['relation', 'title', 'description', 'assignee', 'priority_level', 'task_type', 'source'],
    reversible: false,
    prompt_hint: 'For GLPI escalation, use `import_glpi_ticket` with the numeric GLPI ticket id. The task requestor is always the current Plaid user.',
  };

  constructor(
    private readonly support: AiTaskMutationSupportService,
    private readonly tasks: TasksUnifiedService,
    private readonly attachments: TaskAttachmentsService,
    private readonly glpi: GlpiService,
    private readonly policy: AiPolicyService,
  ) {}

  private async assertRelationAccess(
    context: AiExecutionContextWithManager,
    relation: AiTaskCreateTarget,
  ): Promise<void> {
    if (relation.mode === 'project') {
      await this.policy.assertBusinessPermission(context, 'portfolio_projects', 'contributor', context.manager);
    }
  }

  private async resolveMappedTaskType(
    context: AiExecutionContextWithManager,
    ticketType: number | null,
  ) {
    const mappedName = mapGlpiTaskTypeName(ticketType);
    if (!mappedName) {
      return null;
    }

    try {
      return await this.support.resolveTaskType(context, mappedName);
    } catch {
      return null;
    }
  }

  private async loadCurrentTenantSlug(context: AiExecutionContextWithManager): Promise<string> {
    const rows = await context.manager.query<Array<{ slug: string | null }>>(
      `SELECT slug
       FROM tenants
       WHERE id = $1
       LIMIT 1`,
      [context.tenantId],
    );
    const slug = textOrNull(rows[0]?.slug);
    return slug || context.tenantId;
  }

  async prepareCreatePreview(
    context: AiExecutionContextWithManager,
    input: ImportGlpiTicketInput,
  ): Promise<AiPreparedMutationPreview> {
    const requestor = await this.support.resolveCurrentUser(context);
    const relation = await this.support.resolveCreateTarget(context, input.relation_type, input.relation_ref);
    await this.assertRelationAccess(context, relation);

    const assignee = input.assignee
      ? await this.support.resolveUserReference(context, input.assignee)
      : null;

    let session = null;
    try {
      session = await this.glpi.initSession(context.tenantId, context.manager);
      const ticket = await this.glpi.getTicket(session, input.ticket_id);
      const normalizedContentHtml = textOrNull(resolveHtmlContentSource(ticket.content_html || ''));
      const description = normalizeMarkdownRichText(buildDescription(ticket, normalizedContentHtml), { fieldName: 'description' });
      const taskType = await this.resolveMappedTaskType(context, ticket.type);
      const imageTargets = extractImageTargets(normalizedContentHtml);
      const title = textOrNull(ticket.name) || `GLPI Ticket #${ticket.id}`;

      return {
        targetEntityType: 'tasks',
        targetEntityId: null,
        mutationInput: {
          relation_type: relation.mode,
          relation_id: relation.id,
          relation_ref: relation.ref,
          relation_label: relation.label,
          title,
          description,
          requestor_user_id: requestor.id,
          requestor_label: requestor.label,
          assignee_user_id: assignee?.id ?? null,
          assignee_label: assignee?.label ?? null,
          assignee_email: assignee?.email ?? null,
          priority_level: input.priority_level ?? mapPriority(ticket.priority),
          task_type_id: taskType?.id ?? null,
          task_type_label: taskType?.label ?? null,
          glpi_ticket_id: ticket.id,
          glpi_source_url: ticket.glpi_url,
          glpi_image_targets: imageTargets,
          status: 'open',
        },
        currentValues: {
          target_ref: null,
          target_title: title,
          glpi_ticket_id: ticket.id,
          glpi_source_url: ticket.glpi_url,
          glpi_image_total_count: imageTargets.length,
        },
      };
    } finally {
      if (session) {
        await this.glpi.killSession(session);
      }
    }
  }

  presentPreview(preview: AiMutationPreview): AiMutationPreviewPresentation {
    const current = preview.current_values ?? {};
    const mutation = preview.mutation_input ?? {};
    const ref = textOrNull(current.target_ref);
    const title = textOrNull(current.target_title) ?? textOrNull(mutation.title) ?? 'Untitled task';
    const assigneeLabel = textOrNull(mutation.assignee_label);
    const priorityLabel = toDisplayPriority(mutation.priority_level) ?? 'Normal';
    const glpiTicketId = textOrNull(current.glpi_ticket_id) ?? textOrNull(mutation.glpi_ticket_id) ?? 'unknown';
    const imageTotalCount = Number(current.glpi_image_total_count ?? (Array.isArray(mutation.glpi_image_targets) ? mutation.glpi_image_targets.length : 0));
    const imageImportedCount = Number(current.glpi_image_imported_count ?? 0);
    const warningCount = Array.isArray(current.glpi_image_warnings) ? current.glpi_image_warnings.length : 0;

    let summary = `Preview ${preview.id} ${preview.status}.`;
    switch (preview.status) {
      case 'pending':
        summary = mutation.relation_type === 'standalone'
          ? `Import GLPI ticket #${glpiTicketId} as a standalone task "${title}".`
          : `Import GLPI ticket #${glpiTicketId} as task "${title}" on ${toDisplayRelation(mutation)}.`;
        if (assigneeLabel) {
          summary += ` Assignee: ${assigneeLabel}.`;
        }
        summary += ` Priority: ${priorityLabel}.`;
        if (imageTotalCount > 0) {
          summary += ` ${imageTotalCount} inline image${imageTotalCount === 1 ? '' : 's'} queued for import.`;
        }
        break;
      case 'executed':
        summary = ref
          ? `Created ${ref} from GLPI ticket #${glpiTicketId}.`
          : `Created task "${title}" from GLPI ticket #${glpiTicketId}.`;
        if (imageTotalCount > 0) {
          summary += ` Imported ${imageImportedCount} of ${imageTotalCount} inline image${imageTotalCount === 1 ? '' : 's'}.`;
        }
        if (warningCount > 0) {
          summary += ` ${warningCount} warning${warningCount === 1 ? '' : 's'} recorded during image import.`;
        }
        break;
      case 'rejected':
        summary = `GLPI import preview for ticket #${glpiTicketId} was rejected.`;
        break;
      case 'expired':
        summary = `GLPI import preview for ticket #${glpiTicketId} expired before approval.`;
        break;
      case 'failed':
        summary = preview.error_message || `GLPI import for ticket #${glpiTicketId} failed.`;
        break;
    }

    return {
      target: buildTarget(preview),
      changes: {
        relation: {
          label: 'Relation',
          from: null,
          to: toDisplayRelation(mutation),
          format: 'text',
        },
        title: {
          label: 'Title',
          from: null,
          to: textOrNull(mutation.title),
          format: 'text',
        },
        requestor: {
          label: 'Requestor',
          from: null,
          to: textOrNull(mutation.requestor_label),
          format: 'text',
        },
        assignee: {
          label: 'Assignee',
          from: null,
          to: assigneeLabel,
          format: 'text',
        },
        priority: {
          label: 'Priority',
          from: null,
          to: priorityLabel,
          format: 'text',
        },
        task_type: {
          label: 'Task Type',
          from: null,
          to: textOrNull(mutation.task_type_label),
          format: 'text',
        },
        source: {
          label: 'Source',
          from: null,
          to: textOrNull(mutation.glpi_source_url)
            ? `GLPI Ticket #${glpiTicketId} (${textOrNull(mutation.glpi_source_url)})`
            : `GLPI Ticket #${glpiTicketId}`,
          format: 'text',
        },
        inline_images: {
          label: 'Inline Images',
          from: null,
          to: imageTotalCount > 0 ? `${imageTotalCount} queued for import` : 'None',
          format: 'text',
        },
        description: {
          label: 'Description',
          from: null,
          to: textOrNull(mutation.description),
          format: 'markdown',
        },
      },
      summary,
    };
  }

  async executePreview(
    context: AiExecutionContextWithManager,
    preview: AiMutationPreview,
  ): Promise<void> {
    const mutation = preview.mutation_input ?? {};
    const relation = await this.support.resolveStoredCreateTarget(
      context,
      (mutation.relation_type as ImportGlpiTicketRelationType | undefined) ?? 'standalone',
      (mutation.relation_id as string | null | undefined) ?? null,
    );
    await this.assertRelationAccess(context, relation);

    const created = await this.tasks.createForTarget(
      {
        type: relation.type,
        id: relation.id,
        payload: {
          title: textOrNull(mutation.title),
          description: textOrNull(mutation.description),
          status: 'open',
          assignee_user_id: (mutation.assignee_user_id as string | null | undefined) ?? null,
          priority_level: (mutation.priority_level as TaskPriorityLevel | undefined) ?? 'normal',
          task_type_id: (mutation.task_type_id as string | null | undefined) ?? null,
          creator_id: context.userId,
        },
      },
      context.userId,
      {
        manager: context.manager,
        tenantId: context.tenantId,
        audit: {
          source: 'ai_chat',
          sourceRef: preview.conversation_id ?? null,
        },
      },
    );

    const rawImageTargets = Array.isArray(mutation.glpi_image_targets)
      ? mutation.glpi_image_targets.map((target) => String(target || '').trim()).filter(Boolean)
      : [];
    const warnings: string[] = [];
    let importedImageCount = 0;

    if (rawImageTargets.length > 0) {
      try {
        const tenantSlug = await this.loadCurrentTenantSlug(context);
        const replacements = new Map<string, string>();
        const uniqueTargets = [...new Set(rawImageTargets)];
        let session = null;

        try {
          session = await this.glpi.initSession(context.tenantId, context.manager);
          for (const rawTarget of uniqueTargets) {
            try {
              const document = await this.glpi.fetchDocument(session, rawTarget);
              const attachment = await this.attachments.uploadAttachment(
                created.id,
                buildMulterFile(document),
                context.userId,
                {
                  manager: context.manager,
                  sourceField: 'description',
                },
              );
              const inlineUrl = `/api/tasks/attachments/${tenantSlug}/${attachment.id}/inline`;
              registerReplacementKeys(replacements, session.baseUrl, rawTarget, inlineUrl);
              importedImageCount += 1;
            } catch (error: any) {
              warnings.push(
                `Skipped GLPI image ${rawTarget}: ${String(error?.message || error || 'unknown error')}`,
              );
            }
          }
        } finally {
          if (session) {
            await this.glpi.killSession(session);
          }
        }

        if (replacements.size > 0) {
          try {
            const rewrittenDescription = rewriteMarkdownImageTargets(
              created.description || textOrNull(mutation.description) || '',
              replacements,
            );
            if (rewrittenDescription !== (created.description || '')) {
              await this.tasks.updateById(
                created.id,
                { description: rewrittenDescription },
                context.userId,
                {
                  manager: context.manager,
                  tenantId: context.tenantId,
                  audit: {
                    source: 'ai_chat',
                    sourceRef: preview.conversation_id ?? null,
                  },
                },
              );
            }
          } catch (error: any) {
            warnings.push(
              `Failed to rewrite imported GLPI images in the task description: ${String(error?.message || error || 'unknown error')}`,
            );
          }
        }
      } catch (error: any) {
        warnings.push(
          `GLPI inline image import did not complete: ${String(error?.message || error || 'unknown error')}`,
        );
      }
    }

    preview.target_entity_id = created.id;
    preview.current_values = {
      ...(preview.current_values ?? {}),
      target_ref: created.item_number ? `T-${created.item_number}` : null,
      target_title: created.title ?? textOrNull(mutation.title),
      glpi_image_total_count: rawImageTargets.length,
      glpi_image_imported_count: importedImageCount,
      glpi_image_warnings: warnings,
    };
  }
}
