import { MigrationInterface, QueryRunner } from 'typeorm';

async function enableTenantRls(queryRunner: QueryRunner, table: string): Promise<void> {
  await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
  await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
  await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
  await queryRunner.query(`
    CREATE POLICY ${table}_tenant_isolation ON ${table}
    USING (tenant_id = app_current_tenant())
    WITH CHECK (tenant_id = app_current_tenant())
  `);
}

const ITEM_SEQUENCE_TYPES_BEFORE = `'task', 'request', 'project', 'document', 'application', 'asset', 'location', 'connection', 'interface', 'spend', 'capex'`;
const ITEM_SEQUENCE_TYPES_AFTER = `${ITEM_SEQUENCE_TYPES_BEFORE}, 'incident'`;

// Children first: dropped in this order on down().
const TABLES = [
  'incident_attachments',
  'document_incidents',
  'incident_applications',
  'incident_assets',
  'incident_entries',
  'incidents',
] as const;

/**
 * IT incident register (plan: planning/incident-register.md, §1).
 *
 * incidents (INC-N via item_sequences), append-only incident_entries timeline,
 * incident_assets / incident_applications / document_incidents join tables,
 * incident_attachments (soft delete). Text + named CHECK for enums, RLS on all six.
 */
export class IncidentRegister1853440000000 implements MigrationInterface {
  name = 'IncidentRegister1853440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE item_sequences DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN (${ITEM_SEQUENCE_TYPES_AFTER}))
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        item_number int NOT NULL,
        title text NOT NULL,
        category text,
        severity text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        started_at timestamptz,
        detected_at timestamptz NOT NULL DEFAULT now(),
        resolved_at timestamptz,
        closed_at timestamptz,
        reporter_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        owner_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        description text,
        impact text,
        root_cause text,
        corrective_actions text,
        lessons_learned text,
        source_ref text,
        personal_data_affected boolean NOT NULL DEFAULT false,
        authority_notification_required boolean NOT NULL DEFAULT false,
        authority_notified_at timestamptz,
        notified_parties text,
        created_by uuid,
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_incidents_tenant_item_number UNIQUE (tenant_id, item_number),
        CONSTRAINT chk_incidents_title_not_empty CHECK (btrim(title) <> ''),
        CONSTRAINT chk_incidents_severity CHECK (severity IN ('critical', 'major', 'minor', 'low')),
        CONSTRAINT chk_incidents_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_tenant_status
      ON incidents(tenant_id, status, detected_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_tenant_severity
      ON incidents(tenant_id, severity)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_tenant_detected
      ON incidents(tenant_id, detected_at DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incident_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        kind text NOT NULL,
        content text,
        changed_fields jsonb,
        occurred_at timestamptz NOT NULL DEFAULT now(),
        author_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_incident_entries_kind CHECK (
          kind IN ('note', 'status_change', 'severity_change', 'reopen', 'link_change', 'system')
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incident_entries_tenant_incident_occurred
      ON incident_entries(tenant_id, incident_id, occurred_at DESC)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incident_assets (
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_incident_assets PRIMARY KEY (incident_id, asset_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incident_assets_tenant_asset
      ON incident_assets(tenant_id, asset_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incident_applications (
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_incident_applications PRIMARY KEY (incident_id, application_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incident_applications_tenant_application
      ON incident_applications(tenant_id, application_id)
    `);

    // Knowledge-side naming, mirrors document_assets (1834200000000).
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS document_incidents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_document_incidents_pair UNIQUE (document_id, incident_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_document_incidents_tenant_incident
      ON document_incidents(tenant_id, incident_id)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS incident_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text,
        size int NOT NULL DEFAULT 0,
        storage_path text NOT NULL,
        uploaded_by uuid,
        uploaded_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incident_attachments_incident
      ON incident_attachments(incident_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incident_attachments_tenant
      ON incident_attachments(tenant_id)
    `);

    for (const table of TABLES) {
      await enableTenantRls(queryRunner, table);
    }

    // Existing tenants: the seeded IT landscape admin role gets the new resource, like
    // infrastructure/applications (new tenants get it from tenants.service.ts; the
    // Administrator role is completed at boot by main.ts). Precedent: 1765006000000-locations.
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      INSERT INTO role_permissions (tenant_id, role_id, resource, level)
      SELECT r.tenant_id, r.id, 'incidents', 'admin'
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.resource = 'incidents'
      WHERE r.is_system = true
        AND r.role_name IN ('Administrator', 'IT Landscape Administrator')
        AND rp.id IS NULL
    `);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM role_permissions WHERE resource = 'incidents'`);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);

    for (const table of TABLES) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM item_sequences WHERE entity_type = 'incident'`);
    await queryRunner.query(`ALTER TABLE item_sequences DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN (${ITEM_SEQUENCE_TYPES_BEFORE}))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);
  }
}
