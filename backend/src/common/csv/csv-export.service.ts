import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { format } from '@fast-csv/format';
import {
  ArrayStrategy,
  CsvEntityConfig,
  CsvExportContext,
  CsvExportResult,
  CsvFieldDefinition,
  CsvFieldType,
} from './csv-field.types';
import { CsvResolverService } from './csv-resolver.service';

/**
 * Export options
 */
export interface CsvExportOptions {
  /** TypeORM EntityManager */
  manager: EntityManager;
  /** Tenant ID */
  tenantId: string;
  /** Export scope: 'template' returns only headers, 'data' returns all rows */
  scope?: 'template' | 'data';
  /** Selected fields to export (by csvColumn). If not provided, uses defaultExport fields */
  fields?: string[];
  /** Export preset name to use */
  preset?: string;
}

/**
 * Service for exporting entities to CSV format.
 *
 * Features:
 * - Declarative field configuration
 * - FK resolution (user emails, entity names)
 * - Array expansion to numbered columns
 * - UTF-8 BOM for Excel compatibility
 * - Template export (headers only)
 */
@Injectable()
export class CsvExportService {
  /** UTF-8 BOM character */
  private readonly BOM = '\uFEFF';
  /** CSV delimiter */
  private readonly DELIMITER = ';';
  /** Default max items for array fields */
  private readonly DEFAULT_MAX_ITEMS = 4;

  constructor(private readonly resolver: CsvResolverService) {}

  /**
   * Export entities to CSV format.
   *
   * @param config - Entity CSV configuration
   * @param entities - Entities to export
   * @param opts - Export options
   * @returns Export result with filename, content, and metadata
   */
  async export(
    config: CsvEntityConfig,
    entities: any[],
    opts: CsvExportOptions,
  ): Promise<CsvExportResult> {
    const warnings: string[] = [];

    // Determine which fields to export
    const exportFields = this.selectExportFields(config, opts);

    // Build CSV headers from field definitions
    const headers = this.buildHeaders(exportFields);

    // Template export: return headers only
    if (opts.scope === 'template') {
      return {
        filename: `${config.entityName}_template.csv`,
        content: this.BOM + headers.join(this.DELIMITER) + '\n',
        rowCount: 0,
        warnings: [],
      };
    }

    // Preload FK resolvers
    const resolverCache = await this.resolver.preloadResolvers(
      opts.tenantId,
      exportFields,
      opts.manager,
    );

    // Build reverse lookup maps for FK fields
    const reverseLookups = this.buildReverseLookups(exportFields, resolverCache);

    // Create export context
    const context: CsvExportContext = {
      tenantId: opts.tenantId,
      manager: opts.manager,
      resolverCache,
    };

    // Process relation handlers if any
    const relationData = new Map<string, Map<string, Record<string, string>>>();
    if (config.relationHandlers) {
      for (const handler of config.relationHandlers) {
        const handlerData = new Map<string, Record<string, string>>();
        for (const entity of entities) {
          const values = await handler.exportHandler(entity, context);
          handlerData.set(entity.id, values);
        }
        relationData.set(handler.name, handlerData);
      }
    }

    // Generate CSV content
    const chunks: string[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = format({ headers, delimiter: this.DELIMITER });
      stream.on('data', (chunk) => chunks.push(chunk.toString('utf8')));
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));

      for (const entity of entities) {
        const row = this.buildRow(
          entity,
          exportFields,
          reverseLookups,
          relationData,
          context,
          warnings,
        );
        stream.write(row);
      }

      stream.end();
    });

    return {
      filename: `${config.entityName}_export.csv`,
      content: this.BOM + chunks.join(''),
      rowCount: entities.length,
      warnings,
    };
  }

  /**
   * Get field metadata for frontend display.
   */
  getFieldInfo(config: CsvEntityConfig): CsvFieldDefinition[] {
    return config.fields.filter((f) => f.exportable !== false || f.importable !== false);
  }

  /**
   * Select fields to export based on options.
   */
  private selectExportFields(
    config: CsvEntityConfig,
    opts: CsvExportOptions,
  ): CsvFieldDefinition[] {
    // For template scope, use all importable fields (so users see what they can import)
    if (opts.scope === 'template') {
      return config.fields.filter((f) => f.importable !== false);
    }

    // Filter to exportable fields
    let fields = config.fields.filter((f) => f.exportable !== false);

    // Apply preset if specified
    if (opts.preset && config.exportPresets) {
      const preset = config.exportPresets.find((p) => p.name === opts.preset);
      if (preset) {
        const presetSet = new Set(preset.fields);
        fields = fields.filter((f) => presetSet.has(f.csvColumn));
      }
    }

    // Apply explicit field selection if specified
    if (opts.fields && opts.fields.length > 0) {
      const fieldSet = new Set(opts.fields);
      fields = fields.filter((f) => fieldSet.has(f.csvColumn));
    }

    // No preset and no explicit fields: return all exportable fields (truly full export)
    return fields;
  }

  /**
   * Build CSV headers from field definitions.
   * Expands array fields with numbered columns.
   */
  private buildHeaders(fields: CsvFieldDefinition[]): string[] {
    const headers: string[] = [];
    const processedArrays = new Set<string>();

    for (const field of fields) {
      if (
        field.type === CsvFieldType.ARRAY &&
        field.arrayStrategy === ArrayStrategy.NUMBERED_COLUMNS
      ) {
        // Skip if we've already processed this array base
        const baseName = field.csvColumn.replace(/_\d+$/, '');
        if (processedArrays.has(baseName)) {
          continue;
        }
        processedArrays.add(baseName);

        // Generate numbered columns
        const maxItems = field.maxItems ?? this.DEFAULT_MAX_ITEMS;
        for (let i = 1; i <= maxItems; i++) {
          headers.push(`${baseName}_${i}`);
        }
      } else if (!field.arrayIndex) {
        // Regular field (skip array index fields, they're generated above)
        headers.push(field.csvColumn);
      }
    }

    return headers;
  }

  /**
   * Build reverse lookup maps for FK resolution.
   */
  private buildReverseLookups(
    fields: CsvFieldDefinition[],
    resolverCache: Map<string, Map<string, any>>,
  ): Map<string, Map<string, string>> {
    const lookups = new Map<string, Map<string, string>>();

    for (const field of fields) {
      if (
        (field.type === CsvFieldType.FK_BY_EMAIL ||
          field.type === CsvFieldType.FK_BY_NAME ||
          field.type === CsvFieldType.FK_BY_CODE) &&
        field.fkEntity
      ) {
        if (!lookups.has(field.fkEntity)) {
          lookups.set(
            field.fkEntity,
            this.resolver.buildReverseLookup(field.fkEntity, resolverCache),
          );
        }
      }
    }

    return lookups;
  }

  /**
   * Build a CSV row from an entity.
   */
  private buildRow(
    entity: any,
    fields: CsvFieldDefinition[],
    reverseLookups: Map<string, Map<string, string>>,
    relationData: Map<string, Map<string, Record<string, string>>>,
    context: CsvExportContext,
    warnings: string[],
  ): Record<string, string> {
    const row: Record<string, string> = {};
    const processedArrays = new Set<string>();

    for (const field of fields) {
      // Handle numbered column arrays
      if (
        field.type === CsvFieldType.ARRAY &&
        field.arrayStrategy === ArrayStrategy.NUMBERED_COLUMNS
      ) {
        const baseName = field.csvColumn.replace(/_\d+$/, '');
        if (processedArrays.has(baseName)) {
          continue;
        }
        processedArrays.add(baseName);

        this.expandArrayToColumns(entity, field, row, reverseLookups, warnings);
        continue;
      }

      // Skip array index fields (handled above)
      if (field.arrayIndex) {
        continue;
      }

      // Get field value
      const value = this.getFieldValue(entity, field, reverseLookups, relationData, context);
      row[field.csvColumn] = value;
    }

    return row;
  }

  /**
   * Expand an array field to numbered columns.
   */
  private expandArrayToColumns(
    entity: any,
    field: CsvFieldDefinition,
    row: Record<string, string>,
    reverseLookups: Map<string, Map<string, string>>,
    warnings: string[],
  ): void {
    const baseName = field.csvColumn.replace(/_\d+$/, '');
    const maxItems = field.maxItems ?? this.DEFAULT_MAX_ITEMS;
    const arrayValue = entity[field.entityProperty];

    if (!Array.isArray(arrayValue)) {
      // Fill with empty values
      for (let i = 1; i <= maxItems; i++) {
        row[`${baseName}_${i}`] = '';
      }
      return;
    }

    // Check for truncation
    if (arrayValue.length > maxItems) {
      warnings.push(
        `Row ${entity.id}: ${field.entityProperty} has ${arrayValue.length} items, truncated to ${maxItems}`,
      );
    }

    // Fill columns
    for (let i = 1; i <= maxItems; i++) {
      const idx = i - 1;
      if (idx < arrayValue.length) {
        const itemValue = arrayValue[idx];

        // Resolve FK if needed
        if (field.fkEntity && reverseLookups.has(field.fkEntity)) {
          const lookup = reverseLookups.get(field.fkEntity)!;
          row[`${baseName}_${i}`] = lookup.get(itemValue) ?? '';
        } else {
          row[`${baseName}_${i}`] = String(itemValue ?? '');
        }
      } else {
        row[`${baseName}_${i}`] = '';
      }
    }
  }

  /**
   * Get the value for a single field.
   */
  private getFieldValue(
    entity: any,
    field: CsvFieldDefinition,
    reverseLookups: Map<string, Map<string, string>>,
    relationData: Map<string, Map<string, Record<string, string>>>,
    context: CsvExportContext,
  ): string {
    // Handle computed fields
    if (field.type === CsvFieldType.COMPUTED && field.exportFn) {
      return field.exportFn(entity, context) ?? '';
    }

    // Get raw value from entity
    let rawValue = entity[field.entityProperty];

    // Handle nested paths (e.g., [0].type for ip_addresses[0].type)
    if (field.nestedPath && rawValue !== null && rawValue !== undefined) {
      rawValue = this.getNestedValue(rawValue, field.nestedPath);
    }

    // Handle null/undefined
    if (rawValue === null || rawValue === undefined) {
      return '';
    }

    // Handle FK resolution
    if (
      (field.type === CsvFieldType.FK_BY_EMAIL ||
        field.type === CsvFieldType.FK_BY_NAME ||
        field.type === CsvFieldType.FK_BY_CODE) &&
      field.fkEntity
    ) {
      const lookup = reverseLookups.get(field.fkEntity);
      if (lookup) {
        return lookup.get(String(rawValue)) ?? '';
      }
    }

    // Handle arrays (comma-separated)
    if (field.type === CsvFieldType.ARRAY && field.arrayStrategy !== ArrayStrategy.NUMBERED_COLUMNS) {
      if (Array.isArray(rawValue)) {
        return rawValue.join(', ');
      }
    }

    // Handle JSON
    if (field.type === CsvFieldType.JSON) {
      return JSON.stringify(rawValue);
    }

    // Handle dates
    if (field.type === CsvFieldType.DATE) {
      if (rawValue instanceof Date) {
        return rawValue.toISOString().split('T')[0];
      }
      // Already a string date
      return String(rawValue).split('T')[0];
    }

    // Handle numbers
    if (field.type === CsvFieldType.NUMBER) {
      return String(rawValue);
    }

    // Handle booleans
    if (field.type === CsvFieldType.BOOLEAN) {
      return rawValue ? 'true' : 'false';
    }

    // Default: string conversion
    return String(rawValue);
  }

  /**
   * Get a nested value from an object using dot notation.
   * Supports array index notation like [0].property
   */
  private getNestedValue(obj: any, path: string): any {
    // Parse path segments, handling array indices like [0]
    const segments: (string | number)[] = [];
    let i = 0;
    while (i < path.length) {
      if (path[i] === '[') {
        // Array index
        const endBracket = path.indexOf(']', i);
        if (endBracket === -1) break;
        const index = parseInt(path.substring(i + 1, endBracket), 10);
        segments.push(index);
        i = endBracket + 1;
        if (path[i] === '.') i++; // Skip dot after bracket
      } else {
        // Property name
        let end = path.indexOf('.', i);
        const bracketStart = path.indexOf('[', i);
        if (end === -1) end = path.length;
        if (bracketStart !== -1 && bracketStart < end) end = bracketStart;
        const prop = path.substring(i, end);
        if (prop) segments.push(prop);
        i = end;
        if (path[i] === '.') i++; // Skip dot
      }
    }

    let current = obj;
    for (const segment of segments) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[segment];
    }

    return current;
  }
}
