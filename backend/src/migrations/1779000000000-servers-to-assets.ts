import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Servers → Assets Transformation
 *
 * This migration transforms the "Servers" module into a comprehensive "Assets" module.
 * All operations use RENAME to guarantee zero data loss.
 *
 * Changes:
 * 1. Rename tables: servers → assets, server_cluster_members → asset_cluster_members,
 *    app_server_assignments → app_asset_assignments
 * 2. Rename columns: server_id → asset_id in related tables
 * 3. Rename connection columns: source_server_id → source_asset_id, etc.
 * 4. Create new extension tables for physical assets and financial links
 */
export class ServersToAssets1779000000000 implements MigrationInterface {
  name = 'ServersToAssets1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================================================
    // PHASE 1: Rename Core Tables and Columns
    // =========================================================================

    // --- 1.1: Rename servers table to assets ---
    await queryRunner.query(`ALTER TABLE servers RENAME TO assets`);

    // Rename primary key constraint
    await queryRunner.query(`ALTER INDEX IF EXISTS servers_pkey RENAME TO assets_pkey`);

    // Rename indexes
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_servers_tenant_env RENAME TO idx_assets_tenant_env`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_servers_tenant_kind RENAME TO idx_assets_tenant_kind`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_servers_tenant_location RENAME TO idx_assets_tenant_location`);

    // Drop and recreate RLS policy with new name (ALTER POLICY RENAME doesn't support IF EXISTS properly)
    await queryRunner.query(`DROP POLICY IF EXISTS servers_tenant_isolation ON assets`);
    await queryRunner.query(`
      CREATE POLICY assets_tenant_isolation ON assets
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 1.2: Rename server_cluster_members table ---
    await queryRunner.query(`ALTER TABLE server_cluster_members RENAME TO asset_cluster_members`);

    // Rename column server_id → asset_id
    await queryRunner.query(`ALTER TABLE asset_cluster_members RENAME COLUMN server_id TO asset_id`);

    // Rename indexes
    await queryRunner.query(`ALTER INDEX IF EXISTS uq_server_cluster_members RENAME TO uq_asset_cluster_members`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_server_cluster_members_cluster RENAME TO idx_asset_cluster_members_cluster`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_server_cluster_members_server RENAME TO idx_asset_cluster_members_asset`);

    // Rename foreign key constraints
    await queryRunner.query(`
      ALTER TABLE asset_cluster_members
      DROP CONSTRAINT IF EXISTS fk_server_cluster_members_cluster
    `);
    await queryRunner.query(`
      ALTER TABLE asset_cluster_members
      DROP CONSTRAINT IF EXISTS fk_server_cluster_members_server
    `);

    // Clean up orphaned records before adding FK constraints
    // (production may have cluster_id or asset_id pointing to deleted servers)
    await queryRunner.query(`
      DELETE FROM asset_cluster_members
      WHERE cluster_id NOT IN (SELECT id FROM assets)
         OR asset_id NOT IN (SELECT id FROM assets)
    `);

    await queryRunner.query(`
      ALTER TABLE asset_cluster_members
      ADD CONSTRAINT fk_asset_cluster_members_cluster
      FOREIGN KEY (cluster_id) REFERENCES assets(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE asset_cluster_members
      ADD CONSTRAINT fk_asset_cluster_members_asset
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    `);

    // Drop and recreate RLS policy with new name
    await queryRunner.query(`DROP POLICY IF EXISTS server_cluster_members_isolation ON asset_cluster_members`);
    await queryRunner.query(`
      CREATE POLICY asset_cluster_members_isolation ON asset_cluster_members
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 1.3: Rename app_server_assignments table ---
    await queryRunner.query(`ALTER TABLE app_server_assignments RENAME TO app_asset_assignments`);

    // Rename column server_id → asset_id
    await queryRunner.query(`ALTER TABLE app_asset_assignments RENAME COLUMN server_id TO asset_id`);

    // Rename unique constraint index
    await queryRunner.query(`ALTER INDEX IF EXISTS uq_app_server_assignment RENAME TO uq_app_asset_assignment`);

    // Rename foreign key constraints
    await queryRunner.query(`
      ALTER TABLE app_asset_assignments
      DROP CONSTRAINT IF EXISTS fk_app_server_assignment_server
    `);

    // Clean up orphaned records before adding FK constraint
    await queryRunner.query(`
      DELETE FROM app_asset_assignments
      WHERE asset_id NOT IN (SELECT id FROM assets)
    `);

    await queryRunner.query(`
      ALTER TABLE app_asset_assignments
      ADD CONSTRAINT fk_app_asset_assignment_asset
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    `);

    // Drop and recreate RLS policy with new name
    await queryRunner.query(`DROP POLICY IF EXISTS app_server_assignments_tenant_isolation ON app_asset_assignments`);
    await queryRunner.query(`
      CREATE POLICY app_asset_assignments_tenant_isolation ON app_asset_assignments
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // =========================================================================
    // PHASE 2: Rename Connection Table Columns
    // =========================================================================

    // --- 2.1: Rename columns in connections table ---
    await queryRunner.query(`ALTER TABLE connections RENAME COLUMN source_server_id TO source_asset_id`);
    await queryRunner.query(`ALTER TABLE connections RENAME COLUMN destination_server_id TO destination_asset_id`);

    // --- 2.2: Rename column in connection_servers table ---
    await queryRunner.query(`ALTER TABLE connection_servers RENAME COLUMN server_id TO asset_id`);

    // Rename unique index
    await queryRunner.query(`
      ALTER INDEX IF EXISTS "IDX_connection_servers_tenant_connection_server"
      RENAME TO "IDX_connection_servers_tenant_connection_asset"
    `);

    // =========================================================================
    // PHASE 3: Create New Extension Tables
    // =========================================================================

    // --- 3.1: asset_hardware_info (Physical assets only) ---
    await queryRunner.query(`
      CREATE TABLE asset_hardware_info (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        serial_number text,
        manufacturer text,
        model text,
        purchase_date date,
        rack_location text,
        rack_unit text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_asset_hardware UNIQUE (tenant_id, asset_id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_asset_hardware_tenant ON asset_hardware_info(tenant_id)
    `);

    await queryRunner.query(`ALTER TABLE asset_hardware_info ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_hardware_info FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY asset_hardware_info_tenant_isolation ON asset_hardware_info
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 3.2: asset_support_info (Physical assets only) ---
    await queryRunner.query(`
      CREATE TABLE asset_support_info (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        vendor_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
        support_contract_id uuid REFERENCES contracts(id) ON DELETE SET NULL,
        support_tier text,
        support_expiry date,
        escalation_contact text,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_asset_support UNIQUE (tenant_id, asset_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_asset_support_tenant ON asset_support_info(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_asset_support_vendor ON asset_support_info(tenant_id, vendor_id)`);
    await queryRunner.query(`CREATE INDEX idx_asset_support_contract ON asset_support_info(tenant_id, support_contract_id)`);

    await queryRunner.query(`ALTER TABLE asset_support_info ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_support_info FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY asset_support_info_tenant_isolation ON asset_support_info
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 3.2b: asset_support_contacts (Multiple support contacts per asset) ---
    await queryRunner.query(`
      CREATE TABLE asset_support_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        role text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_asset_support_contacts_tenant ON asset_support_contacts(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_asset_support_contacts_asset ON asset_support_contacts(tenant_id, asset_id)`);

    await queryRunner.query(`ALTER TABLE asset_support_contacts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_support_contacts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY asset_support_contacts_tenant_isolation ON asset_support_contacts
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 3.3: asset_relations (Inter-asset relationships) ---
    await queryRunner.query(`
      CREATE TABLE asset_relations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        related_asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        relation_type text NOT NULL CHECK (relation_type IN ('contains', 'depends_on')),
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_asset_relation UNIQUE (tenant_id, asset_id, related_asset_id, relation_type),
        CONSTRAINT chk_no_self_relation CHECK (asset_id <> related_asset_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_asset_relations_tenant ON asset_relations(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_asset_relations_related ON asset_relations(tenant_id, related_asset_id)`);

    await queryRunner.query(`ALTER TABLE asset_relations ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_relations FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY asset_relations_tenant_isolation ON asset_relations
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 3.4: asset_spend_items (OPEX links) ---
    await queryRunner.query(`
      CREATE TABLE asset_spend_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        spend_item_id uuid NOT NULL REFERENCES spend_items(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_asset_spend UNIQUE (tenant_id, asset_id, spend_item_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_asset_spend_tenant ON asset_spend_items(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_asset_spend_item ON asset_spend_items(tenant_id, spend_item_id)`);

    await queryRunner.query(`ALTER TABLE asset_spend_items ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_spend_items FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY asset_spend_items_tenant_isolation ON asset_spend_items
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 3.5: asset_capex_items (CAPEX links) ---
    await queryRunner.query(`
      CREATE TABLE asset_capex_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        capex_item_id uuid NOT NULL REFERENCES capex_items(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_asset_capex UNIQUE (tenant_id, asset_id, capex_item_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_asset_capex_tenant ON asset_capex_items(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_asset_capex_item ON asset_capex_items(tenant_id, capex_item_id)`);

    await queryRunner.query(`ALTER TABLE asset_capex_items ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_capex_items FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY asset_capex_items_tenant_isolation ON asset_capex_items
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 3.6: asset_contracts (General contract links) ---
    await queryRunner.query(`
      CREATE TABLE asset_contracts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_asset_contract UNIQUE (tenant_id, asset_id, contract_id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_asset_contracts_tenant ON asset_contracts(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_asset_contracts_contract ON asset_contracts(tenant_id, contract_id)`);

    await queryRunner.query(`ALTER TABLE asset_contracts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_contracts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY asset_contracts_tenant_isolation ON asset_contracts
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 3.7: asset_links (URLs) ---
    await queryRunner.query(`
      CREATE TABLE asset_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        description text,
        url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_asset_links_tenant ON asset_links(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_asset_links_asset ON asset_links(tenant_id, asset_id)`);

    await queryRunner.query(`ALTER TABLE asset_links ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_links FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY asset_links_tenant_isolation ON asset_links
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // --- 3.8: asset_attachments (File uploads) ---
    await queryRunner.query(`
      CREATE TABLE asset_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        original_filename text NOT NULL,
        stored_filename text NOT NULL,
        mime_type text,
        size int NOT NULL DEFAULT 0,
        storage_path text NOT NULL,
        uploaded_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_asset_attachments_tenant ON asset_attachments(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_asset_attachments_asset ON asset_attachments(tenant_id, asset_id)`);

    await queryRunner.query(`ALTER TABLE asset_attachments ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE asset_attachments FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY asset_attachments_tenant_isolation ON asset_attachments
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // =========================================================================
    // PHASE 1: Drop New Extension Tables (Safe - they're new)
    // =========================================================================
    await queryRunner.query(`DROP TABLE IF EXISTS asset_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_links`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_contracts`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_capex_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_spend_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_relations`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_support_contacts`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_support_info`);
    await queryRunner.query(`DROP TABLE IF EXISTS asset_hardware_info`);

    // =========================================================================
    // PHASE 2: Reverse Connection Column Renames
    // =========================================================================
    await queryRunner.query(`ALTER TABLE connections RENAME COLUMN source_asset_id TO source_server_id`);
    await queryRunner.query(`ALTER TABLE connections RENAME COLUMN destination_asset_id TO destination_server_id`);
    await queryRunner.query(`ALTER TABLE connection_servers RENAME COLUMN asset_id TO server_id`);

    await queryRunner.query(`
      ALTER INDEX IF EXISTS "IDX_connection_servers_tenant_connection_asset"
      RENAME TO "IDX_connection_servers_tenant_connection_server"
    `);

    // =========================================================================
    // PHASE 3: Reverse App Asset Assignments Renames
    // =========================================================================
    // Drop and recreate RLS policy with original name
    await queryRunner.query(`DROP POLICY IF EXISTS app_asset_assignments_tenant_isolation ON app_asset_assignments`);
    await queryRunner.query(`
      CREATE POLICY app_server_assignments_tenant_isolation ON app_asset_assignments
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    await queryRunner.query(`
      ALTER TABLE app_asset_assignments
      DROP CONSTRAINT IF EXISTS fk_app_asset_assignment_asset
    `);
    await queryRunner.query(`
      ALTER TABLE app_asset_assignments
      ADD CONSTRAINT fk_app_server_assignment_server
      FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
    `);

    await queryRunner.query(`ALTER INDEX IF EXISTS uq_app_asset_assignment RENAME TO uq_app_server_assignment`);
    await queryRunner.query(`ALTER TABLE app_asset_assignments RENAME COLUMN asset_id TO server_id`);
    await queryRunner.query(`ALTER TABLE app_asset_assignments RENAME TO app_server_assignments`);

    // Update FK to reference servers table (after it's renamed back)
    // This will be done after servers table is restored

    // =========================================================================
    // PHASE 4: Reverse Asset Cluster Members Renames
    // =========================================================================
    // Drop and recreate RLS policy with original name
    await queryRunner.query(`DROP POLICY IF EXISTS asset_cluster_members_isolation ON asset_cluster_members`);
    await queryRunner.query(`
      CREATE POLICY server_cluster_members_isolation ON asset_cluster_members
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    await queryRunner.query(`
      ALTER TABLE asset_cluster_members
      DROP CONSTRAINT IF EXISTS fk_asset_cluster_members_cluster
    `);
    await queryRunner.query(`
      ALTER TABLE asset_cluster_members
      DROP CONSTRAINT IF EXISTS fk_asset_cluster_members_asset
    `);

    await queryRunner.query(`ALTER INDEX IF EXISTS idx_asset_cluster_members_asset RENAME TO idx_server_cluster_members_server`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_asset_cluster_members_cluster RENAME TO idx_server_cluster_members_cluster`);
    await queryRunner.query(`ALTER INDEX IF EXISTS uq_asset_cluster_members RENAME TO uq_server_cluster_members`);

    await queryRunner.query(`ALTER TABLE asset_cluster_members RENAME COLUMN asset_id TO server_id`);
    await queryRunner.query(`ALTER TABLE asset_cluster_members RENAME TO server_cluster_members`);

    // =========================================================================
    // PHASE 5: Reverse Core Assets Table Rename
    // =========================================================================
    // Drop and recreate RLS policy with original name
    await queryRunner.query(`DROP POLICY IF EXISTS assets_tenant_isolation ON assets`);
    await queryRunner.query(`
      CREATE POLICY servers_tenant_isolation ON assets
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    await queryRunner.query(`ALTER INDEX IF EXISTS idx_assets_tenant_location RENAME TO idx_servers_tenant_location`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_assets_tenant_kind RENAME TO idx_servers_tenant_kind`);
    await queryRunner.query(`ALTER INDEX IF EXISTS idx_assets_tenant_env RENAME TO idx_servers_tenant_env`);
    await queryRunner.query(`ALTER INDEX IF EXISTS assets_pkey RENAME TO servers_pkey`);

    await queryRunner.query(`ALTER TABLE assets RENAME TO servers`);

    // =========================================================================
    // PHASE 6: Restore Foreign Keys (now that servers table exists again)
    // =========================================================================
    await queryRunner.query(`
      ALTER TABLE server_cluster_members
      ADD CONSTRAINT fk_server_cluster_members_cluster
      FOREIGN KEY (cluster_id) REFERENCES servers(id) ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE server_cluster_members
      ADD CONSTRAINT fk_server_cluster_members_server
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    `);

    // Update app_server_assignments FK (need to drop and recreate since table was renamed)
    await queryRunner.query(`
      ALTER TABLE app_server_assignments
      DROP CONSTRAINT IF EXISTS fk_app_server_assignment_server
    `);
    await queryRunner.query(`
      ALTER TABLE app_server_assignments
      ADD CONSTRAINT fk_app_server_assignment_server
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
    `);
  }
}
