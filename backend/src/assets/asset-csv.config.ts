import {
  ArrayStrategy,
  CsvEntityConfig,
  CsvFieldType,
  CsvImportContext,
} from '../common/csv';

/**
 * CSV configuration for Assets entity
 *
 * Field order matches AssetWorkspacePage.tsx tabs:
 * - Overview: name, location, kind, is_cluster, status, notes
 * - Technical: environment, hostname, domain, aliases, operating_system, cluster, IP addresses
 *
 * Note: fqdn is computed from hostname + domain, so not included in CSV
 */
export const assetCsvConfig: CsvEntityConfig = {
  entityName: 'asset',
  tableName: 'assets',
  displayName: 'Assets',
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
      csvColumn: 'location_code',
      entityProperty: 'location_id',
      type: CsvFieldType.FK_BY_CODE,
      fkEntity: 'locations',
      fkLookupColumn: 'code',
      fkRequired: true,
      required: true,
      defaultExport: true,
      label: 'Location',
      group: 'Overview',
    },
    {
      csvColumn: 'kind',
      entityProperty: 'kind',
      type: CsvFieldType.STRING,
      required: true,
      defaultExport: true,
      label: 'Asset Type',
      group: 'Overview',
    },
    {
      csvColumn: 'is_cluster',
      entityProperty: 'is_cluster',
      type: CsvFieldType.BOOLEAN,
      required: false,
      defaultExport: true,
      label: 'Is Cluster',
      group: 'Overview',
    },
    {
      csvColumn: 'status',
      entityProperty: 'status',
      type: CsvFieldType.ENUM,
      enumValues: ['active', 'inactive', 'decommissioned', 'planned'],
      required: false,
      defaultExport: true,
      label: 'Lifecycle',
      group: 'Overview',
    },
    {
      csvColumn: 'go_live_date',
      entityProperty: 'go_live_date',
      type: CsvFieldType.DATE,
      required: false,
      defaultExport: true,
      label: 'Go-live Date',
      group: 'Overview',
    },
    {
      csvColumn: 'end_of_life_date',
      entityProperty: 'end_of_life_date',
      type: CsvFieldType.DATE,
      required: false,
      defaultExport: true,
      label: 'End-of-life Date',
      group: 'Overview',
    },
    {
      csvColumn: 'notes',
      entityProperty: 'notes',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: false,
      label: 'Notes',
      group: 'Overview',
    },

    // === TECHNICAL TAB ===
    {
      csvColumn: 'environment',
      entityProperty: 'environment',
      type: CsvFieldType.ENUM,
      enumValues: ['prod', 'pre_prod', 'qa', 'test', 'dev', 'sandbox'],
      required: true,
      defaultExport: true,
      label: 'Environment',
      group: 'Technical',
    },
    {
      csvColumn: 'hostname',
      entityProperty: 'hostname',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Hostname',
      group: 'Technical',
    },
    {
      csvColumn: 'domain',
      entityProperty: 'domain',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Domain',
      group: 'Technical',
    },
    {
      csvColumn: 'aliases',
      entityProperty: 'aliases',
      type: CsvFieldType.ARRAY,
      arrayStrategy: ArrayStrategy.COMMA_SEPARATED,
      required: false,
      defaultExport: true,
      label: 'Aliases',
      group: 'Technical',
    },
    {
      csvColumn: 'operating_system',
      entityProperty: 'operating_system',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Operating System',
      group: 'Technical',
    },
    {
      csvColumn: 'cluster',
      entityProperty: 'cluster',
      type: CsvFieldType.STRING,
      required: false,
      defaultExport: true,
      label: 'Cluster Membership',
      group: 'Technical',
    },
    // Note: region and zone were removed - region comes from Location, zone was unused

    // === IP ADDRESSES (up to 4) ===
    {
      csvColumn: 'ip_1_type',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[0].type',
      required: false,
      defaultExport: true,
      label: 'IP 1 Type',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_1_address',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[0].ip',
      required: false,
      defaultExport: true,
      label: 'IP 1 Address',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_1_subnet_cidr',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[0].subnet_cidr',
      required: false,
      defaultExport: true,
      label: 'IP 1 Subnet CIDR',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_2_type',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[1].type',
      required: false,
      defaultExport: false,
      label: 'IP 2 Type',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_2_address',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[1].ip',
      required: false,
      defaultExport: false,
      label: 'IP 2 Address',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_2_subnet_cidr',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[1].subnet_cidr',
      required: false,
      defaultExport: false,
      label: 'IP 2 Subnet CIDR',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_3_type',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[2].type',
      required: false,
      defaultExport: false,
      label: 'IP 3 Type',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_3_address',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[2].ip',
      required: false,
      defaultExport: false,
      label: 'IP 3 Address',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_3_subnet_cidr',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[2].subnet_cidr',
      required: false,
      defaultExport: false,
      label: 'IP 3 Subnet CIDR',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_4_type',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[3].type',
      required: false,
      defaultExport: false,
      label: 'IP 4 Type',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_4_address',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[3].ip',
      required: false,
      defaultExport: false,
      label: 'IP 4 Address',
      group: 'IP Addresses',
    },
    {
      csvColumn: 'ip_4_subnet_cidr',
      entityProperty: 'ip_addresses',
      type: CsvFieldType.NESTED,
      nestedPath: '[3].subnet_cidr',
      required: false,
      defaultExport: false,
      label: 'IP 4 Subnet CIDR',
      group: 'IP Addresses',
    },
  ],

  // Export presets
  exportPresets: [
    {
      name: 'enrichment',
      label: 'Data Enrichment',
      fields: [
        'id', 'name', 'location_code', 'kind', 'is_cluster', 'status',
        'go_live_date', 'end_of_life_date', 'notes',
        'environment', 'hostname', 'domain', 'aliases',
        'operating_system', 'cluster',
        'ip_1_type', 'ip_1_address', 'ip_1_subnet_cidr',
        'ip_2_type', 'ip_2_address', 'ip_2_subnet_cidr',
        'ip_3_type', 'ip_3_address', 'ip_3_subnet_cidr',
        'ip_4_type', 'ip_4_address', 'ip_4_subnet_cidr',
      ],
    },
  ],

  /**
   * Hook to normalize and validate fields before commit.
   * - Derives Provider from Location (required at DB level but auto-populated in frontend)
   * - Resolves settings-backed fields (kind, status, operating_system, domain, ip_address type)
   *   accepting both codes and labels
   */
  beforeCommit: async (entities: any[], context: CsvImportContext) => {
    // 1. Load IT Ops settings from tenant metadata
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

    // Build lookup maps for all settings-backed fields
    const kindLookup = buildLookup(settings.server_kinds || []);
    const statusLookup = buildLookup(settings.lifecycle_states || []);
    const osLookup = buildLookup(settings.operating_systems || []);
    const domainLookup = buildLookup(settings.domains || []);
    const ipTypeLookup = buildLookup(settings.ip_address_types || []);

    // 2. Derive provider from location
    const needsProvider = entities.filter((e) => e.location_id && !e.provider);
    if (needsProvider.length > 0) {
      const locationIds = [...new Set(needsProvider.map((e) => e.location_id))];

      const locations = await context.manager.query(
        `SELECT id, provider, hosting_type FROM locations WHERE id = ANY($1) AND tenant_id = $2`,
        [locationIds, context.tenantId],
      );

      const locationMap = new Map<string, { provider: string | null; hosting_type: string }>();
      for (const loc of locations) {
        locationMap.set(loc.id, { provider: loc.provider, hosting_type: loc.hosting_type });
      }

      for (const entity of needsProvider) {
        const locData = locationMap.get(entity.location_id);
        if (locData) {
          entity.provider = locData.provider || locData.hosting_type || null;
        }
      }
    }

    // 3. Resolve settings-backed fields (accepts both code and label)
    for (const entity of entities) {
      // Kind (Asset Type)
      if (entity.kind) {
        const input = String(entity.kind).trim().toLowerCase();
        const resolved = kindLookup.get(input);
        if (resolved) entity.kind = resolved;
      }

      // Status (Lifecycle)
      if (entity.status) {
        const input = String(entity.status).trim().toLowerCase();
        const resolved = statusLookup.get(input);
        if (resolved) entity.status = resolved;
      }

      // Operating System
      if (entity.operating_system) {
        const input = String(entity.operating_system).trim().toLowerCase();
        const resolved = osLookup.get(input);
        if (resolved) entity.operating_system = resolved;
      }

      // Domain
      if (entity.domain) {
        const input = String(entity.domain).trim().toLowerCase();
        const resolved = domainLookup.get(input);
        if (resolved) entity.domain = resolved;
      }

      // 4. Normalize IP addresses (resolve type from label/code, trim values)
      if (Array.isArray(entity.ip_addresses)) {
        const normalizedIps: Array<{ type: string; ip: string; subnet_cidr: string | null }> = [];

        for (const ip of entity.ip_addresses) {
          if (!ip || typeof ip !== 'object' || !ip.ip) {
            continue;
          }

          const typeInput = String(ip.type || '').trim().toLowerCase();
          const resolvedType = ipTypeLookup.get(typeInput);

          // Validate IP type against settings
          if (typeInput && !resolvedType) {
            const validTypes = [...new Set(ipTypeLookup.values())].join(', ');
            throw new Error(
              `Invalid IP address type "${ip.type}" for asset "${entity.name}". Valid types: ${validTypes || '(none configured)'}`,
            );
          }

          normalizedIps.push({
            type: resolvedType || typeInput,
            ip: String(ip.ip || '').trim(),
            subnet_cidr: ip.subnet_cidr ? String(ip.subnet_cidr).trim() : null,
          });
        }

        entity.ip_addresses = normalizedIps.length > 0 ? normalizedIps : null;
      }
    }
  },
};
