import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessProcesses1758903100000 implements MigrationInterface {
  name = 'BusinessProcesses1758903100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS business_process_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        name text NOT NULL,
        is_default boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 100,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      ALTER TABLE business_process_categories
      ADD CONSTRAINT business_process_categories_tenant_fk
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_process_categories_tenant ON business_process_categories(tenant_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_business_process_categories_unique_name
      ON business_process_categories(tenant_id, lower(name));
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS business_processes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        name text NOT NULL,
        description text,
        owner_role text,
        notes text,
        status status_state NOT NULL DEFAULT 'enabled',
        disabled_at timestamptz NULL,
        is_default boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      ALTER TABLE business_processes
      ADD CONSTRAINT business_processes_tenant_fk
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_processes_tenant_status
      ON business_processes(tenant_id, status);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_business_processes_unique_name
      ON business_processes(tenant_id, lower(name));
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS business_process_category_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        process_id uuid NOT NULL,
        category_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      ALTER TABLE business_process_category_links
      ADD CONSTRAINT business_process_category_links_tenant_fk
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      ALTER TABLE business_process_category_links
      ADD CONSTRAINT business_process_category_links_process_fk
      FOREIGN KEY (process_id) REFERENCES business_processes(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      ALTER TABLE business_process_category_links
      ADD CONSTRAINT business_process_category_links_category_fk
      FOREIGN KEY (category_id) REFERENCES business_process_categories(id) ON DELETE CASCADE;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_business_process_category_links_tenant_process
      ON business_process_category_links(tenant_id, process_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_business_process_category_links_unique
      ON business_process_category_links(tenant_id, process_id, category_id);
    `);
    await queryRunner.query(`
      INSERT INTO business_process_categories (tenant_id, name, is_default, is_active, sort_order)
      SELECT t.id, 'Customer & Sales', true, true, 10
      FROM tenants t
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO business_process_categories (tenant_id, name, is_default, is_active, sort_order)
      SELECT t.id, 'Supply Chain, Purchasing & Operations', true, true, 20
      FROM tenants t
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO business_process_categories (tenant_id, name, is_default, is_active, sort_order)
      SELECT t.id, 'Product & Service Lifecycle', true, true, 30
      FROM tenants t
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO business_process_categories (tenant_id, name, is_default, is_active, sort_order)
      SELECT t.id, 'HR / People Processes', true, true, 40
      FROM tenants t
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO business_process_categories (tenant_id, name, is_default, is_active, sort_order)
      SELECT t.id, 'Finance & Controlling', true, true, 50
      FROM tenants t
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO business_process_categories (tenant_id, name, is_default, is_active, sort_order)
      SELECT t.id, 'IT & Support Functions', true, true, 60
      FROM tenants t
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO business_process_categories (tenant_id, name, is_default, is_active, sort_order)
      SELECT t.id, 'Governance, Strategy & Compliance', true, true, 70
      FROM tenants t
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);

    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Lead-to-Opportunity (L2O)', 'From marketing lead captured → qualified sales opportunity.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Opportunity-to-Quote (O2Q)', 'From defined opportunity → priced / configured quote.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Quote-to-Order (Q2O)', 'From customer accepting quote → sales order created.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Order-to-Cash (O2C)', 'From customer order → delivery / service → invoicing → payment received.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Request-to-Service (R2S)', 'From customer service request → service delivery (field service, hotline, etc.).', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Issue-to-Resolution / Complaint-to-Resolution', 'From complaint or incident logged → root cause analysis → corrective action → closure.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Return-to-Credit (R2C)', 'From return request (goods or service credit) → approval → logistics → credit note.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);

    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Source-to-Pay (S2P) / Procure-to-Pay (P2P)', 'From supplier identification & selection → purchase requisition → PO → receipt → invoice → payment.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Forecast-to-Fulfill', 'From demand planning / forecasting → supply planning → execution of deliveries.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Plan-to-Produce', 'From production planning → manufacturing execution → finished goods available.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Make-to-Stock (MTS) / Make-to-Order (MTO)', 'Variants of Plan-to-Produce depending on strategy.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Warehouse-to-Ship', 'From goods receipt → storage → picking → packing → shipment.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Asset-to-Retire (Acquire-to-Retire)', 'From acquisition of equipment/machines → operation and maintenance → disposal.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);

    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Idea-to-Market (I2M)', 'From idea capture → evaluation → development → launch in the market.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Concept-to-Design', 'From high-level concept → detailed product / service design.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Change-to-Release', 'From change request (engineering or service change) → implementation → release into production / live service.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);

    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Hire-to-Retire (H2R)', 'From workforce planning → recruitment → onboarding → internal moves → offboarding/retirement.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Recruit-to-Hire', 'From job opening → candidate sourcing → selection → employment contract.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Onboard-to-Perform', 'From first day → training → reaching expected performance.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Develop-to-Reward', 'From performance review → development plan → promotion/compensation changes.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);

    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Record-to-Report (R2R)', 'From recording transactions → period closing → financial & management reporting.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Plan-to-Perform / Budget-to-Control', 'From strategic targets → budgeting / forecasting → monitoring actuals vs budget.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Tax-to-File', 'From tax base calculation → declarations → payment and archiving.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);

    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Request-to-Fulfill (R2F)', 'From user request (hardware, software, access) → approval → provisioning.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Incident-to-Resolution', 'From incident ticket creation → diagnosis → workaround/fix → closure.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Change-to-Deploy', 'From change request (IT change) → risk assessment → implementation → deployment in production.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Detect-to-Correct (Security / Continuity)', 'From detection of security event / continuity risk → response → remediation.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);

    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Strategy-to-Portfolio', 'From strategic goals → project / product portfolio definition → prioritization.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Project-to-Close', 'From project initiation → planning → execution → closure and lessons learned.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Risk-to-Mitigation', 'From risk identification → analysis → mitigation plan → monitoring.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);
    await queryRunner.query(`
      WITH tenants_list AS (
        SELECT id AS tenant_id FROM tenants
      )
      INSERT INTO business_processes (tenant_id, name, description, status, is_default)
      SELECT tenant_id, 'Audit-to-Improve', 'From audit planning → execution → findings → corrective actions → follow-up.', 'enabled', true FROM tenants_list
      ON CONFLICT (tenant_id, lower(name)) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO business_process_category_links (tenant_id, process_id, category_id)
      SELECT bp.tenant_id, bp.id, cat.id
      FROM business_processes bp
      JOIN business_process_categories cat
        ON cat.tenant_id = bp.tenant_id
      WHERE bp.name IN (
        'Lead-to-Opportunity (L2O)',
        'Opportunity-to-Quote (O2Q)',
        'Quote-to-Order (Q2O)',
        'Order-to-Cash (O2C)',
        'Request-to-Service (R2S)',
        'Issue-to-Resolution / Complaint-to-Resolution',
        'Return-to-Credit (R2C)'
      )
      AND cat.name = 'Customer & Sales'
      ON CONFLICT (tenant_id, process_id, category_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO business_process_category_links (tenant_id, process_id, category_id)
      SELECT bp.tenant_id, bp.id, cat.id
      FROM business_processes bp
      JOIN business_process_categories cat
        ON cat.tenant_id = bp.tenant_id
      WHERE bp.name IN (
        'Source-to-Pay (S2P) / Procure-to-Pay (P2P)',
        'Forecast-to-Fulfill',
        'Plan-to-Produce',
        'Make-to-Stock (MTS) / Make-to-Order (MTO)',
        'Warehouse-to-Ship',
        'Asset-to-Retire (Acquire-to-Retire)'
      )
      AND cat.name = 'Supply Chain, Purchasing & Operations'
      ON CONFLICT (tenant_id, process_id, category_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO business_process_category_links (tenant_id, process_id, category_id)
      SELECT bp.tenant_id, bp.id, cat.id
      FROM business_processes bp
      JOIN business_process_categories cat
        ON cat.tenant_id = bp.tenant_id
      WHERE bp.name IN (
        'Idea-to-Market (I2M)',
        'Concept-to-Design',
        'Change-to-Release'
      )
      AND cat.name = 'Product & Service Lifecycle'
      ON CONFLICT (tenant_id, process_id, category_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO business_process_category_links (tenant_id, process_id, category_id)
      SELECT bp.tenant_id, bp.id, cat.id
      FROM business_processes bp
      JOIN business_process_categories cat
        ON cat.tenant_id = bp.tenant_id
      WHERE bp.name IN (
        'Hire-to-Retire (H2R)',
        'Recruit-to-Hire',
        'Onboard-to-Perform',
        'Develop-to-Reward'
      )
      AND cat.name = 'HR / People Processes'
      ON CONFLICT (tenant_id, process_id, category_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO business_process_category_links (tenant_id, process_id, category_id)
      SELECT bp.tenant_id, bp.id, cat.id
      FROM business_processes bp
      JOIN business_process_categories cat
        ON cat.tenant_id = bp.tenant_id
      WHERE bp.name IN (
        'Record-to-Report (R2R)',
        'Plan-to-Perform / Budget-to-Control',
        'Tax-to-File'
      )
      AND cat.name = 'Finance & Controlling'
      ON CONFLICT (tenant_id, process_id, category_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO business_process_category_links (tenant_id, process_id, category_id)
      SELECT bp.tenant_id, bp.id, cat.id
      FROM business_processes bp
      JOIN business_process_categories cat
        ON cat.tenant_id = bp.tenant_id
      WHERE bp.name IN (
        'Request-to-Fulfill (R2F)',
        'Incident-to-Resolution',
        'Change-to-Deploy',
        'Detect-to-Correct (Security / Continuity)'
      )
      AND cat.name = 'IT & Support Functions'
      ON CONFLICT (tenant_id, process_id, category_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO business_process_category_links (tenant_id, process_id, category_id)
      SELECT bp.tenant_id, bp.id, cat.id
      FROM business_processes bp
      JOIN business_process_categories cat
        ON cat.tenant_id = bp.tenant_id
      WHERE bp.name IN (
        'Strategy-to-Portfolio',
        'Project-to-Close',
        'Risk-to-Mitigation',
        'Audit-to-Improve'
      )
      AND cat.name = 'Governance, Strategy & Compliance'
      ON CONFLICT (tenant_id, process_id, category_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO business_process_category_links (tenant_id, process_id, category_id)
      SELECT bp.tenant_id, bp.id, cat.id
      FROM business_processes bp
      JOIN business_process_categories cat
        ON cat.tenant_id = bp.tenant_id
      WHERE bp.name = 'Order-to-Cash (O2C)'
      AND cat.name = 'Finance & Controlling'
      ON CONFLICT (tenant_id, process_id, category_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO business_process_category_links (tenant_id, process_id, category_id)
      SELECT bp.tenant_id, bp.id, cat.id
      FROM business_processes bp
      JOIN business_process_categories cat
        ON cat.tenant_id = bp.tenant_id
      WHERE bp.name = 'Source-to-Pay (S2P) / Procure-to-Pay (P2P)'
      AND cat.name = 'Finance & Controlling'
      ON CONFLICT (tenant_id, process_id, category_id) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions(tenant_id, role_id, resource, level)
      SELECT r.tenant_id, r.id, 'business_processes', 'admin'
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.resource = 'business_processes'
      WHERE r.role_name = 'Administrator' AND rp.id IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE business_process_categories ENABLE ROW LEVEL SECURITY;
    `);
    await queryRunner.query(`
      ALTER TABLE business_process_categories FORCE ROW LEVEL SECURITY;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'business_process_categories' AND policyname = 'business_process_categories_tenant_isolation'
        ) THEN
          CREATE POLICY business_process_categories_tenant_isolation ON business_process_categories
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE business_processes ENABLE ROW LEVEL SECURITY;
    `);
    await queryRunner.query(`
      ALTER TABLE business_processes FORCE ROW LEVEL SECURITY;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'business_processes' AND policyname = 'business_processes_tenant_isolation'
        ) THEN
          CREATE POLICY business_processes_tenant_isolation ON business_processes
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE business_process_category_links ENABLE ROW LEVEL SECURITY;
    `);
    await queryRunner.query(`
      ALTER TABLE business_process_category_links FORCE ROW LEVEL SECURITY;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'business_process_category_links' AND policyname = 'business_process_category_links_tenant_isolation'
        ) THEN
          CREATE POLICY business_process_category_links_tenant_isolation ON business_process_category_links
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM role_permissions WHERE resource = 'business_processes';`);

    await queryRunner.query(
      `DROP POLICY IF EXISTS business_process_category_links_tenant_isolation ON business_process_category_links;`,
    );
    await queryRunner.query(`ALTER TABLE business_process_category_links DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_business_process_category_links_unique;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_business_process_category_links_tenant_process;`);
    await queryRunner.query(`DROP TABLE IF EXISTS business_process_category_links;`);

    await queryRunner.query(`DROP POLICY IF EXISTS business_processes_tenant_isolation ON business_processes;`);
    await queryRunner.query(`ALTER TABLE business_processes DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_business_processes_unique_name;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_business_processes_tenant_status;`);
    await queryRunner.query(`DROP TABLE IF EXISTS business_processes;`);

    await queryRunner.query(
      `DROP POLICY IF EXISTS business_process_categories_tenant_isolation ON business_process_categories;`,
    );
    await queryRunner.query(`ALTER TABLE business_process_categories DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_business_process_categories_unique_name;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_business_process_categories_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS business_process_categories;`);
  }
}
