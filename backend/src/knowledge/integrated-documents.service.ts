import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { marked } from 'marked';
import { EntityManager, Repository } from 'typeorm';
import { extractInlineImageUrls } from '../common/content-image-urls';
import { containsInlineDataImage, htmlToMarkdown, isHtmlContent } from '../common/html-to-markdown';
import { normalizeMarkdownRichText } from '../common/markdown-rich-text';
import { PermissionsService, PermissionLevel } from '../permissions/permissions.service';
import { PortfolioActivity } from '../portfolio/portfolio-activity.entity';
import { Document } from './document.entity';
import { DocumentAttachment } from './document-attachment.entity';
import { IntegratedDocumentBinding } from './integrated-document-binding.entity';
import {
  INTEGRATED_DOCUMENT_SLOT_DEFINITIONS,
  IntegratedDocumentSlotKey,
} from './integrated-document.constants';
import { KnowledgeService, RelationEntityType } from './knowledge.service';

type SourceScopedEntityType = 'requests' | 'projects';
type SourceAccessMode = 'read' | 'edit';
type SourceDescriptor = {
  id: string;
  tenant_id: string;
  item_number: number | null;
  name: string;
};
type ManagedWriteResult = {
  documentId: string;
  changed: boolean;
  created: boolean;
};
type RecoveredSlotSource = 'legacy' | 'audit';
type RecoveredSlotContent = {
  content: string | null;
  source: RecoveredSlotSource;
  unresolvedLegacyInlineAttachmentIds: string[];
};
type SourceRecoveryContext = {
  source: SourceDescriptor;
  ownerUserId: string | null;
  tenantSlug: string;
};
export type RepairSourceSlotResult = {
  slotKey: IntegratedDocumentSlotKey;
  documentId: string;
  created: boolean;
  repairedRelation: boolean;
  recoveredFrom: RecoveredSlotSource | null;
  unresolvedLegacyInlineAttachmentIds: string[];
};
export type RepairSourceEntityResult = {
  sourceEntityType: SourceScopedEntityType;
  sourceEntityId: string;
  slots: RepairSourceSlotResult[];
};
type SlotSettingRecord = {
  source_entity_type: SourceScopedEntityType;
  slot_key: IntegratedDocumentSlotKey;
  display_name: string;
  folder_id: string;
  library_id: string;
  document_type_id: string;
  template_document_id: string | null;
  template_content_markdown: string | null;
};
type RequestBackfillRow = SourceDescriptor & {
  purpose: string | null;
  risks: string | null;
  created_by_id: string | null;
  requestor_id: string | null;
  it_lead_id: string | null;
  business_lead_id: string | null;
};
type ProjectBackfillRow = SourceDescriptor & {
  purpose: string | null;
  it_lead_id: string | null;
  business_lead_id: string | null;
};
type LegacyAttachmentRow = {
  id: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string | null;
  size: number;
  storage_path: string;
  source_field: string | null;
};
type ManagedAttachmentRow = {
  id: string;
  original_filename: string;
  mime_type: string | null;
  size: number;
  storage_path: string;
  source_field: string | null;
};
type MarkdownToken = {
  type?: string;
  raw?: string;
  text?: string;
  [key: string]: unknown;
};
type InlineImageOccurrence = {
  raw: string;
  target: string;
  rewrite: (nextTarget: string) => string;
};
type RecoverableInlineImageOccurrence =
  | (InlineImageOccurrence & {
    kind: 'data';
    mimeType: string;
    buffer: Buffer;
    extension: string;
  })
  | (InlineImageOccurrence & {
    kind: 'legacy';
    attachmentId: string;
  });
type RecoverableInlineImageAssignment =
  | {
    kind: 'data';
    attachmentId: string;
    mimeType: string;
    size: number;
  }
  | {
    kind: 'legacy';
    attachmentId: string;
    sourceAttachmentId: string;
  };

const PERMISSION_RANK: Record<PermissionLevel, number> = {
  reader: 1,
  contributor: 2,
  member: 3,
  admin: 4,
};

const SOURCE_ENTITY_CONFIG: Record<
  SourceScopedEntityType,
  {
    sourceTable: 'portfolio_requests' | 'portfolio_projects';
    relationTable: 'document_requests' | 'document_projects';
    relationIdColumn: 'request_id' | 'project_id';
    permissionResource: 'portfolio_requests' | 'portfolio_projects';
    referencePrefix: 'REQ' | 'PRJ';
    readLevel: PermissionLevel;
    editLevel: PermissionLevel;
  }
> = {
  requests: {
    sourceTable: 'portfolio_requests',
    relationTable: 'document_requests',
    relationIdColumn: 'request_id',
    permissionResource: 'portfolio_requests',
    referencePrefix: 'REQ',
    readLevel: 'reader',
    editLevel: 'member',
  },
  projects: {
    sourceTable: 'portfolio_projects',
    relationTable: 'document_projects',
    relationIdColumn: 'project_id',
    permissionResource: 'portfolio_projects',
    referencePrefix: 'PRJ',
    readLevel: 'reader',
    editLevel: 'contributor',
  },
};

const SUPPORTED_SLOT_KEYS = INTEGRATED_DOCUMENT_SLOT_DEFINITIONS.reduce<Record<SourceScopedEntityType, Set<string>>>(
  (acc, definition) => {
    if (definition.sourceEntityType === 'requests' || definition.sourceEntityType === 'projects') {
      acc[definition.sourceEntityType].add(definition.slotKey);
    }
    return acc;
  },
  {
    requests: new Set<string>(),
    projects: new Set<string>(),
  },
);

@Injectable()
export class IntegratedDocumentsService {
  private readonly legacyColumnExistsCache = new Map<string, boolean>();

  constructor(
    @InjectRepository(IntegratedDocumentBinding)
    private readonly bindingsRepo: Repository<IntegratedDocumentBinding>,
    private readonly knowledge: KnowledgeService,
    private readonly permissions: PermissionsService,
  ) {}

  private getManager(opts?: { manager?: EntityManager }): EntityManager {
    return opts?.manager ?? this.bindingsRepo.manager;
  }

  private normalizeUserId(userId: string | null | undefined): string {
    const normalized = String(userId || '').trim();
    if (!normalized) {
      throw new ForbiddenException('Authenticated user is required');
    }
    return normalized;
  }

  private assertSupportedSlot(sourceEntityType: SourceScopedEntityType, slotKey: string): asserts slotKey is IntegratedDocumentSlotKey {
    if (!SUPPORTED_SLOT_KEYS[sourceEntityType]?.has(slotKey)) {
      throw new BadRequestException(`Unsupported integrated document slot: ${slotKey}`);
    }
  }

  private getSlotDefinition(
    sourceEntityType: SourceScopedEntityType,
    slotKey: IntegratedDocumentSlotKey,
  ) {
    const definition = INTEGRATED_DOCUMENT_SLOT_DEFINITIONS.find(
      (entry) => entry.sourceEntityType === sourceEntityType && entry.slotKey === slotKey,
    );
    if (!definition) {
      throw new BadRequestException(`Unsupported integrated document slot: ${sourceEntityType}:${slotKey}`);
    }
    return definition;
  }

  private getSlotDefinitionsForSource(sourceEntityType: SourceScopedEntityType) {
    return INTEGRATED_DOCUMENT_SLOT_DEFINITIONS.filter(
      (entry) => entry.sourceEntityType === sourceEntityType,
    );
  }

  private formatManagedTitle(
    sourceEntityType: SourceScopedEntityType,
    source: SourceDescriptor,
    slotKey: IntegratedDocumentSlotKey,
  ): string {
    const definition = this.getSlotDefinition(sourceEntityType, slotKey);
    const prefix = SOURCE_ENTITY_CONFIG[sourceEntityType].referencePrefix;
    const ref = source.item_number ? `${prefix}-${source.item_number}` : source.id;
    return `${ref} - ${source.name} - ${definition.displayName}`;
  }

  private getSemanticUpdateLabel(
    sourceEntityType: SourceScopedEntityType,
    slotKey: IntegratedDocumentSlotKey,
  ): string {
    return `${this.getSlotDefinition(sourceEntityType, slotKey).displayName} updated`;
  }

  private getImportChangeNote(sourceEntityType: SourceScopedEntityType): string {
    return sourceEntityType === 'requests'
      ? 'Imported from legacy request field'
      : 'Imported from legacy project field';
  }

  private getLegacySourceField(
    sourceEntityType: SourceScopedEntityType,
    slotKey: IntegratedDocumentSlotKey,
  ): 'purpose' | 'risks' {
    if (slotKey === 'purpose') {
      return 'purpose';
    }
    if (sourceEntityType === 'requests' && slotKey === 'risks_mitigations') {
      return 'risks';
    }
    throw new BadRequestException(`Legacy source field not defined for ${sourceEntityType}:${slotKey}`);
  }

  private getLegacyAttachmentTable(sourceEntityType: SourceScopedEntityType): {
    tableName: 'portfolio_request_attachments' | 'portfolio_project_attachments';
    relationIdColumn: 'request_id' | 'project_id';
    routePrefix: '/portfolio/requests/inline/' | '/portfolio/projects/inline/';
  } {
    if (sourceEntityType === 'requests') {
      return {
        tableName: 'portfolio_request_attachments',
        relationIdColumn: 'request_id',
        routePrefix: '/portfolio/requests/inline/',
      };
    }
    return {
      tableName: 'portfolio_project_attachments',
      relationIdColumn: 'project_id',
      routePrefix: '/portfolio/projects/inline/',
    };
  }

  private normalizeOptionalUserId(value: string | null | undefined): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private firstNonEmpty(values: Array<string | null | undefined>): string | null {
    for (const value of values) {
      const normalized = this.normalizeOptionalUserId(value);
      if (normalized) {
        return normalized;
      }
    }
    return null;
  }

  private resolvePreferredOwnerUserId(
    sourceEntityType: SourceScopedEntityType,
    row: RequestBackfillRow | ProjectBackfillRow,
  ): string | null {
    if (sourceEntityType === 'requests') {
      const requestRow = row as RequestBackfillRow;
      return this.firstNonEmpty([
        requestRow.created_by_id,
        requestRow.requestor_id,
        requestRow.it_lead_id,
        requestRow.business_lead_id,
      ]);
    }

    const projectRow = row as ProjectBackfillRow;
    return this.firstNonEmpty([
      projectRow.it_lead_id,
      projectRow.business_lead_id,
    ]);
  }

  private async loadPreferredOwnerUserId(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    manager: EntityManager,
  ): Promise<string | null> {
    if (sourceEntityType === 'requests') {
      const rows = await manager.query<Array<{
        created_by_id: string | null;
        requestor_id: string | null;
        it_lead_id: string | null;
        business_lead_id: string | null;
      }>>(
        `SELECT created_by_id,
                requestor_id,
                it_lead_id,
                business_lead_id
         FROM portfolio_requests
         WHERE id = $1
           AND tenant_id = app_current_tenant()
         LIMIT 1`,
        [sourceEntityId],
      );
      if (!rows.length) {
        return null;
      }
      return this.resolvePreferredOwnerUserId(sourceEntityType, {
        id: sourceEntityId,
        tenant_id: '',
        item_number: null,
        name: '',
        purpose: null,
        risks: null,
        created_by_id: rows[0].created_by_id,
        requestor_id: rows[0].requestor_id,
        it_lead_id: rows[0].it_lead_id,
        business_lead_id: rows[0].business_lead_id,
      });
    }

    const rows = await manager.query<Array<{
      it_lead_id: string | null;
      business_lead_id: string | null;
    }>>(
      `SELECT it_lead_id,
              business_lead_id
       FROM portfolio_projects
       WHERE id = $1
         AND tenant_id = app_current_tenant()
       LIMIT 1`,
      [sourceEntityId],
    );
    if (!rows.length) {
      return null;
    }
    return this.resolvePreferredOwnerUserId(sourceEntityType, {
      id: sourceEntityId,
      tenant_id: '',
      item_number: null,
      name: '',
      purpose: null,
      it_lead_id: rows[0].it_lead_id,
      business_lead_id: rows[0].business_lead_id,
    });
  }

  private async loadSourceRecoveryContext(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    manager: EntityManager,
  ): Promise<SourceRecoveryContext> {
    if (sourceEntityType === 'requests') {
      const rows = await manager.query<Array<{
        id: string;
        tenant_id: string;
        item_number: number | null;
        name: string;
        created_by_id: string | null;
        requestor_id: string | null;
        it_lead_id: string | null;
        business_lead_id: string | null;
      }>>(
        `SELECT id::text AS id,
                tenant_id::text AS tenant_id,
                item_number,
                name,
                created_by_id::text,
                requestor_id::text,
                it_lead_id::text,
                business_lead_id::text
         FROM portfolio_requests
         WHERE id = $1
           AND tenant_id = app_current_tenant()
         LIMIT 1`,
        [sourceEntityId],
      );
      if (!rows.length) {
        throw new NotFoundException('request not found');
      }

      const row = rows[0];
      return {
        source: {
          id: row.id,
          tenant_id: row.tenant_id,
          item_number: row.item_number,
          name: row.name,
        },
        ownerUserId: this.resolvePreferredOwnerUserId('requests', {
          id: row.id,
          tenant_id: row.tenant_id,
          item_number: row.item_number,
          name: row.name,
          purpose: null,
          risks: null,
          created_by_id: row.created_by_id,
          requestor_id: row.requestor_id,
          it_lead_id: row.it_lead_id,
          business_lead_id: row.business_lead_id,
        }),
        tenantSlug: await this.loadTenantSlug(row.tenant_id, manager),
      };
    }

    const rows = await manager.query<Array<{
      id: string;
      tenant_id: string;
      item_number: number | null;
      name: string;
      it_lead_id: string | null;
      business_lead_id: string | null;
    }>>(
      `SELECT id::text AS id,
              tenant_id::text AS tenant_id,
              item_number,
              name,
              it_lead_id::text,
              business_lead_id::text
       FROM portfolio_projects
       WHERE id = $1
         AND tenant_id = app_current_tenant()
       LIMIT 1`,
      [sourceEntityId],
    );
    if (!rows.length) {
      throw new NotFoundException('project not found');
    }

    const row = rows[0];
    return {
      source: {
        id: row.id,
        tenant_id: row.tenant_id,
        item_number: row.item_number,
        name: row.name,
      },
      ownerUserId: this.resolvePreferredOwnerUserId('projects', {
        id: row.id,
        tenant_id: row.tenant_id,
        item_number: row.item_number,
        name: row.name,
        purpose: null,
        it_lead_id: row.it_lead_id,
        business_lead_id: row.business_lead_id,
      }),
      tenantSlug: await this.loadTenantSlug(row.tenant_id, manager),
    };
  }

  private async loadTenantSlug(tenantId: string, manager: EntityManager): Promise<string> {
    const rows = await manager.query<Array<{ slug: string | null }>>(
      `SELECT slug
       FROM tenants
       WHERE id = $1
       LIMIT 1`,
      [tenantId],
    );
    const tenantSlug = String(rows[0]?.slug || '').trim();
    return tenantSlug || tenantId;
  }

  private async legacyColumnExists(
    sourceEntityType: SourceScopedEntityType,
    slotKey: IntegratedDocumentSlotKey,
    manager: EntityManager,
  ): Promise<boolean> {
    const legacySourceField = this.getLegacySourceField(sourceEntityType, slotKey);
    const tableName = SOURCE_ENTITY_CONFIG[sourceEntityType].sourceTable;
    const cacheKey = `${tableName}:${legacySourceField}`;
    const cached = this.legacyColumnExistsCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const rows = await manager.query<Array<{ present: number }>>(
      `SELECT 1 AS present
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
       LIMIT 1`,
      [tableName, legacySourceField],
    );
    const exists = rows.length > 0;
    this.legacyColumnExistsCache.set(cacheKey, exists);
    return exists;
  }

  private async loadLatestAuditFieldValue(
    tableName: 'portfolio_requests' | 'portfolio_projects',
    recordId: string,
    fieldName: 'purpose' | 'risks',
    manager: EntityManager,
  ): Promise<string | null | undefined> {
    const rows = await manager.query<Array<{ field_value: string | null }>>(
      `SELECT after_json ->> $1 AS field_value
       FROM audit_log
       WHERE tenant_id = app_current_tenant()
         AND table_name = $2
         AND record_id = $3
         AND after_json ? $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [fieldName, tableName, recordId],
    );
    if (!rows.length) {
      return undefined;
    }
    return rows[0].field_value ?? null;
  }

  private async loadRecoveredSlotContent(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: IntegratedDocumentSlotKey,
    manager: EntityManager,
  ): Promise<RecoveredSlotContent> {
    const legacySourceField = this.getLegacySourceField(sourceEntityType, slotKey);
    if (await this.legacyColumnExists(sourceEntityType, slotKey, manager)) {
      const rows = await manager.query<Array<{ content: string | null }>>(
        `SELECT ${legacySourceField} AS content
         FROM ${SOURCE_ENTITY_CONFIG[sourceEntityType].sourceTable}
         WHERE id = $1
           AND tenant_id = app_current_tenant()
         LIMIT 1`,
        [sourceEntityId],
      );
      if (!rows.length) {
        throw new NotFoundException(`${sourceEntityType.slice(0, -1)} not found`);
      }
      const content = this.prepareRecoveredContent(rows[0].content ?? null);
      return {
        content,
        source: 'legacy',
        unresolvedLegacyInlineAttachmentIds: [],
      };
    }

    const auditContent = await this.loadLatestAuditFieldValue(
      SOURCE_ENTITY_CONFIG[sourceEntityType].sourceTable,
      sourceEntityId,
      legacySourceField,
      manager,
    );
    if (auditContent === undefined) {
      throw new NotFoundException(
        `Integrated document missing and no recovery source is available for ${sourceEntityType}:${slotKey}`,
      );
    }
    const content = this.prepareRecoveredContent(auditContent);
    return {
      content,
      source: 'audit',
      unresolvedLegacyInlineAttachmentIds: this.extractAnyLegacyInlineAttachmentIds(content || ''),
    };
  }

  private prepareRecoveredContent(content: string | null | undefined): string | null {
    if (content == null) {
      return null;
    }
    const normalized = String(content);
    if (!normalized.trim()) {
      return '';
    }
    if (isHtmlContent(normalized)) {
      return htmlToMarkdown(normalized);
    }
    return normalized;
  }

  private parseMarkdownTokens(content: string): MarkdownToken[] | null {
    try {
      return marked.lexer(content, { gfm: true, breaks: true }) as MarkdownToken[];
    } catch {
      return null;
    }
  }

  private walkMarkdownToken(value: unknown, visit: (token: MarkdownToken) => void): void {
    if (!value || typeof value !== 'object') return;
    const token = value as MarkdownToken;
    if (typeof token.type !== 'string') return;

    visit(token);

    if (token.type === 'code' || token.type === 'codespan') {
      return;
    }

    for (const nested of Object.values(token)) {
      if (Array.isArray(nested)) {
        for (const child of nested) {
          this.walkMarkdownToken(child, visit);
        }
        continue;
      }
      if (nested && typeof nested === 'object') {
        this.walkMarkdownToken(nested, visit);
      }
    }
  }

  private collectInlineImageOccurrences(content: string | null | undefined): InlineImageOccurrence[] {
    const text = String(content || '');
    if (!text.trim()) {
      return [];
    }

    const tokens = this.parseMarkdownTokens(text);
    if (tokens) {
      const occurrences: InlineImageOccurrence[] = [];
      for (const token of tokens) {
        this.walkMarkdownToken(token, (current) => {
          if (current.type === 'image') {
            const raw = String(current.raw || '');
            const target = String((current as any).href || '').trim();
            if (!raw || !target) return;
            occurrences.push({
              raw,
              target,
              rewrite: (nextTarget: string) => raw.replace(target, nextTarget),
            });
            return;
          }

          if (current.type !== 'html') {
            return;
          }

          const snippet = String(current.raw ?? current.text ?? '');
          if (!snippet || !/<img\b/i.test(snippet)) {
            return;
          }

          const imgRegex = /<img\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1[^>]*>/gi;
          let match: RegExpExecArray | null;
          while ((match = imgRegex.exec(snippet)) !== null) {
            const raw = String(match[0] || '');
            const target = String(match[2] || '').trim();
            if (!raw || !target) continue;
            occurrences.push({
              raw,
              target,
              rewrite: (nextTarget: string) => raw.replace(target, nextTarget),
            });
          }
        });
      }
      return occurrences;
    }

    const fallbackOccurrences: InlineImageOccurrence[] = [];
    const markdownImageRegex = /!\[[^\]]*]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
    let markdownMatch: RegExpExecArray | null;
    while ((markdownMatch = markdownImageRegex.exec(text)) !== null) {
      const raw = String(markdownMatch[0] || '');
      const target = String(markdownMatch[1] || '').trim();
      if (!raw || !target) continue;
      fallbackOccurrences.push({
        raw,
        target,
        rewrite: (nextTarget: string) => raw.replace(target, nextTarget),
      });
    }

    const htmlImageRegex = /<img\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1[^>]*>/gi;
    let htmlMatch: RegExpExecArray | null;
    while ((htmlMatch = htmlImageRegex.exec(text)) !== null) {
      const raw = String(htmlMatch[0] || '');
      const target = String(htmlMatch[2] || '').trim();
      if (!raw || !target) continue;
      fallbackOccurrences.push({
        raw,
        target,
        rewrite: (nextTarget: string) => raw.replace(target, nextTarget),
      });
    }

    return fallbackOccurrences;
  }

  private applyInlineImageReplacements(
    content: string | null | undefined,
    replacements: Array<{ raw: string; replacement: string }>,
  ): string {
    const text = String(content || '');
    if (replacements.length === 0) {
      return text;
    }

    let cursor = 0;
    let output = '';
    for (const entry of replacements) {
      const nextIndex = text.indexOf(entry.raw, cursor);
      if (nextIndex < 0) {
        throw new BadRequestException('Failed to rewrite recovered inline image content');
      }
      output += text.slice(cursor, nextIndex);
      output += entry.replacement;
      cursor = nextIndex + entry.raw.length;
    }

    output += text.slice(cursor);
    return output;
  }

  private inlineImageExtensionFromMimeType(mimeType: string): string {
    switch (String(mimeType || '').toLowerCase()) {
      case 'image/png':
        return 'png';
      case 'image/jpeg':
        return 'jpg';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      default:
        throw new BadRequestException('Unsupported image type. Allowed: PNG, JPG, JPEG, GIF, WEBP');
    }
  }

  private parseDataImageUri(
    target: string | null | undefined,
  ): { mimeType: string; buffer: Buffer; extension: string } | null {
    const normalized = String(target || '').trim();
    const match = normalized.match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
    if (!match) {
      return null;
    }

    const metaEnd = normalized.indexOf(',');
    if (metaEnd < 0) {
      throw new BadRequestException('Invalid inline image data URI');
    }

    const base64Part = normalized.slice(metaEnd + 1).replace(/\s+/g, '');
    const buffer = Buffer.from(base64Part, 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('Invalid inline image payload');
    }

    const mimeType = String(match[1] || '').toLowerCase();
    return {
      mimeType,
      buffer,
      extension: this.inlineImageExtensionFromMimeType(mimeType),
    };
  }

  private parseLegacyInlineAttachmentId(
    target: string | null | undefined,
    sourceEntityType: SourceScopedEntityType,
  ): string | null {
    const normalized = String(target || '').trim();
    if (!normalized) {
      return null;
    }
    const { routePrefix } = this.getLegacyAttachmentTable(sourceEntityType);
    const match = normalized.match(
      new RegExp(`${this.escapeRegExp(routePrefix)}[^/]+/([a-f0-9-]+)(?=[/?#]|$)`, 'i'),
    );
    return match?.[1] || null;
  }

  private collectRecoverableInlineImageOccurrences(
    content: string | null | undefined,
    sourceEntityType: SourceScopedEntityType,
    opts?: { includeLegacyAttachmentRefs?: boolean },
  ): RecoverableInlineImageOccurrence[] {
    const occurrences = this.collectInlineImageOccurrences(content);
    const recoverable: RecoverableInlineImageOccurrence[] = [];

    for (const occurrence of occurrences) {
      const dataImage = this.parseDataImageUri(occurrence.target);
      if (dataImage) {
        recoverable.push({
          ...occurrence,
          kind: 'data',
          mimeType: dataImage.mimeType,
          buffer: dataImage.buffer,
          extension: dataImage.extension,
        });
        continue;
      }

      if (opts?.includeLegacyAttachmentRefs === false) {
        continue;
      }

      const attachmentId = this.parseLegacyInlineAttachmentId(occurrence.target, sourceEntityType);
      if (attachmentId) {
        recoverable.push({
          ...occurrence,
          kind: 'legacy',
          attachmentId,
        });
      }
    }

    return recoverable;
  }

  private resolveRecoveredInitialContent(content: string | null | undefined): string {
    if (containsInlineDataImage(String(content || ''))) {
      return '';
    }
    return normalizeMarkdownRichText(content, {
      fieldName: 'content_markdown',
    }) || '';
  }

  private buildRecoveredInlineImageFile(
    occurrence: Extract<RecoverableInlineImageOccurrence, { kind: 'data' }>,
    index: number,
  ): Express.Multer.File {
    const originalname = `recovered-inline-${index + 1}.${occurrence.extension}`;
    return {
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype: occurrence.mimeType,
      size: occurrence.buffer.length,
      buffer: occurrence.buffer,
      destination: '',
      filename: originalname,
      path: '',
      stream: undefined as any,
    } as Express.Multer.File;
  }

  private async hasOwningRelationRow(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    documentId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    const config = SOURCE_ENTITY_CONFIG[sourceEntityType];
    const rows = await manager.query(
      `SELECT 1
       FROM ${config.relationTable}
       WHERE tenant_id = app_current_tenant()
         AND document_id = $1
         AND ${config.relationIdColumn} = $2
       LIMIT 1`,
      [documentId, sourceEntityId],
    );
    return rows.length > 0;
  }

  private async ensureOwningRelationRow(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    documentId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    if (await this.hasOwningRelationRow(sourceEntityType, sourceEntityId, documentId, manager)) {
      return false;
    }

    const config = SOURCE_ENTITY_CONFIG[sourceEntityType];
    const sourceRows = await manager.query<Array<{ tenant_id: string }>>(
      `SELECT tenant_id::text AS tenant_id
       FROM ${config.sourceTable}
       WHERE id = $1
         AND tenant_id = app_current_tenant()
       LIMIT 1`,
      [sourceEntityId],
    );
    if (!sourceRows.length) {
      throw new NotFoundException(`${sourceEntityType.slice(0, -1)} not found`);
    }

    await manager.query(
      `INSERT INTO ${config.relationTable} (tenant_id, document_id, ${config.relationIdColumn})
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id, ${config.relationIdColumn}) DO NOTHING`,
      [sourceRows[0].tenant_id, documentId, sourceEntityId],
    );
    return true;
  }

  private async ensurePrimaryOwnerContributor(
    documentId: string,
    ownerUserId: string | null | undefined,
    manager: EntityManager,
  ): Promise<void> {
    const normalizedOwnerUserId = this.normalizeOptionalUserId(ownerUserId);
    if (!normalizedOwnerUserId) {
      return;
    }

    const userRows = await manager.query<Array<{ id: string }>>(
      `SELECT id
       FROM users
       WHERE id = $1
         AND tenant_id = app_current_tenant()
       LIMIT 1`,
      [normalizedOwnerUserId],
    );
    if (!userRows.length) {
      return;
    }

    await manager.query(
      `UPDATE document_contributors
       SET is_primary = false
       WHERE tenant_id = app_current_tenant()
         AND document_id = $1
         AND role = 'owner'
         AND user_id <> $2`,
      [documentId, normalizedOwnerUserId],
    );
    await manager.query(
      `INSERT INTO document_contributors (
         tenant_id,
         document_id,
         user_id,
         role,
         is_primary
       )
       VALUES (app_current_tenant(), $1, $2, 'owner', true)
       ON CONFLICT (document_id, user_id, role)
       DO UPDATE SET
         is_primary = EXCLUDED.is_primary`,
      [documentId, normalizedOwnerUserId],
    );
  }

  private async getSlotSetting(
    sourceEntityType: SourceScopedEntityType,
    slotKey: IntegratedDocumentSlotKey,
    manager: EntityManager,
  ): Promise<SlotSettingRecord> {
    const rows = await manager.query<Array<SlotSettingRecord>>(
      `SELECT s.source_entity_type,
              s.slot_key,
              s.display_name,
              s.folder_id,
              f.library_id,
              s.document_type_id,
              s.template_document_id,
              td.content_markdown AS template_content_markdown
       FROM integrated_document_slot_settings s
       JOIN document_folders f ON f.id = s.folder_id AND f.tenant_id = s.tenant_id
       LEFT JOIN documents td ON td.id = s.template_document_id AND td.tenant_id = s.tenant_id
       WHERE s.tenant_id = app_current_tenant()
         AND s.source_entity_type = $1
         AND s.slot_key = $2
         AND s.is_active = true
       LIMIT 1`,
      [sourceEntityType, slotKey],
    );
    if (!rows.length) {
      throw new NotFoundException(`Integrated document slot setting not found for ${sourceEntityType}:${slotKey}`);
    }
    return rows[0];
  }

  private async findBinding(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: IntegratedDocumentSlotKey,
    manager: EntityManager,
  ): Promise<IntegratedDocumentBinding | null> {
    return manager.getRepository(IntegratedDocumentBinding).findOne({
      where: {
        source_entity_type: sourceEntityType,
        source_entity_id: sourceEntityId,
        slot_key: slotKey,
      } as any,
    });
  }

  private async getDocumentOrThrow(documentId: string, manager: EntityManager): Promise<Document> {
    const document = await manager.getRepository(Document).findOne({ where: { id: documentId } });
    if (!document) {
      throw new NotFoundException('Integrated document not found');
    }
    return document;
  }

  private resolveInitialContent(
    explicitContent: string | null | undefined,
    templateContent: string | null | undefined,
    opts?: { useTemplateWhenBlank?: boolean },
  ): string {
    const normalizedExplicit = normalizeMarkdownRichText(explicitContent, {
      fieldName: 'content_markdown',
    }) || '';
    if (normalizedExplicit) {
      return normalizedExplicit;
    }
    if (opts?.useTemplateWhenBlank === false) {
      return '';
    }
    return normalizeMarkdownRichText(templateContent, {
      fieldName: 'content_markdown',
    }) || '';
  }

  private async logSourceSemanticActivity(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: IntegratedDocumentSlotKey,
    tenantId: string,
    userId: string | null | undefined,
    manager: EntityManager,
  ): Promise<void> {
    const repo = manager.getRepository(PortfolioActivity);
    await repo.save(repo.create({
      tenant_id: tenantId,
      request_id: sourceEntityType === 'requests' ? sourceEntityId : null,
      project_id: sourceEntityType === 'projects' ? sourceEntityId : null,
      author_id: userId || null,
      type: 'change',
      content: this.getSemanticUpdateLabel(sourceEntityType, slotKey),
    }));
  }

  private extractKnowledgeInlineAttachmentIds(content: string): string[] {
    const attachmentIds = new Set<string>();
    for (const url of extractInlineImageUrls(content)) {
      const match = url.match(/\/knowledge\/inline\/[^/]+\/([a-f0-9-]+)(?=[/?#]|$)/i);
      if (match?.[1]) {
        attachmentIds.add(match[1]);
      }
    }
    return Array.from(attachmentIds);
  }

  private extractLegacyInlineAttachmentIds(
    content: string,
    sourceEntityType: SourceScopedEntityType,
  ): string[] {
    const { routePrefix } = this.getLegacyAttachmentTable(sourceEntityType);
    const attachmentIds = new Set<string>();
    for (const url of extractInlineImageUrls(content)) {
      const match = url.match(
        new RegExp(`${this.escapeRegExp(routePrefix)}[^/]+/([a-f0-9-]+)(?=[/?#]|$)`, 'i'),
      );
      if (match?.[1]) {
        attachmentIds.add(match[1]);
      }
    }
    return Array.from(attachmentIds);
  }

  private extractAnyLegacyInlineAttachmentIds(content: string): string[] {
    const attachmentIds = new Set<string>();
    for (const url of extractInlineImageUrls(content)) {
      const match = url.match(/\/portfolio\/(?:requests|projects)\/inline\/[^/]+\/([a-f0-9-]+)(?=[/?#]|$)/i);
      if (match?.[1]) {
        attachmentIds.add(match[1]);
      }
    }
    return Array.from(attachmentIds);
  }

  private rewriteKnowledgeInlineAttachmentIds(
    content: string,
    mappings: Array<{ sourceAttachmentId: string; clonedAttachmentId: string }>,
  ): string {
    let rewritten = content;
    for (const mapping of mappings) {
      const escaped = this.escapeRegExp(mapping.sourceAttachmentId);
      const pattern = new RegExp(
        `([^"'\\s)]*?/knowledge/inline/[^/]+/)${escaped}(?=(?:[/?#)"'\\s]|$))`,
        'g',
      );
      rewritten = rewritten.replace(pattern, `$1${mapping.clonedAttachmentId}`);
    }
    return rewritten;
  }

  private rewriteLegacyInlineAttachmentIds(
    content: string,
    sourceEntityType: SourceScopedEntityType,
    tenantSlug: string,
    mappings: Array<{ sourceAttachmentId: string; clonedAttachmentId: string }>,
  ): string {
    const { routePrefix } = this.getLegacyAttachmentTable(sourceEntityType);
    let rewritten = content;
    for (const mapping of mappings) {
      const escaped = this.escapeRegExp(mapping.sourceAttachmentId);
      const pattern = new RegExp(
        `${this.escapeRegExp(routePrefix)}[^/]+/${escaped}(?=(?:[/?#)"'\\s]|$))`,
        'g',
      );
      rewritten = rewritten.replace(
        pattern,
        `/knowledge/inline/${tenantSlug}/${mapping.clonedAttachmentId}`,
      );
    }
    return rewritten;
  }

  private escapeRegExp(value: string): string {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async loadLegacyAttachmentRows(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    sourceField: 'purpose' | 'risks',
    attachmentIds: string[],
    manager: EntityManager,
  ): Promise<LegacyAttachmentRow[]> {
    const normalizedAttachmentIds = Array.from(new Set(attachmentIds.map((value) => String(value || '').trim()).filter(Boolean)));
    if (normalizedAttachmentIds.length === 0) {
      return [];
    }

    const { tableName, relationIdColumn } = this.getLegacyAttachmentTable(sourceEntityType);
    return manager.query<Array<LegacyAttachmentRow>>(
      `SELECT id,
              original_filename,
              stored_filename,
              mime_type,
              size,
              storage_path,
              source_field
       FROM ${tableName}
       WHERE ${relationIdColumn} = $1
         AND source_field = $2
         AND id = ANY($3::uuid[])
       ORDER BY created_at ASC`,
      [sourceEntityId, sourceField, normalizedAttachmentIds],
    );
  }

  private async importLegacyInlineAttachments(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    sourceField: 'purpose' | 'risks',
    documentId: string,
    tenantId: string,
    tenantSlug: string,
    content: string,
    userId: string | null | undefined,
    manager: EntityManager,
  ): Promise<{
    content_markdown: string;
    mappings: Array<{ sourceAttachmentId: string; clonedAttachmentId: string }>;
  }> {
    const referencedAttachmentIds = this.extractLegacyInlineAttachmentIds(content, sourceEntityType);
    if (referencedAttachmentIds.length === 0) {
      return {
        content_markdown: content,
        mappings: [],
      };
    }

    const legacyAttachments = await this.loadLegacyAttachmentRows(
      sourceEntityType,
      sourceEntityId,
      sourceField,
      referencedAttachmentIds,
      manager,
    );
    if (legacyAttachments.length !== referencedAttachmentIds.length) {
      throw new NotFoundException(`Missing legacy inline attachment rows for ${sourceEntityType}:${sourceField}`);
    }

    const attachmentById = new Map<string, LegacyAttachmentRow>();
    for (const attachment of legacyAttachments) {
      attachmentById.set(String(attachment.id), attachment);
    }

    const attachmentRepo = manager.getRepository(DocumentAttachment);
    const mappings: Array<{ sourceAttachmentId: string; clonedAttachmentId: string }> = [];
    for (const referencedAttachmentId of referencedAttachmentIds) {
      const legacyAttachment = attachmentById.get(referencedAttachmentId);
      if (!legacyAttachment) {
        throw new NotFoundException(`Legacy inline attachment ${referencedAttachmentId} not found`);
      }

      const saved = await attachmentRepo.save(attachmentRepo.create({
        tenant_id: tenantId,
        document_id: documentId,
        original_filename: legacyAttachment.original_filename,
        stored_filename: legacyAttachment.stored_filename,
        mime_type: legacyAttachment.mime_type,
        size: Number(legacyAttachment.size || 0),
        storage_path: legacyAttachment.storage_path,
        source_field: 'content_markdown',
        uploaded_by_id: userId || null,
      }));

      mappings.push({
        sourceAttachmentId: referencedAttachmentId,
        clonedAttachmentId: saved.id,
      });
    }

    return {
      content_markdown: this.rewriteLegacyInlineAttachmentIds(
        content,
        sourceEntityType,
        tenantSlug,
        mappings,
      ),
      mappings,
    };
  }

  private async importRecoveredInlineImages(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: IntegratedDocumentSlotKey,
    documentId: string,
    tenantId: string,
    tenantSlug: string,
    content: string | null | undefined,
    userId: string | null | undefined,
    manager: EntityManager,
    opts?: { includeLegacyAttachmentRefs?: boolean },
  ): Promise<{
    content_markdown: string;
    legacyMappings: Array<{ sourceAttachmentId: string; clonedAttachmentId: string }>;
    dataImageAttachmentIds: string[];
  }> {
    const recoverable = this.collectRecoverableInlineImageOccurrences(
      content,
      sourceEntityType,
      { includeLegacyAttachmentRefs: opts?.includeLegacyAttachmentRefs !== false },
    );

    if (recoverable.length === 0) {
      return {
        content_markdown: normalizeMarkdownRichText(content, {
          fieldName: 'content_markdown',
        }) || '',
        legacyMappings: [],
        dataImageAttachmentIds: [],
      };
    }

    const legacySourceField = this.getLegacySourceField(sourceEntityType, slotKey);
    const legacyAttachmentIds = Array.from(new Set(
      recoverable
        .filter((occurrence): occurrence is Extract<RecoverableInlineImageOccurrence, { kind: 'legacy' }> => (
          occurrence.kind === 'legacy'
        ))
        .map((occurrence) => occurrence.attachmentId),
    ));

    const legacyById = new Map<string, LegacyAttachmentRow>();
    if (legacyAttachmentIds.length > 0) {
      const legacyAttachments = await this.loadLegacyAttachmentRows(
        sourceEntityType,
        sourceEntityId,
        legacySourceField,
        legacyAttachmentIds,
        manager,
      );
      if (legacyAttachments.length !== legacyAttachmentIds.length) {
        throw new NotFoundException(`Missing legacy inline attachment rows for ${sourceEntityType}:${legacySourceField}`);
      }
      for (const legacyAttachment of legacyAttachments) {
        legacyById.set(String(legacyAttachment.id), legacyAttachment);
      }
    }

    const attachmentRepo = manager.getRepository(DocumentAttachment);
    const replacements: Array<{ raw: string; replacement: string }> = [];
    const legacyMappings: Array<{ sourceAttachmentId: string; clonedAttachmentId: string }> = [];
    const dataImageAttachmentIds: string[] = [];

    for (let index = 0; index < recoverable.length; index += 1) {
      const occurrence = recoverable[index];
      if (occurrence.kind === 'data') {
        const uploaded = await this.knowledge.uploadAttachment(
          documentId,
          this.buildRecoveredInlineImageFile(occurrence, index),
          userId || null,
          {
            manager,
            sourceField: 'content_markdown',
          },
        );
        dataImageAttachmentIds.push(uploaded.id);
        replacements.push({
          raw: occurrence.raw,
          replacement: occurrence.rewrite(`/knowledge/inline/${tenantSlug}/${uploaded.id}`),
        });
        continue;
      }

      const legacyAttachment = legacyById.get(occurrence.attachmentId);
      if (!legacyAttachment) {
        throw new NotFoundException(`Legacy inline attachment ${occurrence.attachmentId} not found`);
      }

      const saved = await attachmentRepo.save(attachmentRepo.create({
        tenant_id: tenantId,
        document_id: documentId,
        original_filename: legacyAttachment.original_filename,
        stored_filename: legacyAttachment.stored_filename,
        mime_type: legacyAttachment.mime_type,
        size: Number(legacyAttachment.size || 0),
        storage_path: legacyAttachment.storage_path,
        source_field: 'content_markdown',
        uploaded_by_id: userId || null,
      }));

      legacyMappings.push({
        sourceAttachmentId: occurrence.attachmentId,
        clonedAttachmentId: saved.id,
      });
      replacements.push({
        raw: occurrence.raw,
        replacement: occurrence.rewrite(`/knowledge/inline/${tenantSlug}/${saved.id}`),
      });
    }

    return {
      content_markdown: normalizeMarkdownRichText(
        this.applyInlineImageReplacements(content, replacements),
        {
          fieldName: 'content_markdown',
        },
      ) || '',
      legacyMappings,
      dataImageAttachmentIds,
    };
  }

  private rewriteRecoveredInlineImagesForVerification(
    sourceEntityType: SourceScopedEntityType,
    tenantSlug: string,
    content: string | null | undefined,
    managedAttachmentIds: string[],
    contextLabel: string,
    opts?: { includeLegacyAttachmentRefs?: boolean },
  ): {
    content_markdown: string;
    assignments: RecoverableInlineImageAssignment[];
  } {
    const recoverable = this.collectRecoverableInlineImageOccurrences(
      content,
      sourceEntityType,
      { includeLegacyAttachmentRefs: opts?.includeLegacyAttachmentRefs !== false },
    );
    if (recoverable.length !== managedAttachmentIds.length) {
      throw new Error(`Managed inline attachment count mismatch for ${contextLabel}`);
    }

    const replacements: Array<{ raw: string; replacement: string }> = [];
    const assignments: RecoverableInlineImageAssignment[] = [];

    for (let index = 0; index < recoverable.length; index += 1) {
      const occurrence = recoverable[index];
      const attachmentId = String(managedAttachmentIds[index] || '').trim();
      if (!attachmentId) {
        throw new Error(`Managed inline attachment mapping missing for ${contextLabel}`);
      }

      replacements.push({
        raw: occurrence.raw,
        replacement: occurrence.rewrite(`/knowledge/inline/${tenantSlug}/${attachmentId}`),
      });

      if (occurrence.kind === 'data') {
        assignments.push({
          kind: 'data',
          attachmentId,
          mimeType: occurrence.mimeType,
          size: occurrence.buffer.length,
        });
        continue;
      }

      assignments.push({
        kind: 'legacy',
        attachmentId,
        sourceAttachmentId: occurrence.attachmentId,
      });
    }

    return {
      content_markdown: this.applyInlineImageReplacements(content, replacements),
      assignments,
    };
  }

  private async assertRecoveredInlineImagesMatchDocument(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: IntegratedDocumentSlotKey,
    tenantSlug: string,
    recoveredContent: string | null | undefined,
    documentId: string,
    normalizedDocumentContent: string,
    manager: EntityManager,
    opts?: { includeLegacyAttachmentRefs?: boolean },
  ): Promise<void> {
    const managedAttachmentIds = this.extractKnowledgeInlineAttachmentIds(normalizedDocumentContent);
    const contextLabel = `${sourceEntityType}:${slotKey}:${sourceEntityId}`;
    const rewritten = this.rewriteRecoveredInlineImagesForVerification(
      sourceEntityType,
      tenantSlug,
      recoveredContent,
      managedAttachmentIds,
      contextLabel,
      { includeLegacyAttachmentRefs: opts?.includeLegacyAttachmentRefs !== false },
    );

    const managedAttachments = await manager.query<Array<ManagedAttachmentRow>>(
      `SELECT id,
              original_filename,
              mime_type,
              size,
              storage_path,
              source_field
       FROM document_attachments
       WHERE tenant_id = app_current_tenant()
         AND document_id = $1
         AND source_field = 'content_markdown'`,
      [documentId],
    );
    if (managedAttachments.length !== managedAttachmentIds.length) {
      throw new Error(`Managed attachment row mismatch for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
    }

    const managedAttachmentIdsSet = new Set(managedAttachmentIds);
    if (managedAttachments.some((attachment) => !managedAttachmentIdsSet.has(String(attachment.id)))) {
      throw new Error(`Managed attachment rows are not fully referenced by content for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
    }

    const managedById = new Map<string, ManagedAttachmentRow>(
      managedAttachments.map((attachment) => [String(attachment.id), attachment]),
    );

    const legacyAssignments = rewritten.assignments
      .filter((assignment): assignment is Extract<RecoverableInlineImageAssignment, { kind: 'legacy' }> => (
        assignment.kind === 'legacy'
      ));
    if (legacyAssignments.length > 0) {
      const legacySourceField = this.getLegacySourceField(sourceEntityType, slotKey);
      const legacyAttachments = await this.loadLegacyAttachmentRows(
        sourceEntityType,
        sourceEntityId,
        legacySourceField,
        legacyAssignments.map((assignment) => assignment.sourceAttachmentId),
        manager,
      );
      if (legacyAttachments.length !== legacyAssignments.length) {
        throw new Error(`Legacy inline attachment row mismatch for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
      }

      const legacyById = new Map<string, LegacyAttachmentRow>(
        legacyAttachments.map((attachment) => [String(attachment.id), attachment]),
      );

      for (const assignment of legacyAssignments) {
        const legacyAttachment = legacyById.get(assignment.sourceAttachmentId);
        const managedAttachment = managedById.get(assignment.attachmentId);
        if (!legacyAttachment || !managedAttachment) {
          throw new Error(`Inline attachment mapping missing for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
        }
        if (managedAttachment.source_field !== 'content_markdown') {
          throw new Error(`Managed inline attachment source_field mismatch for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
        }
        if (
          managedAttachment.storage_path !== legacyAttachment.storage_path
          || managedAttachment.original_filename !== legacyAttachment.original_filename
          || managedAttachment.mime_type !== legacyAttachment.mime_type
          || Number(managedAttachment.size || 0) !== Number(legacyAttachment.size || 0)
        ) {
          throw new Error(`Managed inline attachment metadata mismatch for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
        }
      }
    }

    for (const assignment of rewritten.assignments) {
      if (assignment.kind !== 'data') {
        continue;
      }
      const managedAttachment = managedById.get(assignment.attachmentId);
      if (!managedAttachment) {
        throw new Error(`Managed inline attachment mapping missing for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
      }
      if (managedAttachment.source_field !== 'content_markdown') {
        throw new Error(`Managed inline attachment source_field mismatch for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
      }
      if (
        String(managedAttachment.mime_type || '').toLowerCase() !== assignment.mimeType
        || Number(managedAttachment.size || 0) !== assignment.size
      ) {
        throw new Error(`Recovered data image metadata mismatch for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
      }
    }

    const normalizedExpectedContent = normalizeMarkdownRichText(rewritten.content_markdown, {
      fieldName: 'content_markdown',
    }) || '';
    if (normalizedExpectedContent !== normalizedDocumentContent) {
      throw new Error(`Managed document content mismatch for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
    }
  }

  private async assertSourcePermission(
    sourceEntityType: SourceScopedEntityType,
    accessMode: SourceAccessMode,
    userId: string,
    manager: EntityManager,
  ): Promise<void> {
    const config = SOURCE_ENTITY_CONFIG[sourceEntityType];
    const requiredLevel = accessMode === 'edit' ? config.editLevel : config.readLevel;

    const userRows = await manager.query(
      `SELECT u.role_id,
              lower(coalesce(r.role_name, '')) AS primary_role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id AND r.tenant_id = u.tenant_id
       WHERE u.id = $1
         AND u.tenant_id = app_current_tenant()
       LIMIT 1`,
      [userId],
    ) as Array<{ role_id: string | null; primary_role_name: string }>;
    if (!userRows.length) {
      throw new ForbiddenException('User not found');
    }

    const extraRoleRows = await manager.query(
      `SELECT ur.role_id,
              lower(coalesce(r.role_name, '')) AS role_name
       FROM user_roles ur
       LEFT JOIN roles r ON r.id = ur.role_id AND r.tenant_id = ur.tenant_id
       WHERE ur.user_id = $1
         AND ur.tenant_id = app_current_tenant()`,
      [userId],
    ) as Array<{ role_id: string | null; role_name: string }>;

    const roleNames = new Set<string>([
      String(userRows[0].primary_role_name || ''),
      ...extraRoleRows.map((row) => String(row.role_name || '')),
    ]);
    if (roleNames.has('administrator')) {
      return;
    }

    const roleIds = Array.from(new Set([
      userRows[0].role_id,
      ...extraRoleRows.map((row) => row.role_id),
    ].filter(Boolean) as string[]));

    const effectivePermissions = await this.permissions.listForRoles(roleIds, { manager });
    const currentLevel = effectivePermissions.get(config.permissionResource);
    if (!currentLevel || PERMISSION_RANK[currentLevel] < PERMISSION_RANK[requiredLevel]) {
      throw new ForbiddenException(`${config.permissionResource}:${requiredLevel} permission is required`);
    }
  }

  private async assertSourceEntityExists(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    manager: EntityManager,
  ): Promise<void> {
    const config = SOURCE_ENTITY_CONFIG[sourceEntityType];
    const rows = await manager.query(
      `SELECT id
       FROM ${config.sourceTable}
       WHERE id = $1
         AND tenant_id = app_current_tenant()
       LIMIT 1`,
      [sourceEntityId],
    );
    if (!rows.length) {
      throw new NotFoundException(`${sourceEntityType.slice(0, -1)} not found`);
    }
  }

  private async resolveManagedDocumentId(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: string,
    accessMode: SourceAccessMode,
    userId: string,
    manager: EntityManager,
  ): Promise<string> {
    this.assertSupportedSlot(sourceEntityType, slotKey);
    await this.assertSourcePermission(sourceEntityType, accessMode, userId, manager);
    await this.assertSourceEntityExists(sourceEntityType, sourceEntityId, manager);

    let binding = await this.findBinding(
      sourceEntityType,
      sourceEntityId,
      slotKey as IntegratedDocumentSlotKey,
      manager,
    );
    if (!binding) {
      await this.repairSourceSlot(
        sourceEntityType,
        sourceEntityId,
        slotKey as IntegratedDocumentSlotKey,
        { manager },
      );
      binding = await this.findBinding(
        sourceEntityType,
        sourceEntityId,
        slotKey as IntegratedDocumentSlotKey,
        manager,
      );
    }

    if (!binding) {
      throw new NotFoundException('Integrated document not found');
    }

    await this.ensureOwningRelationRow(
      sourceEntityType,
      sourceEntityId,
      binding.document_id,
      manager,
    );
    return String(binding.document_id);
  }

  private async ensureBoundDocument(
    sourceEntityType: SourceScopedEntityType,
    source: SourceDescriptor,
    slotKey: IntegratedDocumentSlotKey,
    explicitContent: string | null | undefined,
    userId: string | null | undefined,
    manager: EntityManager,
    opts?: {
      useTemplateWhenBlank?: boolean;
      ownerUserId?: string | null;
      changeNote?: string | null;
      activityContent?: string | null;
      initializer?: (
        documentId: string,
        manager: EntityManager,
      ) => Promise<{ content_markdown?: string | null } | void>;
    },
  ): Promise<ManagedWriteResult> {
    const existingBinding = await this.findBinding(sourceEntityType, source.id, slotKey, manager);
    if (existingBinding) {
      return {
        documentId: existingBinding.document_id,
        changed: false,
        created: false,
      };
    }

    const slotSetting = await this.getSlotSetting(sourceEntityType, slotKey, manager);
    const initialContent = this.resolveInitialContent(
      explicitContent,
      slotSetting.template_content_markdown,
      { useTemplateWhenBlank: opts?.useTemplateWhenBlank },
    );

    const created = await this.knowledge.createManagedDocument(
      {
        tenantId: source.tenant_id,
        title: this.formatManagedTitle(sourceEntityType, source, slotKey),
        summary: null,
        content_markdown: initialContent,
        folder_id: slotSetting.folder_id,
        library_id: slotSetting.library_id,
        document_type_id: slotSetting.document_type_id,
        template_document_id: slotSetting.template_document_id,
        status: 'published',
        relationEntityType: sourceEntityType as Extract<RelationEntityType, 'projects' | 'requests'>,
        relationIds: [source.id],
        change_note: opts?.changeNote ?? null,
        activity_content: opts?.activityContent ?? null,
      },
      userId || null,
      {
        manager,
        initializer: opts?.initializer,
      },
    );
    await this.ensurePrimaryOwnerContributor(created.id, opts?.ownerUserId ?? null, manager);

    await manager.getRepository(IntegratedDocumentBinding).save(
      manager.getRepository(IntegratedDocumentBinding).create({
        tenant_id: source.tenant_id,
        source_entity_type: sourceEntityType,
        source_entity_id: source.id,
        slot_key: slotKey,
        document_id: created.id,
        hidden_from_entity_knowledge: true,
      }),
    );

    return {
      documentId: created.id,
      changed: true,
      created: true,
    };
  }

  async provisionForRequest(
    source: SourceDescriptor,
    body: {
      purpose?: string | null;
      risks_mitigations?: string | null;
    },
    userId: string | null | undefined,
    opts?: { manager?: EntityManager },
  ): Promise<void> {
    const manager = this.getManager(opts);
    const ownerUserId = await this.loadPreferredOwnerUserId('requests', source.id, manager);
    await this.ensureBoundDocument('requests', source, 'purpose', body?.purpose, userId, manager, {
      ownerUserId,
    });
    await this.ensureBoundDocument('requests', source, 'risks_mitigations', body?.risks_mitigations, userId, manager, {
      ownerUserId,
    });
  }

  async provisionForProject(
    source: SourceDescriptor,
    body: {
      purpose?: string | null;
    },
    userId: string | null | undefined,
    opts?: { manager?: EntityManager },
  ): Promise<void> {
    const manager = this.getManager(opts);
    const ownerUserId = await this.loadPreferredOwnerUserId('projects', source.id, manager);
    await this.ensureBoundDocument('projects', source, 'purpose', body?.purpose, userId, manager, {
      ownerUserId,
    });
  }

  async writeSourceSlotContent(
    sourceEntityType: SourceScopedEntityType,
    source: SourceDescriptor,
    slotKey: IntegratedDocumentSlotKey,
    content: string | null | undefined,
    userId: string | null | undefined,
    opts?: { manager?: EntityManager; logSourceActivity?: boolean },
  ): Promise<ManagedWriteResult> {
    const manager = this.getManager(opts);
    this.assertSupportedSlot(sourceEntityType, slotKey);
    const ownerUserId = await this.loadPreferredOwnerUserId(sourceEntityType, source.id, manager);

    const existingBinding = await this.findBinding(sourceEntityType, source.id, slotKey, manager);
    if (!existingBinding) {
      const created = await this.ensureBoundDocument(
        sourceEntityType,
        source,
        slotKey,
        content,
        userId,
        manager,
        {
          useTemplateWhenBlank: false,
          ownerUserId,
        },
      );
      if (created.changed && opts?.logSourceActivity !== false) {
        await this.logSourceSemanticActivity(sourceEntityType, source.id, slotKey, source.tenant_id, userId, manager);
      }
      return created;
    }

    const existingDocument = await this.getDocumentOrThrow(existingBinding.document_id, manager);
    const nextContent = normalizeMarkdownRichText(content, { fieldName: 'content_markdown' }) || '';
    if (existingDocument.content_markdown === nextContent) {
      return {
        documentId: existingBinding.document_id,
        changed: false,
        created: false,
      };
    }

    await this.knowledge.updateManagedDocument(
      existingBinding.document_id,
      {
        content_markdown: nextContent,
        create_version: true,
        activity_content: 'Document updated',
      },
      userId || null,
      { manager },
    );

    if (opts?.logSourceActivity !== false) {
      await this.logSourceSemanticActivity(sourceEntityType, source.id, slotKey, source.tenant_id, userId, manager);
    }

    return {
      documentId: existingBinding.document_id,
      changed: true,
      created: false,
    };
  }

  async syncTitles(
    sourceEntityType: SourceScopedEntityType,
    source: SourceDescriptor,
    userId: string | null | undefined,
    opts?: { manager?: EntityManager },
  ): Promise<number> {
    const manager = this.getManager(opts);
    const bindings = await manager.getRepository(IntegratedDocumentBinding).find({
      where: {
        source_entity_type: sourceEntityType,
        source_entity_id: source.id,
      } as any,
      order: { created_at: 'ASC' as const },
    });

    let updatedCount = 0;
    for (const binding of bindings) {
      if (!SUPPORTED_SLOT_KEYS[sourceEntityType].has(binding.slot_key)) {
        continue;
      }
      const slotKey = binding.slot_key as IntegratedDocumentSlotKey;
      const document = await this.getDocumentOrThrow(binding.document_id, manager);
      const nextTitle = this.formatManagedTitle(sourceEntityType, source, slotKey);
      if (document.title === nextTitle) {
        continue;
      }
      await this.knowledge.updateManagedDocument(
        binding.document_id,
        {
          title: nextTitle,
          create_version: false,
        },
        userId || null,
        { manager },
      );
      updatedCount += 1;
    }

    return updatedCount;
  }

  async createProjectPurposeFromRequest(
    requestSource: SourceDescriptor,
    projectSource: SourceDescriptor,
    userId: string | null | undefined,
    opts?: { manager?: EntityManager },
  ): Promise<void> {
    const manager = this.getManager(opts);
    const requestBinding = await this.findBinding('requests', requestSource.id, 'purpose', manager);
    if (!requestBinding) {
      throw new NotFoundException('Request purpose integrated document not found');
    }

    const requestDocument = await this.getDocumentOrThrow(requestBinding.document_id, manager);
    const referencedAttachmentIds = this.extractKnowledgeInlineAttachmentIds(requestDocument.content_markdown || '');
    const ownerUserId = await this.loadPreferredOwnerUserId('projects', projectSource.id, manager);

    await this.ensureBoundDocument(
      'projects',
      projectSource,
      'purpose',
      requestDocument.content_markdown || '',
      userId,
      manager,
      {
        ownerUserId,
        useTemplateWhenBlank: false,
        initializer: async (projectDocumentId, initializerManager) => {
          if (referencedAttachmentIds.length === 0) {
            return {
              content_markdown: requestDocument.content_markdown || '',
            };
          }

          const mappings = await this.knowledge.cloneInlineAttachments(
            requestBinding.document_id,
            projectDocumentId,
            referencedAttachmentIds,
            userId || null,
            { manager: initializerManager },
          );
          if (mappings.length !== referencedAttachmentIds.length) {
            throw new NotFoundException('Failed to clone one or more managed inline attachments');
          }

          return {
            content_markdown: this.rewriteKnowledgeInlineAttachmentIds(
              requestDocument.content_markdown || '',
              mappings,
            ),
          };
        },
      },
    );
  }

  private async backfillSourceSlot(
    sourceEntityType: SourceScopedEntityType,
    source: SourceDescriptor,
    slotKey: IntegratedDocumentSlotKey,
    legacyContent: string | null | undefined,
    tenantSlug: string,
    ownerUserId: string | null,
    manager: EntityManager,
  ): Promise<ManagedWriteResult> {
    const importChangeNote = this.getImportChangeNote(sourceEntityType);
    const initialContent = this.resolveRecoveredInitialContent(legacyContent);

    return this.ensureBoundDocument(
      sourceEntityType,
      source,
      slotKey,
      initialContent,
      ownerUserId,
      manager,
      {
        ownerUserId,
        useTemplateWhenBlank: false,
        changeNote: importChangeNote,
        activityContent: importChangeNote,
        initializer: async (documentId, initializerManager) => {
          const imported = await this.importRecoveredInlineImages(
            sourceEntityType,
            source.id,
            slotKey,
            documentId,
            source.tenant_id,
            tenantSlug,
            legacyContent,
            ownerUserId,
            initializerManager,
            { includeLegacyAttachmentRefs: true },
          );
          return {
            content_markdown: imported.content_markdown,
          };
        },
      },
    );
  }

  async backfillRequestRow(
    row: RequestBackfillRow,
    tenantSlug: string,
    opts?: { manager?: EntityManager },
  ): Promise<{ created: number; skipped: number }> {
    const manager = this.getManager(opts);
    const ownerUserId = this.resolvePreferredOwnerUserId('requests', row);
    const source: SourceDescriptor = {
      id: row.id,
      tenant_id: row.tenant_id,
      item_number: row.item_number,
      name: row.name,
    };

    const purpose = await this.backfillSourceSlot(
      'requests',
      source,
      'purpose',
      row.purpose,
      tenantSlug,
      ownerUserId,
      manager,
    );
    const risks = await this.backfillSourceSlot(
      'requests',
      source,
      'risks_mitigations',
      row.risks,
      tenantSlug,
      ownerUserId,
      manager,
    );

    const created = Number(purpose.created) + Number(risks.created);
    return {
      created,
      skipped: 2 - created,
    };
  }

  async backfillProjectRow(
    row: ProjectBackfillRow,
    tenantSlug: string,
    opts?: { manager?: EntityManager },
  ): Promise<{ created: number; skipped: number }> {
    const manager = this.getManager(opts);
    const ownerUserId = this.resolvePreferredOwnerUserId('projects', row);
    const source: SourceDescriptor = {
      id: row.id,
      tenant_id: row.tenant_id,
      item_number: row.item_number,
      name: row.name,
    };

    const purpose = await this.backfillSourceSlot(
      'projects',
      source,
      'purpose',
      row.purpose,
      tenantSlug,
      ownerUserId,
      manager,
    );

    return {
      created: Number(purpose.created),
      skipped: purpose.created ? 0 : 1,
    };
  }

  async repairSourceSlot(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: IntegratedDocumentSlotKey,
    opts?: { manager?: EntityManager },
  ): Promise<RepairSourceSlotResult> {
    const manager = this.getManager(opts);
    this.assertSupportedSlot(sourceEntityType, slotKey);

    const existingBinding = await this.findBinding(sourceEntityType, sourceEntityId, slotKey, manager);
    if (existingBinding) {
      const repairedRelation = await this.ensureOwningRelationRow(
        sourceEntityType,
        sourceEntityId,
        existingBinding.document_id,
        manager,
      );
      return {
        slotKey,
        documentId: existingBinding.document_id,
        created: false,
        repairedRelation,
        recoveredFrom: null,
        unresolvedLegacyInlineAttachmentIds: [],
      };
    }

    const context = await this.loadSourceRecoveryContext(sourceEntityType, sourceEntityId, manager);
    const recovered = await this.loadRecoveredSlotContent(sourceEntityType, sourceEntityId, slotKey, manager);

    if (recovered.source === 'legacy') {
      await this.backfillSourceSlot(
        sourceEntityType,
        context.source,
        slotKey,
        recovered.content,
        context.tenantSlug,
        context.ownerUserId,
        manager,
      );
    } else {
      const initialContent = this.resolveRecoveredInitialContent(recovered.content);
      const needsDataImageRecovery = containsInlineDataImage(String(recovered.content || ''));
      await this.ensureBoundDocument(
        sourceEntityType,
        context.source,
        slotKey,
        initialContent,
        context.ownerUserId,
        manager,
        {
          ownerUserId: context.ownerUserId,
          useTemplateWhenBlank: false,
          changeNote: 'Recovered from audit log after integrated-doc migration',
          activityContent: 'Recovered from audit log after integrated-doc migration',
          initializer: needsDataImageRecovery
            ? async (documentId, initializerManager) => {
              const imported = await this.importRecoveredInlineImages(
                sourceEntityType,
                context.source.id,
                slotKey,
                documentId,
                context.source.tenant_id,
                context.tenantSlug,
                recovered.content,
                context.ownerUserId,
                initializerManager,
                { includeLegacyAttachmentRefs: false },
              );
              return {
                content_markdown: imported.content_markdown,
              };
            }
            : undefined,
        },
      );
    }

    const binding = await this.findBinding(sourceEntityType, sourceEntityId, slotKey, manager);
    if (!binding) {
      throw new NotFoundException(`Integrated document repair failed for ${sourceEntityType}:${slotKey}:${sourceEntityId}`);
    }

    const repairedRelation = await this.ensureOwningRelationRow(
      sourceEntityType,
      sourceEntityId,
      binding.document_id,
      manager,
    );

    return {
      slotKey,
      documentId: binding.document_id,
      created: true,
      repairedRelation,
      recoveredFrom: recovered.source,
      unresolvedLegacyInlineAttachmentIds: recovered.unresolvedLegacyInlineAttachmentIds,
    };
  }

  async repairSourceEntity(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    opts?: { manager?: EntityManager },
  ): Promise<RepairSourceEntityResult> {
    const slots: RepairSourceSlotResult[] = [];
    for (const definition of this.getSlotDefinitionsForSource(sourceEntityType)) {
      slots.push(
        await this.repairSourceSlot(
          sourceEntityType,
          sourceEntityId,
          definition.slotKey,
          opts,
        ),
      );
    }
    return {
      sourceEntityType,
      sourceEntityId,
      slots,
    };
  }

  private async verifySourceSlotState(
    sourceEntityType: SourceScopedEntityType,
    context: SourceRecoveryContext,
    slotKey: IntegratedDocumentSlotKey,
    manager: EntityManager,
  ): Promise<void> {
    const slotSetting = await this.getSlotSetting(sourceEntityType, slotKey, manager);
    const config = SOURCE_ENTITY_CONFIG[sourceEntityType];
    const binding = await this.findBinding(sourceEntityType, context.source.id, slotKey, manager);
    if (!binding) {
      throw new Error(`Expected binding for ${sourceEntityType}:${slotKey}:${context.source.id}`);
    }
    if (!binding.hidden_from_entity_knowledge) {
      throw new Error(`Binding for ${sourceEntityType}:${slotKey}:${context.source.id} must stay hidden from entity knowledge`);
    }

    const documentRows = await manager.query<Array<{
      id: string;
      title: string;
      status: string;
      folder_id: string;
      library_id: string;
      document_type_id: string;
      template_document_id: string | null;
      content_markdown: string | null;
      revision: number;
      current_version_number: number;
      relation_count: number;
      owning_relation_count: number;
    }>>(
      `SELECT d.id,
              d.title,
              d.status,
              d.folder_id,
              d.library_id,
              d.document_type_id,
              d.template_document_id,
              d.content_markdown,
              d.revision,
              d.current_version_number,
              (
                SELECT COUNT(*)::int
                FROM ${config.relationTable} rel
                WHERE rel.document_id = d.id
                  AND rel.tenant_id = d.tenant_id
              ) AS relation_count,
              (
                SELECT COUNT(*)::int
                FROM ${config.relationTable} rel
                WHERE rel.document_id = d.id
                  AND rel.${config.relationIdColumn} = $2
                  AND rel.tenant_id = d.tenant_id
              ) AS owning_relation_count
       FROM documents d
       WHERE d.id = $1
         AND d.tenant_id = app_current_tenant()
       LIMIT 1`,
      [binding.document_id, context.source.id],
    );
    if (documentRows.length !== 1) {
      throw new Error(`Managed document ${binding.document_id} not found for ${sourceEntityType}:${slotKey}:${context.source.id}`);
    }

    const document = documentRows[0];
    const expectedTitle = this.formatManagedTitle(sourceEntityType, context.source, slotKey);
    if (document.title !== expectedTitle) {
      throw new Error(`Managed document title mismatch for ${sourceEntityType}:${slotKey}:${context.source.id}`);
    }
    if (document.status !== 'published') {
      throw new Error(`Managed document status must be published for ${sourceEntityType}:${slotKey}:${context.source.id}`);
    }
    if (document.folder_id !== slotSetting.folder_id || document.library_id !== slotSetting.library_id) {
      throw new Error(`Managed document folder/library mismatch for ${sourceEntityType}:${slotKey}:${context.source.id}`);
    }
    if (document.document_type_id !== slotSetting.document_type_id) {
      throw new Error(`Managed document type mismatch for ${sourceEntityType}:${slotKey}:${context.source.id}`);
    }
    if (String(document.template_document_id || '') !== String(slotSetting.template_document_id || '')) {
      throw new Error(`Managed document template mismatch for ${sourceEntityType}:${slotKey}:${context.source.id}`);
    }
    if (Number(document.relation_count || 0) !== 1 || Number(document.owning_relation_count || 0) !== 1) {
      throw new Error(`Managed document owning relation mismatch for ${sourceEntityType}:${slotKey}:${context.source.id}`);
    }
    if (Number(document.revision || 0) < 1 || Number(document.current_version_number || 0) < 1) {
      throw new Error(`Managed document version counters must be at least 1 for ${sourceEntityType}:${slotKey}:${context.source.id}`);
    }

    if (context.ownerUserId) {
      const contributorRows = await manager.query<Array<{ user_id: string; is_primary: boolean }>>(
        `SELECT user_id,
                is_primary
         FROM document_contributors
         WHERE tenant_id = app_current_tenant()
           AND document_id = $1
           AND role = 'owner'`,
        [document.id],
      );
      const matchingOwner = contributorRows.find(
        (row) => row.user_id === context.ownerUserId && !!row.is_primary,
      );
      if (!matchingOwner) {
        throw new Error(`Managed document owner contributor mismatch for ${sourceEntityType}:${slotKey}:${context.source.id}`);
      }
    }

    const recovered = await this.loadRecoveredSlotContent(sourceEntityType, context.source.id, slotKey, manager);
    const normalizedDocumentContent = normalizeMarkdownRichText(document.content_markdown, {
      fieldName: 'content_markdown',
    }) || '';
    await this.assertRecoveredInlineImagesMatchDocument(
      sourceEntityType,
      context.source.id,
      slotKey,
      context.tenantSlug,
      recovered.content,
      document.id,
      normalizedDocumentContent,
      manager,
      { includeLegacyAttachmentRefs: recovered.source === 'legacy' },
    );
  }

  async verifySourceEntity(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    opts?: { manager?: EntityManager },
  ): Promise<void> {
    const manager = this.getManager(opts);
    const context = await this.loadSourceRecoveryContext(sourceEntityType, sourceEntityId, manager);
    for (const definition of this.getSlotDefinitionsForSource(sourceEntityType)) {
      await this.verifySourceSlotState(sourceEntityType, context, definition.slotKey, manager);
    }
  }

  private async verifySourceSlotMigration(
    sourceEntityType: SourceScopedEntityType,
    source: SourceDescriptor,
    slotKey: IntegratedDocumentSlotKey,
    legacyContent: string | null | undefined,
    tenantSlug: string,
    expectedOwnerUserId: string | null,
    manager: EntityManager,
  ): Promise<void> {
    const slotSetting = await this.getSlotSetting(sourceEntityType, slotKey, manager);
    const config = SOURCE_ENTITY_CONFIG[sourceEntityType];
    const bindingRows = await manager.query<Array<{
      document_id: string;
      hidden_from_entity_knowledge: boolean;
    }>>(
      `SELECT document_id,
              hidden_from_entity_knowledge
       FROM integrated_document_bindings
       WHERE tenant_id = app_current_tenant()
         AND source_entity_type = $1
         AND source_entity_id = $2
         AND slot_key = $3`,
      [sourceEntityType, source.id, slotKey],
    );
    if (bindingRows.length !== 1) {
      throw new Error(`Expected exactly one binding for ${sourceEntityType}:${slotKey}:${source.id}, found ${bindingRows.length}`);
    }
    if (!bindingRows[0].hidden_from_entity_knowledge) {
      throw new Error(`Binding for ${sourceEntityType}:${slotKey}:${source.id} must stay hidden from entity knowledge`);
    }

    const documentRows = await manager.query<Array<{
      id: string;
      title: string;
      status: string;
      folder_id: string;
      library_id: string;
      document_type_id: string;
      template_document_id: string | null;
      content_markdown: string | null;
      revision: number;
      current_version_number: number;
      relation_count: number;
      owning_relation_count: number;
    }>>(
      `SELECT d.id,
              d.title,
              d.status,
              d.folder_id,
              d.library_id,
              d.document_type_id,
              d.template_document_id,
              d.content_markdown,
              d.revision,
              d.current_version_number,
              (
                SELECT COUNT(*)::int
                FROM ${config.relationTable} rel
                WHERE rel.document_id = d.id
                  AND rel.tenant_id = d.tenant_id
              ) AS relation_count,
              (
                SELECT COUNT(*)::int
                FROM ${config.relationTable} rel
                WHERE rel.document_id = d.id
                  AND rel.${config.relationIdColumn} = $2
                  AND rel.tenant_id = d.tenant_id
              ) AS owning_relation_count
       FROM documents d
       WHERE d.id = $1
         AND d.tenant_id = app_current_tenant()
       LIMIT 1`,
      [bindingRows[0].document_id, source.id],
    );
    if (documentRows.length !== 1) {
      throw new Error(`Managed document ${bindingRows[0].document_id} not found for ${sourceEntityType}:${slotKey}:${source.id}`);
    }

    const document = documentRows[0];
    const expectedTitle = this.formatManagedTitle(sourceEntityType, source, slotKey);
    if (document.title !== expectedTitle) {
      throw new Error(`Managed document title mismatch for ${sourceEntityType}:${slotKey}:${source.id}`);
    }
    if (document.status !== 'published') {
      throw new Error(`Managed document status must be published for ${sourceEntityType}:${slotKey}:${source.id}`);
    }
    if (document.folder_id !== slotSetting.folder_id || document.library_id !== slotSetting.library_id) {
      throw new Error(`Managed document folder/library mismatch for ${sourceEntityType}:${slotKey}:${source.id}`);
    }
    if (document.document_type_id !== slotSetting.document_type_id) {
      throw new Error(`Managed document type mismatch for ${sourceEntityType}:${slotKey}:${source.id}`);
    }
    if (String(document.template_document_id || '') !== String(slotSetting.template_document_id || '')) {
      throw new Error(`Managed document template mismatch for ${sourceEntityType}:${slotKey}:${source.id}`);
    }
    if (Number(document.relation_count || 0) !== 1 || Number(document.owning_relation_count || 0) !== 1) {
      throw new Error(`Managed document owning relation mismatch for ${sourceEntityType}:${slotKey}:${source.id}`);
    }
    if (Number(document.revision || 0) !== 1 || Number(document.current_version_number || 0) !== 1) {
      throw new Error(`Managed document version counters must be 1 for ${sourceEntityType}:${slotKey}:${source.id}`);
    }

    const versionRows = await manager.query<Array<{
      version_number: number;
      change_note: string | null;
      created_by: string | null;
    }>>(
      `SELECT version_number,
              change_note,
              created_by
       FROM document_versions
       WHERE document_id = $1
       ORDER BY version_number ASC`,
      [document.id],
    );
    if (versionRows.length !== 1 || Number(versionRows[0].version_number || 0) !== 1) {
      throw new Error(`Managed document must have exactly one initial version for ${sourceEntityType}:${slotKey}:${source.id}`);
    }
    if ((versionRows[0].change_note || null) !== this.getImportChangeNote(sourceEntityType)) {
      throw new Error(`Managed document change note mismatch for ${sourceEntityType}:${slotKey}:${source.id}`);
    }
    if (this.normalizeOptionalUserId(versionRows[0].created_by) !== this.normalizeOptionalUserId(expectedOwnerUserId)) {
      throw new Error(`Managed document version author mismatch for ${sourceEntityType}:${slotKey}:${source.id}`);
    }

    if (expectedOwnerUserId) {
      const contributorRows = await manager.query<Array<{ user_id: string; is_primary: boolean }>>(
        `SELECT user_id,
                is_primary
         FROM document_contributors
         WHERE tenant_id = app_current_tenant()
           AND document_id = $1
           AND role = 'owner'`,
        [document.id],
      );
      const matchingOwner = contributorRows.find((row) => row.user_id === expectedOwnerUserId && !!row.is_primary);
      if (!matchingOwner) {
        throw new Error(`Managed document owner contributor mismatch for ${sourceEntityType}:${slotKey}:${source.id}`);
      }
    }

    const preparedLegacyContent = this.prepareRecoveredContent(legacyContent);
    const normalizedDocumentContent = normalizeMarkdownRichText(document.content_markdown, {
      fieldName: 'content_markdown',
    }) || '';
    await this.assertRecoveredInlineImagesMatchDocument(
      sourceEntityType,
      source.id,
      slotKey,
      tenantSlug,
      preparedLegacyContent,
      document.id,
      normalizedDocumentContent,
      manager,
      { includeLegacyAttachmentRefs: true },
    );
  }

  async verifyRequestRow(
    row: RequestBackfillRow,
    tenantSlug: string,
    opts?: { manager?: EntityManager },
  ): Promise<void> {
    const manager = this.getManager(opts);
    const source: SourceDescriptor = {
      id: row.id,
      tenant_id: row.tenant_id,
      item_number: row.item_number,
      name: row.name,
    };
    const ownerUserId = this.resolvePreferredOwnerUserId('requests', row);

    await this.verifySourceSlotMigration(
      'requests',
      source,
      'purpose',
      row.purpose,
      tenantSlug,
      ownerUserId,
      manager,
    );
    await this.verifySourceSlotMigration(
      'requests',
      source,
      'risks_mitigations',
      row.risks,
      tenantSlug,
      ownerUserId,
      manager,
    );
  }

  async verifyProjectRow(
    row: ProjectBackfillRow,
    tenantSlug: string,
    opts?: { manager?: EntityManager },
  ): Promise<void> {
    const manager = this.getManager(opts);
    const source: SourceDescriptor = {
      id: row.id,
      tenant_id: row.tenant_id,
      item_number: row.item_number,
      name: row.name,
    };
    const ownerUserId = this.resolvePreferredOwnerUserId('projects', row);

    await this.verifySourceSlotMigration(
      'projects',
      source,
      'purpose',
      row.purpose,
      tenantSlug,
      ownerUserId,
      manager,
    );
  }

  async deleteForEntity(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    userId: string | null | undefined,
    opts?: { manager?: EntityManager },
  ): Promise<number> {
    const manager = this.getManager(opts);
    const bindings = await manager.getRepository(IntegratedDocumentBinding).find({
      where: {
        source_entity_type: sourceEntityType,
        source_entity_id: sourceEntityId,
      } as any,
      order: { created_at: 'ASC' as const },
    });

    for (const binding of bindings) {
      await this.knowledge.deleteManagedDocument(binding.document_id, userId || null, { manager });
    }

    return bindings.length;
  }

  async getBySource(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: string,
    userId: string | null | undefined,
    opts?: { manager?: EntityManager },
  ) {
    const manager = this.getManager(opts);
    const normalizedUserId = this.normalizeUserId(userId);
    const documentId = await this.resolveManagedDocumentId(
      sourceEntityType,
      sourceEntityId,
      slotKey,
      'read',
      normalizedUserId,
      manager,
    );
    return this.knowledge.get(documentId, { manager });
  }

  async acquireLockBySource(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: string,
    userId: string | null | undefined,
    opts?: { manager?: EntityManager },
  ) {
    const manager = this.getManager(opts);
    const normalizedUserId = this.normalizeUserId(userId);
    const managedSlotKey = slotKey as IntegratedDocumentSlotKey;
    const documentId = await this.resolveManagedDocumentId(
      sourceEntityType,
      sourceEntityId,
      managedSlotKey,
      'edit',
      normalizedUserId,
      manager,
    );
    return this.knowledge.acquireLock(documentId, normalizedUserId, { manager });
  }

  async heartbeatLockBySource(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: string,
    userId: string | null | undefined,
    lockToken: string | null | undefined,
    opts?: { manager?: EntityManager },
  ) {
    const manager = this.getManager(opts);
    const normalizedUserId = this.normalizeUserId(userId);
    const managedSlotKey = slotKey as IntegratedDocumentSlotKey;
    const documentId = await this.resolveManagedDocumentId(
      sourceEntityType,
      sourceEntityId,
      managedSlotKey,
      'edit',
      normalizedUserId,
      manager,
    );
    return this.knowledge.heartbeatLock(documentId, normalizedUserId, lockToken, { manager });
  }

  async releaseLockBySource(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: string,
    userId: string | null | undefined,
    lockToken: string | null | undefined,
    opts?: { manager?: EntityManager },
  ) {
    const manager = this.getManager(opts);
    const normalizedUserId = this.normalizeUserId(userId);
    const managedSlotKey = slotKey as IntegratedDocumentSlotKey;
    const documentId = await this.resolveManagedDocumentId(
      sourceEntityType,
      sourceEntityId,
      managedSlotKey,
      'edit',
      normalizedUserId,
      manager,
    );
    return this.knowledge.releaseLock(documentId, normalizedUserId, lockToken, { manager });
  }

  async updateBySource(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: string,
    body: any,
    userId: string | null | undefined,
    lockToken: string | null | undefined,
    opts?: { manager?: EntityManager },
  ) {
    const manager = this.getManager(opts);
    const normalizedUserId = this.normalizeUserId(userId);
    const documentId = await this.resolveManagedDocumentId(
      sourceEntityType,
      sourceEntityId,
      slotKey,
      'edit',
      normalizedUserId,
      manager,
    );

    const existing = await this.getDocumentOrThrow(documentId, manager);
    const nextContent = body?.content_markdown === undefined
      ? existing.content_markdown
      : (normalizeMarkdownRichText(body?.content_markdown, { fieldName: 'content_markdown' }) || '');

    const result = await this.knowledge.update(
      documentId,
      {
        content_markdown: body?.content_markdown,
        revision: body?.revision,
        save_mode: body?.save_mode,
        change_note: body?.change_note,
      },
      normalizedUserId,
      lockToken,
      { manager },
    );

    if (
      body?.save_mode !== 'autosave'
      && nextContent !== existing.content_markdown
    ) {
      const sourceRows = await manager.query<Array<{ tenant_id: string }>>(
        `SELECT tenant_id
         FROM ${SOURCE_ENTITY_CONFIG[sourceEntityType].sourceTable}
         WHERE id = $1
         LIMIT 1`,
        [sourceEntityId],
      );
      if (sourceRows.length > 0) {
        await this.logSourceSemanticActivity(
          sourceEntityType,
          sourceEntityId,
          slotKey as IntegratedDocumentSlotKey,
          sourceRows[0].tenant_id,
          normalizedUserId,
          manager,
        );
      }
    }

    return result;
  }

  async uploadInlineAttachmentBySource(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: string,
    file: Express.Multer.File,
    userId: string | null | undefined,
    opts?: { manager?: EntityManager },
  ) {
    const manager = this.getManager(opts);
    const normalizedUserId = this.normalizeUserId(userId);
    const documentId = await this.resolveManagedDocumentId(
      sourceEntityType,
      sourceEntityId,
      slotKey,
      'edit',
      normalizedUserId,
      manager,
    );
    return this.knowledge.uploadAttachment(documentId, file, normalizedUserId, {
      manager,
      sourceField: 'content_markdown',
    });
  }

  async listVersionsBySource(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: string,
    userId: string | null | undefined,
    opts?: { manager?: EntityManager },
  ) {
    const manager = this.getManager(opts);
    const normalizedUserId = this.normalizeUserId(userId);
    const documentId = await this.resolveManagedDocumentId(
      sourceEntityType,
      sourceEntityId,
      slotKey,
      'read',
      normalizedUserId,
      manager,
    );
    return this.knowledge.listVersions(documentId, { manager });
  }

  async revertBySource(
    sourceEntityType: SourceScopedEntityType,
    sourceEntityId: string,
    slotKey: string,
    versionNumber: number,
    userId: string | null | undefined,
    lockToken: string | null | undefined,
    opts?: { manager?: EntityManager },
  ) {
    const manager = this.getManager(opts);
    const normalizedUserId = this.normalizeUserId(userId);
    const managedSlotKey = slotKey as IntegratedDocumentSlotKey;
    const documentId = await this.resolveManagedDocumentId(
      sourceEntityType,
      sourceEntityId,
      managedSlotKey,
      'edit',
      normalizedUserId,
      manager,
    );
    const result = await this.knowledge.revert(documentId, versionNumber, normalizedUserId, lockToken, { manager });
    const sourceRows = await manager.query<Array<{ tenant_id: string }>>(
      `SELECT tenant_id
       FROM ${SOURCE_ENTITY_CONFIG[sourceEntityType].sourceTable}
       WHERE id = $1
       LIMIT 1`,
      [sourceEntityId],
    );
    if (sourceRows.length > 0) {
      await this.logSourceSemanticActivity(
        sourceEntityType,
        sourceEntityId,
        managedSlotKey,
        sourceRows[0].tenant_id,
        normalizedUserId,
        manager,
      );
    }
    return result;
  }
}
