import {
  CsvEntityConfig,
  CsvFieldType,
  CsvImportContext,
} from '../common/csv';
import { allocateItemNumbers } from '../common/item-number.service';
import { DEFAULT_INCIDENT_CATEGORIES } from '../it-ops-settings/it-ops-settings.service';
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES } from './incident.entity';

/**
 * CSV configuration for the incident register.
 *
 * Field order matches IncidentWorkspacePage.tsx (overview + properties drawer):
 * - Identity: ref (INC-N)
 * - Overview: title, category, severity, status
 * - Timeline: started / detected / resolved / closed
 * - People: reporter, owner
 * - Record: description, impact, root cause, corrective actions, lessons learned
 * - Source: source reference
 * - Compliance: personal data, authority notification, notified parties
 *
 * Import is a first-class path: customers arrive with an Excel register.
 * A row with a known ref updates that incident (closure lock does not apply to
 * imports), a row with a blank ref inserts and gets its INC-N allocated in bulk.
 * Timeline entries are never imported; each inserted row gets one 'system' entry.
 */

const REF_INPUT_RE = /^(?:INC[-\s]?)?(\d+)$/i;

const IMPORT_ENTRY_CONTENT = 'Imported from CSV';

/** Rows inserted by the current import, marked in beforeCommit, journalled in afterCommit. */
const insertedByImport = new WeakSet<object>();

function incidentLabel(entity: any): string {
  return entity.item_number ? `INC-${entity.item_number}` : `"${entity.title ?? ''}"`;
}

/**
 * Accept an incident reference (INC-12), a bare item number, or nothing.
 * Kept in sync with the ref stripping done on the raw rows in beforeValidate,
 * which is what identity resolution matches on.
 */
function parseRef(value: string): number | null {
  const text = value.trim();
  if (text === '') return null;
  const match = REF_INPUT_RE.exec(text);
  if (!match) {
    throw new Error(
      `Invalid reference "${value}". Use the incident reference (INC-12), or leave the column empty to create a new incident.`,
    );
  }
  return Number(match[1]);
}

/**
 * Date + time entry. Accepts ISO (what the export writes: 2026-09-02T14:32:00Z),
 * a plain date, and the European formats Excel produces (02/09/2026 14:32).
 * Date-only values are read as local midnight.
 */
function parseDateTime(value: string, column: string): Date | null {
  const text = value.trim();
  if (text === '') return null;

  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoDateOnly) {
    return new Date(Number(isoDateOnly[1]), Number(isoDateOnly[2]) - 1, Number(isoDateOnly[3]));
  }

  const euro = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(text);
  if (euro) {
    return new Date(
      Number(euro[3]), Number(euro[2]) - 1, Number(euro[1]),
      Number(euro[4] || 0), Number(euro[5] || 0), Number(euro[6] || 0),
    );
  }

  const parsed = new Date(text);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date in ${column}: "${value}". Use 2026-09-02, 2026-09-02T14:32:00Z or 02/09/2026 14:32.`);
  }
  return parsed;
}

/** Codes and labels both accepted: "In progress", "in progress" and "in_progress" all mean in_progress. */
function parseCode(value: string, valid: readonly string[], column: string): string {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!valid.includes(normalized)) {
    throw new Error(`Invalid ${column}: "${value}". Valid values: ${valid.join(', ')}`);
  }
  return normalized;
}

/**
 * Users are preloaded by email; fall back to "First Last" (the names the app
 * shows everywhere) using the same cache, so both spellings import.
 */
const userNameIndexes = new WeakMap<Map<string, any>, Map<string, string>>();

function resolveUser(value: string, column: string, context: CsvImportContext): string | null {
  const text = value.trim();
  if (text === '') return null;

  const users = context.resolverCache.get('users');
  if (!users) return null;

  const byEmail = users.get(text.toLowerCase());
  if (byEmail) return byEmail.id;

  let byName = userNameIndexes.get(users);
  if (!byName) {
    byName = new Map<string, string>();
    for (const user of users.values()) {
      const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim().toLowerCase();
      if (name && !byName.has(name)) byName.set(name, user.id);
    }
    userNameIndexes.set(users, byName);
  }

  const resolved = byName.get(text.toLowerCase().replace(/\s+/g, ' '));
  if (!resolved) {
    throw new Error(`User not found for ${column}: "${value}". Use the account email or the exact "First Last" name.`);
  }
  return resolved;
}

function dateTimeField(csvColumn: string, label: string, group: string) {
  return {
    csvColumn,
    entityProperty: csvColumn,
    type: CsvFieldType.STRING,
    required: false,
    defaultExport: true,
    label,
    group,
    importTransformFn: (value: string) => parseDateTime(value, csvColumn),
  };
}

function textField(csvColumn: string, label: string, group: string) {
  return {
    csvColumn,
    entityProperty: csvColumn,
    type: CsvFieldType.STRING,
    required: false,
    defaultExport: true,
    label,
    group,
  };
}

export const incidentCsvConfig: CsvEntityConfig = {
  entityName: 'incident',
  tableName: 'incidents',
  displayName: 'Incidents',
  // INC-N is the register's identity; the export writes it, the import matches on it.
  upsertKey: ['item_number'],
  fields: [
    // === IDENTITY ===
    {
      csvColumn: 'ref',
      entityProperty: 'item_number',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Reference',
      group: 'Identity',
      importTransformFn: (value: string) => parseRef(value),
    },

    // === OVERVIEW ===
    {
      csvColumn: 'title',
      entityProperty: 'title',
      type: CsvFieldType.STRING,
      required: true,
      defaultExport: true,
      label: 'Title',
      group: 'Overview',
    },
    {
      csvColumn: 'category',
      entityProperty: 'category',
      // Settings-backed (incidentCategories): codes and labels are resolved in
      // beforeCommit, so no hard-coded enum gate here (same pattern as asset.kind).
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Category',
      group: 'Overview',
    },
    {
      csvColumn: 'severity',
      entityProperty: 'severity',
      type: CsvFieldType.STRING,
      enumValues: [...INCIDENT_SEVERITIES],
      required: true,
      defaultExport: true,
      label: 'Severity',
      group: 'Overview',
      importTransformFn: (value: string) => parseCode(value, INCIDENT_SEVERITIES, 'severity'),
    },
    {
      csvColumn: 'status',
      entityProperty: 'status',
      type: CsvFieldType.STRING,
      enumValues: [...INCIDENT_STATUSES],
      required: false,
      defaultExport: true,
      label: 'Status',
      group: 'Overview',
      importTransformFn: (value: string) => parseCode(value, INCIDENT_STATUSES, 'status'),
    },

    // === TIMELINE ===
    dateTimeField('started_at', 'Started', 'Timeline'),
    dateTimeField('detected_at', 'Detected', 'Timeline'),
    dateTimeField('resolved_at', 'Resolved', 'Timeline'),
    dateTimeField('closed_at', 'Closed', 'Timeline'),

    // === PEOPLE ===
    {
      csvColumn: 'reporter',
      entityProperty: 'reporter_user_id',
      type: CsvFieldType.FK_BY_EMAIL,
      fkEntity: 'users',
      fkLookupColumn: 'email',
      fkRequired: false,
      required: false,
      defaultExport: true,
      label: 'Reporter',
      group: 'People',
      importTransformFn: (value: string, _row: Record<string, string>, context: CsvImportContext) =>
        resolveUser(value, 'reporter', context),
    },
    {
      csvColumn: 'owner',
      entityProperty: 'owner_user_id',
      type: CsvFieldType.FK_BY_EMAIL,
      fkEntity: 'users',
      fkLookupColumn: 'email',
      fkRequired: false,
      required: false,
      defaultExport: true,
      label: 'Owner',
      group: 'People',
      importTransformFn: (value: string, _row: Record<string, string>, context: CsvImportContext) =>
        resolveUser(value, 'owner', context),
    },

    // === RECORD ===
    textField('description', 'Description', 'Record'),
    textField('impact', 'Impact', 'Record'),
    textField('root_cause', 'Root cause', 'Record'),
    textField('corrective_actions', 'Corrective actions', 'Record'),
    textField('lessons_learned', 'Lessons learned', 'Record'),

    // === SOURCE ===
    textField('source_ref', 'External reference', 'Source'),

    // === COMPLIANCE ===
    {
      csvColumn: 'personal_data_affected',
      entityProperty: 'personal_data_affected',
      type: CsvFieldType.BOOLEAN,
      required: false,
      defaultExport: true,
      label: 'Personal data affected',
      group: 'Compliance',
    },
    {
      csvColumn: 'authority_notification_required',
      entityProperty: 'authority_notification_required',
      type: CsvFieldType.BOOLEAN,
      required: false,
      defaultExport: true,
      label: 'Authority notification required',
      group: 'Compliance',
    },
    dateTimeField('authority_notified_at', 'Authority notified on', 'Compliance'),
    textField('notified_parties', 'Parties informed', 'Compliance'),
  ],

  /**
   * Identity resolution reads the raw cells, so INC-12 has to become 12 before
   * the existing incidents are loaded. Mutating `raw` here is what the import
   * service then matches and parses.
   */
  beforeValidate: async (rows) => {
    for (const row of rows) {
      const value = row.raw.ref;
      if (typeof value !== 'string') continue;
      const match = REF_INPUT_RE.exec(value.trim());
      if (match) row.raw.ref = match[1];
    }
  },

  /**
   * Resolve settings-backed categories, fill the NOT NULL columns and allocate
   * INC-N for every new row in one bulk sequence bump.
   */
  beforeCommit: async (entities: any[], context: CsvImportContext) => {
    const tenantRows = await context.manager.query(
      `SELECT metadata FROM tenants WHERE id = $1 LIMIT 1`,
      [context.tenantId],
    );
    // Tenants that never edited the list have nothing stored: the settings
    // service serves the defaults in that case, so the import must too.
    const storedCategories: Array<{ code: string; label: string }> | undefined =
      tenantRows[0]?.metadata?.it_ops?.incident_categories;
    const categories = storedCategories && storedCategories.length > 0 ? storedCategories : DEFAULT_INCIDENT_CATEGORIES;

    const categoryLookup = new Map<string, string>();
    for (const item of categories) {
      categoryLookup.set(item.code.toLowerCase(), item.code);
      categoryLookup.set(item.label.toLowerCase(), item.code);
    }

    for (const entity of entities) {
      if (entity.category) {
        const resolved = categoryLookup.get(String(entity.category).trim().toLowerCase());
        if (!resolved) {
          throw new Error(
            `${incidentLabel(entity)}: unknown category "${entity.category}". ` +
            `Use one of ${categories.map((c) => c.label).join(', ')}, or add it under IT settings first.`,
          );
        }
        entity.category = resolved;
      }

      // Booleans have a false default: a blank cell clears them.
      entity.personal_data_affected = entity.personal_data_affected ?? false;
      entity.authority_notification_required = entity.authority_notification_required ?? false;

      if (entity.id) {
        entity.updated_by = context.userId ?? null;
        // Columns the database refuses to clear. Blanking them in replace mode
        // would silently rewrite the record, so say so instead.
        for (const column of ['status', 'detected_at'] as const) {
          if (entity[column] == null) {
            throw new Error(
              `${incidentLabel(entity)}: "${column}" cannot be cleared. Provide a value, or import in enrich mode.`,
            );
          }
        }
      } else {
        entity.created_by = context.userId ?? null;
        entity.status = entity.status ?? 'open';
        entity.detected_at = entity.detected_at ?? new Date();
      }
    }

    // A ref that matched nothing is a typo, not a new incident: INC-N is allocated, never chosen.
    const unknownRefs = entities.filter((e) => !e.id && e.item_number).map((e) => `INC-${e.item_number}`);
    if (unknownRefs.length > 0) {
      throw new Error(
        `Unknown incident reference(s): ${unknownRefs.join(', ')}. ` +
        `Leave the ref column empty to create new incidents.`,
      );
    }

    const newEntities = entities.filter((e) => !e.item_number);
    if (newEntities.length > 0) {
      const firstNumber = await allocateItemNumbers(
        'incident', context.tenantId, newEntities.length, context.manager,
      );
      newEntities.forEach((e, i) => {
        e.item_number = firstNumber + i;
        insertedByImport.add(e);
      });
    }
  },

  /**
   * One 'system' journal entry per imported incident. The register must show
   * where a record came from; the timeline itself is never imported.
   */
  afterCommit: async (entities: any[], context: CsvImportContext) => {
    const insertedIds: string[] = [];
    for (const entity of entities) {
      if (insertedByImport.delete(entity) && entity.id) insertedIds.push(entity.id);
    }
    if (insertedIds.length === 0) return;

    await context.manager.query(
      `INSERT INTO incident_entries (tenant_id, incident_id, kind, content, author_id)
       SELECT $1, incident_id, 'system', $3, $4 FROM unnest($2::uuid[]) AS incident_id`,
      [context.tenantId, insertedIds, IMPORT_ENTRY_CONTENT, context.userId ?? null],
    );
  },
};
