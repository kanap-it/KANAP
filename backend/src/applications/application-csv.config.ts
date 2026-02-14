import {
  ArrayStrategy,
  CsvEntityConfig,
  CsvFieldType,
  CsvExportContext,
  CsvImportContext,
} from '../common/csv';

/**
 * CSV configuration for Applications entity (V2)
 *
 * Changes from V1:
 * - Owner emails use numbered columns (business_owner_email_1..4, it_owner_email_1..4)
 * - Removed deprecated fields: hosting_model, sso_enabled, mfa_supported, environment (use AppInstance)
 *
 * Field order matches ApplicationWorkspacePage.tsx tabs:
 * - Overview: name, description, category, supplier, editor, criticality, lifecycle, is_suite
 * - Version: version, go_live_date, end_of_support_date, retired_date
 * - Other: licensing, notes
 * - Technical: access_methods, external_facing, etl_enabled, support_notes
 * - Compliance: data_class, last_dr_test, contains_pii, data_residency
 * - Users: users_mode, users_year, users_override
 */
export const applicationCsvConfig: CsvEntityConfig = {
  entityName: 'application',
  tableName: 'applications',
  displayName: 'Applications',
  upsertKey: ['name'],
  fields: [
    // Identity
    {
      csvColumn: 'id',
      entityProperty: 'id',
      type: CsvFieldType.STRING,
      isIdentityColumn: true,
      exportable: true,
      importable: true,
      required: false,
      defaultExport: true,
      label: 'ID',
      group: 'Identity',
    },

    // === OVERVIEW TAB ===
    {
      csvColumn: 'name',
      entityProperty: 'name',
      type: CsvFieldType.STRING,
      required: true,
      defaultExport: true,
      label: 'Name',
      group: 'Overview',
    },
    {
      csvColumn: 'description',
      entityProperty: 'description',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: false,
      label: 'Description',
      group: 'Overview',
    },
    {
      csvColumn: 'category',
      entityProperty: 'category',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Category',
      group: 'Overview',
    },
    {
      csvColumn: 'supplier_name',
      entityProperty: 'supplier_id',
      type: CsvFieldType.FK_BY_NAME,
      fkEntity: 'suppliers',
      fkLookupColumn: 'name',
      fkRequired: false,
      required: false,
      defaultExport: true,
      label: 'Supplier',
      group: 'Overview',
    },
    {
      csvColumn: 'editor',
      entityProperty: 'editor',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Publisher',
      group: 'Overview',
    },
    {
      csvColumn: 'criticality',
      entityProperty: 'criticality',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Criticality',
      group: 'Overview',
      enumValues: ['business_critical', 'high', 'medium', 'low'],
      importTransformFn: (value: string) => {
        const lookup = new Map<string, string>([
          ['business_critical', 'business_critical'],
          ['high', 'high'],
          ['medium', 'medium'],
          ['low', 'low'],
          ['business critical', 'business_critical'],
          ['critical', 'business_critical'],
        ]);
        const normalized = value.trim().toLowerCase();
        const resolved = lookup.get(normalized);
        if (!resolved) {
          throw new Error(`Invalid criticality: "${value}". Valid values: Business Critical, High, Medium, Low`);
        }
        return resolved;
      },
    },
    {
      csvColumn: 'lifecycle',
      entityProperty: 'lifecycle',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Lifecycle',
      group: 'Overview',
    },
    {
      csvColumn: 'is_suite',
      entityProperty: 'is_suite',
      type: CsvFieldType.BOOLEAN,
      required: false,
      defaultExport: false,
      label: 'Can Have Child Apps',
      group: 'Overview',
    },

    // === VERSION INFORMATION ===
    {
      csvColumn: 'version',
      entityProperty: 'version',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Version',
      group: 'Version',
    },
    {
      csvColumn: 'go_live_date',
      entityProperty: 'go_live_date',
      type: CsvFieldType.DATE,
      required: false,
      defaultExport: true,
      label: 'Go Live Date',
      group: 'Version',
    },
    {
      csvColumn: 'end_of_support_date',
      entityProperty: 'end_of_support_date',
      type: CsvFieldType.DATE,
      required: false,
      defaultExport: true,
      label: 'End of Support Date',
      group: 'Version',
    },
    {
      csvColumn: 'retired_date',
      entityProperty: 'retired_date',
      type: CsvFieldType.DATE,
      required: false,
      defaultExport: false,
      label: 'Retired Date',
      group: 'Version',
    },

    // === OTHER (bottom of Overview tab) ===
    {
      csvColumn: 'licensing',
      entityProperty: 'licensing',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: false,
      label: 'Licensing',
      group: 'Other',
    },
    {
      csvColumn: 'notes',
      entityProperty: 'notes',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: false,
      label: 'Notes',
      group: 'Other',
    },

    // === TECHNICAL & SUPPORT TAB ===
    {
      csvColumn: 'access_methods',
      entityProperty: 'access_methods',
      type: CsvFieldType.ARRAY,
      arrayStrategy: ArrayStrategy.COMMA_SEPARATED,
      required: false,
      defaultExport: false,
      label: 'Access Methods',
      group: 'Technical',
    },
    {
      csvColumn: 'external_facing',
      entityProperty: 'external_facing',
      type: CsvFieldType.BOOLEAN,
      required: false,
      defaultExport: true,
      label: 'External Facing',
      group: 'Technical',
    },
    {
      csvColumn: 'etl_enabled',
      entityProperty: 'etl_enabled',
      type: CsvFieldType.BOOLEAN,
      required: false,
      defaultExport: false,
      label: 'Data Integration / ETL',
      group: 'Technical',
    },
    {
      csvColumn: 'support_notes',
      entityProperty: 'support_notes',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: false,
      label: 'Support Notes',
      group: 'Technical',
    },

    // === COMPLIANCE TAB ===
    {
      csvColumn: 'data_class',
      entityProperty: 'data_class',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Data Class',
      group: 'Compliance',
    },
    {
      csvColumn: 'last_dr_test',
      entityProperty: 'last_dr_test',
      type: CsvFieldType.DATE,
      required: false,
      defaultExport: false,
      label: 'Last DR Test',
      group: 'Compliance',
    },
    {
      csvColumn: 'contains_pii',
      entityProperty: 'contains_pii',
      type: CsvFieldType.BOOLEAN,
      required: false,
      defaultExport: true,
      label: 'Contains PII',
      group: 'Compliance',
    },
    {
      csvColumn: 'data_residency',
      entityProperty: 'data_residency',
      type: CsvFieldType.COMPUTED,
      exportable: true,
      importable: false,
      defaultExport: true,
      label: 'Data Residency (ISO codes)',
      group: 'Compliance',
      exportFn: (entity: any, context: CsvExportContext) => {
        const residency = entity._dataResidency;
        if (Array.isArray(residency)) {
          return residency.map((r: any) => r.country_iso).join(', ');
        }
        return '';
      },
    },

    // === USERS (from Ownership tab) - export-only, managed via UI ===
    {
      csvColumn: 'users_mode',
      entityProperty: 'users_mode',
      type: CsvFieldType.ENUM,
      enumValues: ['manual', 'it_users', 'headcount'],
      exportable: true,
      importable: false,
      defaultExport: false,
      label: 'Users Mode',
      group: 'Users',
    },
    {
      csvColumn: 'users_year',
      entityProperty: 'users_year',
      type: CsvFieldType.NUMBER,
      exportable: true,
      importable: false,
      defaultExport: false,
      label: 'Users Year',
      group: 'Users',
    },
    {
      csvColumn: 'users_override',
      entityProperty: 'users_override',
      type: CsvFieldType.NUMBER,
      exportable: true,
      importable: false,
      defaultExport: false,
      label: 'Users Override',
      group: 'Users',
    },

    // === STATUS (internal field) ===
    {
      csvColumn: 'status',
      entityProperty: 'status',
      type: CsvFieldType.ENUM,
      enumValues: ['enabled', 'disabled'],
      required: false,
      defaultExport: true,
      label: 'Status',
      group: 'Status',
    },

    // === OWNERS ===
    // These fields use COMPUTED for export (reading from _owners) but are importable
    // Import is handled by handleOwnerImport in the service
    {
      csvColumn: 'business_owner_email_1',
      entityProperty: '_owners',
      type: CsvFieldType.COMPUTED,
      exportable: true,
      importable: true,
      required: false,
      defaultExport: true,
      label: 'Business Owner 1 Email',
      group: 'Owners',
      exportFn: (entity: any) => {
        const owners = entity._owners || [];
        const business = owners.filter((o: any) => o.owner_type === 'business');
        return business[0]?.user?.email || '';
      },
    },
    {
      csvColumn: 'business_owner_email_2',
      entityProperty: '_owners',
      type: CsvFieldType.COMPUTED,
      exportable: true,
      importable: true,
      required: false,
      defaultExport: true,
      label: 'Business Owner 2 Email',
      group: 'Owners',
      exportFn: (entity: any) => {
        const owners = entity._owners || [];
        const business = owners.filter((o: any) => o.owner_type === 'business');
        return business[1]?.user?.email || '';
      },
    },
    {
      csvColumn: 'business_owner_email_3',
      entityProperty: '_owners',
      type: CsvFieldType.COMPUTED,
      exportable: true,
      importable: true,
      required: false,
      defaultExport: true,
      label: 'Business Owner 3 Email',
      group: 'Owners',
      exportFn: (entity: any) => {
        const owners = entity._owners || [];
        const business = owners.filter((o: any) => o.owner_type === 'business');
        return business[2]?.user?.email || '';
      },
    },
    {
      csvColumn: 'business_owner_email_4',
      entityProperty: '_owners',
      type: CsvFieldType.COMPUTED,
      exportable: true,
      importable: true,
      required: false,
      defaultExport: true,
      label: 'Business Owner 4 Email',
      group: 'Owners',
      exportFn: (entity: any) => {
        const owners = entity._owners || [];
        const business = owners.filter((o: any) => o.owner_type === 'business');
        return business[3]?.user?.email || '';
      },
    },
    {
      csvColumn: 'it_owner_email_1',
      entityProperty: '_owners',
      type: CsvFieldType.COMPUTED,
      exportable: true,
      importable: true,
      required: false,
      defaultExport: true,
      label: 'IT Owner 1 Email',
      group: 'Owners',
      exportFn: (entity: any) => {
        const owners = entity._owners || [];
        const it = owners.filter((o: any) => o.owner_type === 'it');
        return it[0]?.user?.email || '';
      },
    },
    {
      csvColumn: 'it_owner_email_2',
      entityProperty: '_owners',
      type: CsvFieldType.COMPUTED,
      exportable: true,
      importable: true,
      required: false,
      defaultExport: true,
      label: 'IT Owner 2 Email',
      group: 'Owners',
      exportFn: (entity: any) => {
        const owners = entity._owners || [];
        const it = owners.filter((o: any) => o.owner_type === 'it');
        return it[1]?.user?.email || '';
      },
    },
    {
      csvColumn: 'it_owner_email_3',
      entityProperty: '_owners',
      type: CsvFieldType.COMPUTED,
      exportable: true,
      importable: true,
      required: false,
      defaultExport: true,
      label: 'IT Owner 3 Email',
      group: 'Owners',
      exportFn: (entity: any) => {
        const owners = entity._owners || [];
        const it = owners.filter((o: any) => o.owner_type === 'it');
        return it[2]?.user?.email || '';
      },
    },
    {
      csvColumn: 'it_owner_email_4',
      entityProperty: '_owners',
      type: CsvFieldType.COMPUTED,
      exportable: true,
      importable: true,
      required: false,
      defaultExport: true,
      label: 'IT Owner 4 Email',
      group: 'Owners',
      exportFn: (entity: any) => {
        const owners = entity._owners || [];
        const it = owners.filter((o: any) => o.owner_type === 'it');
        return it[3]?.user?.email || '';
      },
    },

    // === TIMESTAMPS (export-only) ===
    {
      csvColumn: 'created_at',
      entityProperty: 'created_at',
      type: CsvFieldType.DATE,
      exportable: true,
      importable: false,
      defaultExport: true,
      label: 'Created At',
      group: 'Timestamps',
    },
    {
      csvColumn: 'updated_at',
      entityProperty: 'updated_at',
      type: CsvFieldType.DATE,
      exportable: true,
      importable: false,
      defaultExport: true,
      label: 'Updated At',
      group: 'Timestamps',
    },
  ],

  // Export presets
  exportPresets: [
    {
      name: 'enrichment',
      label: 'Data Enrichment',
      // Only importable fields - excludes computed fields like data_residency, created_at, updated_at
      fields: [
        'id', 'name', 'description', 'category', 'supplier_name', 'editor',
        'criticality', 'lifecycle', 'is_suite',
        'version', 'go_live_date', 'end_of_support_date', 'retired_date',
        'licensing', 'notes',
        'access_methods', 'external_facing', 'etl_enabled', 'support_notes',
        'data_class', 'last_dr_test', 'contains_pii',
        'status',
        'business_owner_email_1', 'business_owner_email_2', 'business_owner_email_3', 'business_owner_email_4',
        'it_owner_email_1', 'it_owner_email_2', 'it_owner_email_3', 'it_owner_email_4',
      ],
    },
  ],

  /**
   * Hook to resolve settings-backed and enum fields before commit.
   * Accepts both codes and labels for: category, lifecycle, data_class, criticality
   */
  beforeCommit: async (entities: any[], context: CsvImportContext) => {
    // Load IT Ops settings from tenant metadata
    const tenantRows = await context.manager.query(
      `SELECT metadata FROM tenants WHERE id = $1 LIMIT 1`,
      [context.tenantId],
    );
    const settings = tenantRows[0]?.metadata?.it_ops || {};

    // Helper to build bidirectional lookup map (code -> code, label -> code)
    const buildLookup = (items: Array<{ code: string; label: string }>) => {
      const map = new Map<string, string>();
      for (const item of items || []) {
        map.set(item.code.toLowerCase(), item.code);
        map.set(item.label.toLowerCase(), item.code);
      }
      return map;
    };

    // Build lookup maps for settings-backed fields
    const categoryLookup = buildLookup(settings.application_categories || []);
    const lifecycleLookup = buildLookup(settings.lifecycle_states || []);
    const dataClassLookup = buildLookup(settings.data_classes || []);
    const accessMethodsLookup = buildLookup(settings.access_methods || []);

    // Criticality label to code mapping (hardcoded enum)
    const criticalityLookup = new Map<string, string>([
      // Codes map to themselves
      ['business_critical', 'business_critical'],
      ['high', 'high'],
      ['medium', 'medium'],
      ['low', 'low'],
      // Common labels
      ['business critical', 'business_critical'],
      ['critical', 'business_critical'],
    ]);

    // Resolve fields
    for (const entity of entities) {
      // Category (settings-backed)
      if (entity.category) {
        const input = String(entity.category).trim().toLowerCase();
        const resolved = categoryLookup.get(input);
        if (resolved) entity.category = resolved;
      }

      // Lifecycle (settings-backed)
      if (entity.lifecycle) {
        const input = String(entity.lifecycle).trim().toLowerCase();
        const resolved = lifecycleLookup.get(input);
        if (resolved) entity.lifecycle = resolved;
      }

      // Data Class (settings-backed)
      if (entity.data_class) {
        const input = String(entity.data_class).trim().toLowerCase();
        const resolved = dataClassLookup.get(input);
        if (resolved) entity.data_class = resolved;
      }

      // Criticality (enum)
      if (entity.criticality) {
        const input = String(entity.criticality).trim().toLowerCase();
        const resolved = criticalityLookup.get(input);
        if (resolved) entity.criticality = resolved;
      }

      // Access Methods (array, settings-backed)
      if (Array.isArray(entity.access_methods)) {
        entity.access_methods = entity.access_methods.map((item: string) => {
          const input = String(item).trim().toLowerCase();
          return accessMethodsLookup.get(input) || item;
        });
      }
    }
  },
};
