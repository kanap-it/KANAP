import { markdownToSearchText } from '../common/markdown-search-text';

/**
 * Standalone provisioning primitive for the `incidents:review` integrated document.
 *
 * Deliberately free of Nest, TypeORM entities and `IntegratedDocumentsService`: the
 * `1853490000000-incident-review-document` migration runs it through its QueryRunner
 * on a schema that still carries the four legacy narrative columns. Everything it
 * needs is passed explicitly, so a later change to the shared constants or to the
 * service cannot retroactively change what the migration wrote.
 */

export type SqlExecutor = {
  query<T = any>(query: string, parameters?: any[]): Promise<T[]>;
};

export const INCIDENT_REVIEW_SOURCE_ENTITY_TYPE = 'incidents';
export const INCIDENT_REVIEW_SLOT_KEY = 'review';

/** Legacy plain-text columns folded into the review document, in rendering order. */
export const INCIDENT_REVIEW_LEGACY_SECTIONS = [
  { column: 'impact', heading: 'Impact' },
  { column: 'root_cause', heading: 'Root cause' },
  { column: 'corrective_actions', heading: 'Corrective actions' },
  { column: 'lessons_learned', heading: 'Lessons learned' },
] as const;

export type IncidentReviewLegacyFields = {
  impact?: string | null;
  root_cause?: string | null;
  corrective_actions?: string | null;
  lessons_learned?: string | null;
};

const MARKDOWN_INLINE_SPECIALS = /([\\`*_[\]|~])/g;
const LINE_START_BLOCK_MARKER = /^(\s*)([#+=-])/;
const LINE_START_ORDERED_MARKER = /^(\s*)(\d+)([.)])/;
/** Bare URLs, which the renderer autolinks; trailing punctuation is left outside. */
const BARE_URL = /(?:https?:\/\/|www\.)[^\s<>"']*[^\s<>"'.,:;!?)\]}]/gi;

/**
 * Renders a legacy plain-text value as Markdown that displays exactly what was typed.
 *
 * `&`, `<` and `>` become HTML entities so literal HTML can never reach the renderer
 * (and so `normalizeMarkdownRichText` never rejects the migrated body); the remaining
 * inline and line-start Markdown constructs are backslash-escaped, so an old
 * `![alt](url)` stays text instead of turning into an image. Single newlines become
 * hard breaks because both the app renderer and the pandoc GFM export otherwise fold
 * them into a space; two trailing spaces are used rather than a trailing backslash,
 * which GFM swallows into a bare URL sitting at the end of the line.
 *
 * A bare URL is exempt from the inline escaping: `http://host/a_b` would
 * otherwise become `http://host/a\_b`, and the backslash ends up inside the
 * autolinked destination. Its `& < >` are still turned into entities, which the
 * renderer decodes back when it builds the link.
 *
 * Known limitation: a line indented by four or more spaces still renders as an
 * indented code block. The text is preserved verbatim, only its styling changes.
 */
export function escapePlainTextAsMarkdown(value: string | null | undefined): string {
  const text = String(value ?? '').replace(/\r\n?/g, '\n');
  if (!text) return '';

  const escapeHtml = (part: string): string => part
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = text.split('\n').map((line) => {
    let escaped = '';
    let cursor = 0;
    BARE_URL.lastIndex = 0;
    for (let match = BARE_URL.exec(line); match; match = BARE_URL.exec(line)) {
      escaped += escapeHtml(line.slice(cursor, match.index)).replace(MARKDOWN_INLINE_SPECIALS, '\\$1');
      escaped += escapeHtml(match[0]);
      cursor = match.index + match[0].length;
    }
    escaped += escapeHtml(line.slice(cursor)).replace(MARKDOWN_INLINE_SPECIALS, '\\$1');
    return escaped
      .replace(LINE_START_BLOCK_MARKER, '$1\\$2')
      .replace(LINE_START_ORDERED_MARKER, '$1$2\\$3');
  });

  return lines
    .map((line, index) => {
      const next = lines[index + 1];
      const needsHardBreak = next !== undefined && line.trim() !== '' && next.trim() !== '';
      return needsHardBreak ? `${line}  ` : line;
    })
    .join('\n');
}

function hasContent(value: string | null | undefined): boolean {
  return String(value ?? '').trim().length > 0;
}

export function hasIncidentReviewLegacyContent(fields: IncidentReviewLegacyFields): boolean {
  return INCIDENT_REVIEW_LEGACY_SECTIONS.some((section) => hasContent(fields[section.column]));
}

/**
 * The five system headings, with the four legacy narratives escaped under theirs and
 * Detailed description left empty (the short `incidents.description` column stays
 * where it is).
 * Returns null when nothing was captured, so the caller can fall back to the template.
 */
export function buildIncidentReviewMarkdownFromLegacyFields(
  fields: IncidentReviewLegacyFields,
): string | null {
  if (!hasIncidentReviewLegacyContent(fields)) {
    return null;
  }

  const blocks: string[] = ['## Detailed description', ''];
  for (const section of INCIDENT_REVIEW_LEGACY_SECTIONS) {
    blocks.push(`## ${section.heading}`, '');
    if (hasContent(fields[section.column])) {
      blocks.push(escapePlainTextAsMarkdown(fields[section.column]), '');
    }
  }
  return blocks.join('\n').trim();
}

export type IncidentReviewSlotDefinition = {
  /** Managed title suffix, e.g. `INC-4 - Router outage - Incident review`. */
  displayName: string;
  /** Version note used when legacy narratives were folded into the new document. */
  importChangeNote: string;
  /** Version note used when the document starts from the template. */
  initialChangeNote: string;
  /** Journal entry content added to incidents already closed or cancelled. */
  closedJournalContent: string;
};

export const INCIDENT_REVIEW_MIGRATION_SLOT: IncidentReviewSlotDefinition = {
  displayName: 'Incident review',
  importChangeNote: 'Imported from legacy incident fields',
  initialChangeNote: 'Initial version',
  closedJournalContent: 'Incident review imported',
};

type SlotSettingRow = {
  folder_id: string;
  library_id: string;
  document_type_id: string;
  template_document_id: string | null;
  template_content_markdown: string | null;
};

type IncidentRow = {
  id: string;
  item_number: number;
  title: string;
  status: string;
  owner_user_id: string | null;
  reporter_user_id: string | null;
  created_by: string | null;
  impact?: string | null;
  root_cause?: string | null;
  corrective_actions?: string | null;
  lessons_learned?: string | null;
};

async function legacyColumnsPresent(executor: SqlExecutor): Promise<string[]> {
  const rows = await executor.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'incidents'
       AND column_name = ANY($1::text[])`,
    [INCIDENT_REVIEW_LEGACY_SECTIONS.map((section) => section.column)],
  );
  return rows.map((row) => String(row.column_name));
}

async function allocateDocumentItemNumber(executor: SqlExecutor, tenantId: string): Promise<number> {
  const rows = await executor.query<{ item_number: number }>(
    `INSERT INTO item_sequences (tenant_id, entity_type, next_val)
     VALUES ($1, 'document', 2)
     ON CONFLICT (tenant_id, entity_type)
     DO UPDATE SET next_val = item_sequences.next_val + 1
     RETURNING next_val - 1 AS item_number`,
    [tenantId],
  );
  return Number(rows[0].item_number);
}

/**
 * Creates the missing `incidents:review` documents of one tenant.
 *
 * Idempotent: an incident that already has a binding is skipped, so a re-run never
 * duplicates or overwrites a review. The caller must have set `app.current_tenant`
 * for this tenant (this function sets it too, transaction-locally).
 */
export async function provisionIncidentReviewDocuments(
  executor: SqlExecutor,
  tenantId: string,
  slot: IncidentReviewSlotDefinition = INCIDENT_REVIEW_MIGRATION_SLOT,
): Promise<{ created: number; skipped: number }> {
  await executor.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);

  const settingRows = await executor.query<SlotSettingRow>(
    `SELECT s.folder_id::text AS folder_id,
            f.library_id::text AS library_id,
            s.document_type_id::text AS document_type_id,
            s.template_document_id::text AS template_document_id,
            td.content_markdown AS template_content_markdown
     FROM integrated_document_slot_settings s
     JOIN document_folders f ON f.id = s.folder_id AND f.tenant_id = s.tenant_id
     LEFT JOIN documents td ON td.id = s.template_document_id AND td.tenant_id = s.tenant_id
     WHERE s.tenant_id = app_current_tenant()
       AND s.source_entity_type = $1
       AND s.slot_key = $2
       AND s.is_active = true
     LIMIT 1`,
    [INCIDENT_REVIEW_SOURCE_ENTITY_TYPE, INCIDENT_REVIEW_SLOT_KEY],
  );
  if (!settingRows.length) {
    throw new Error(
      `Integrated document slot setting missing for ${INCIDENT_REVIEW_SOURCE_ENTITY_TYPE}:${INCIDENT_REVIEW_SLOT_KEY} in tenant ${tenantId}`,
    );
  }
  const setting = settingRows[0];
  const templateContent = String(setting.template_content_markdown ?? '').trim();

  const legacyColumns = await legacyColumnsPresent(executor);
  const legacySelect = legacyColumns.length
    ? `, ${legacyColumns.map((column) => `i.${column}`).join(', ')}`
    : '';

  const incidents = await executor.query<IncidentRow>(
    `SELECT i.id::text AS id,
            i.item_number,
            i.title,
            i.status,
            i.owner_user_id::text AS owner_user_id,
            i.reporter_user_id::text AS reporter_user_id,
            i.created_by::text AS created_by
            ${legacySelect}
     FROM incidents i
     WHERE i.tenant_id = app_current_tenant()
       AND NOT EXISTS (
         SELECT 1
         FROM integrated_document_bindings b
         WHERE b.tenant_id = i.tenant_id
           AND b.source_entity_type = $1
           AND b.source_entity_id = i.id
           AND b.slot_key = $2
       )
     ORDER BY i.item_number ASC`,
    [INCIDENT_REVIEW_SOURCE_ENTITY_TYPE, INCIDENT_REVIEW_SLOT_KEY],
  );

  const totalRows = await executor.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM incidents WHERE tenant_id = app_current_tenant()`,
  );
  const total = Number(totalRows[0]?.count || 0);

  let created = 0;
  for (const incident of incidents) {
    const legacyMarkdown = buildIncidentReviewMarkdownFromLegacyFields(incident);
    const contentMarkdown = legacyMarkdown ?? templateContent;
    const contentPlain = markdownToSearchText(contentMarkdown);
    const changeNote = legacyMarkdown ? slot.importChangeNote : slot.initialChangeNote;
    const title = `INC-${incident.item_number} - ${incident.title} - ${slot.displayName}`;
    const itemNumber = await allocateDocumentItemNumber(executor, tenantId);

    const documentRows = await executor.query<{ id: string }>(
      `INSERT INTO documents (
         tenant_id, item_number, title, summary, content_markdown, content_plain,
         folder_id, library_id, document_type_id, template_document_id,
         status, revision, current_version_number, published_at, created_by, updated_by
       )
       VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, 'published', 1, 1, now(), NULL, NULL)
       RETURNING id::text AS id`,
      [
        tenantId,
        itemNumber,
        title,
        contentMarkdown,
        contentPlain,
        setting.folder_id,
        setting.library_id,
        setting.document_type_id,
        setting.template_document_id,
      ],
    );
    const documentId = String(documentRows[0].id);

    await executor.query(
      `INSERT INTO document_versions (
         tenant_id, document_id, version_number, title, summary,
         content_markdown, content_plain, change_note, created_by
       )
       VALUES ($1, $2, 1, $3, NULL, $4, $5, $6, NULL)`,
      [tenantId, documentId, title, contentMarkdown, contentPlain, changeNote],
    );

    await executor.query(
      `INSERT INTO document_activities (tenant_id, document_id, author_id, type, content, changed_fields)
       VALUES ($1, $2, NULL, 'change', $3, $4::jsonb)`,
      [
        tenantId,
        documentId,
        changeNote,
        JSON.stringify({ title: [null, title], status: [null, 'published'] }),
      ],
    );

    await executor.query(
      `INSERT INTO integrated_document_bindings (
         tenant_id, source_entity_type, source_entity_id, slot_key, document_id, hidden_from_entity_knowledge
       )
       VALUES ($1, $2, $3, $4, $5, true)`,
      [
        tenantId,
        INCIDENT_REVIEW_SOURCE_ENTITY_TYPE,
        incident.id,
        INCIDENT_REVIEW_SLOT_KEY,
        documentId,
      ],
    );

    await executor.query(
      `INSERT INTO document_incidents (tenant_id, document_id, incident_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (document_id, incident_id) DO NOTHING`,
      [tenantId, documentId, incident.id],
    );

    const ownerUserId = [incident.owner_user_id, incident.reporter_user_id, incident.created_by]
      .map((value) => String(value ?? '').trim())
      .find((value) => value.length > 0) || null;
    if (ownerUserId) {
      await executor.query(
        `INSERT INTO document_contributors (tenant_id, document_id, user_id, role, is_primary)
         SELECT $1, $2, u.id, 'owner', true
         FROM users u
         WHERE u.id = $3 AND u.tenant_id = app_current_tenant()
         ON CONFLICT (document_id, user_id, role) DO UPDATE SET is_primary = EXCLUDED.is_primary`,
        [tenantId, documentId, ownerUserId],
      );
    }

    // Already closed or cancelled: the imported version is the record of what the
    // review held at closure. No closure date is invented, only a journal reference.
    if (incident.status === 'closed' || incident.status === 'cancelled') {
      await executor.query(
        `INSERT INTO incident_entries (tenant_id, incident_id, kind, content, changed_fields, author_id)
         VALUES ($1, $2, 'system', $3, $4::jsonb, NULL)`,
        [
          tenantId,
          incident.id,
          slot.closedJournalContent,
          JSON.stringify({
            review_version: {
              from: null,
              to: { document_id: documentId, version_number: 1, revision: 1 },
            },
          }),
        ],
      );
    }

    created += 1;
  }

  return { created, skipped: Math.max(total - created, 0) };
}
