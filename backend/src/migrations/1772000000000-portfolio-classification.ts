import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioClassification1772000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // Step 1: Create new classification tables
    // ============================================

    // Portfolio Types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        display_order int NOT NULL DEFAULT 0,
        is_system boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, name)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_portfolio_types_tenant_order
      ON portfolio_types(tenant_id, display_order)
    `);

    // Portfolio Categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        display_order int NOT NULL DEFAULT 0,
        is_system boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, name)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_portfolio_categories_tenant_order
      ON portfolio_categories(tenant_id, display_order)
    `);

    // Portfolio Streams
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_streams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        category_id uuid NOT NULL REFERENCES portfolio_categories(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        display_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, category_id, name)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_portfolio_streams_tenant_category_order
      ON portfolio_streams(tenant_id, category_id, display_order)
    `);

    // ============================================
    // Step 2: Enable RLS on new tables
    // ============================================

    for (const table of ['portfolio_types', 'portfolio_categories', 'portfolio_streams']) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation
        ON ${table}
        USING (tenant_id = app_current_tenant()::uuid)
        WITH CHECK (tenant_id = app_current_tenant()::uuid)
      `);
    }

    // ============================================
    // Step 3: Add new FK columns to requests/projects
    // ============================================

    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES portfolio_types(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES portfolio_categories(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS stream_id uuid REFERENCES portfolio_streams(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_projects
      ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES portfolio_types(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES portfolio_categories(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS stream_id uuid REFERENCES portfolio_streams(id) ON DELETE SET NULL
    `);

    // ============================================
    // Step 4: Seed default data for each tenant and migrate existing data
    // ============================================

    // Get all distinct tenants from requests and projects
    const tenants = await queryRunner.query(`
      SELECT DISTINCT tenant_id FROM (
        SELECT tenant_id FROM portfolio_requests
        UNION
        SELECT tenant_id FROM portfolio_projects
      ) t
    `);

    for (const { tenant_id } of tenants) {
      // Insert default types
      await queryRunner.query(`
        INSERT INTO portfolio_types (tenant_id, name, description, display_order, is_system)
        VALUES
          ($1, 'IT', 'Internal IT initiative', 0, true),
          ($1, 'Business', 'Business-driven request', 1, true),
          ($1, 'Compliance', 'Regulatory or compliance requirement', 2, true)
        ON CONFLICT (tenant_id, name) DO NOTHING
      `, [tenant_id]);

      // Insert default categories
      await queryRunner.query(`
        INSERT INTO portfolio_categories (tenant_id, name, description, display_order, is_system)
        VALUES
          ($1, 'Business Applications', 'ERP, CRM, and business software systems', 0, true),
          ($1, 'End-user Computing & Services', 'Workplace, devices, and end-user support', 1, true),
          ($1, 'Infrastructure & Operations', 'Network, servers, cloud, and data center', 2, true),
          ($1, 'Innovation & Digital Transformation', 'New technologies, analytics, and digital initiatives', 3, true)
        ON CONFLICT (tenant_id, name) DO NOTHING
      `, [tenant_id]);

      // Get category IDs for stream insertion
      const categories = await queryRunner.query(`
        SELECT id, name FROM portfolio_categories WHERE tenant_id = $1
      `, [tenant_id]);

      const categoryMap: Record<string, string> = {};
      for (const cat of categories) {
        categoryMap[cat.name] = cat.id;
      }

      // Insert default streams
      const defaultStreams = [
        // Business Applications
        { category: 'Business Applications', name: 'SAP Sales & Distribution', order: 0 },
        { category: 'Business Applications', name: 'SAP Finance & Controlling', order: 1 },
        { category: 'Business Applications', name: 'SAP Production Planning', order: 2 },
        { category: 'Business Applications', name: 'SAP HR / HCM', order: 3 },
        { category: 'Business Applications', name: 'CRM / Dynamics', order: 4 },
        { category: 'Business Applications', name: 'ERP (Other)', order: 5 },
        { category: 'Business Applications', name: 'Reporting & BI', order: 6 },
        { category: 'Business Applications', name: 'Interfaces & Integration', order: 7 },
        // End-user Computing & Services
        { category: 'End-user Computing & Services', name: 'Workplace & Collaboration', order: 0 },
        { category: 'End-user Computing & Services', name: 'Mobile Devices & MDM', order: 1 },
        { category: 'End-user Computing & Services', name: 'Printing & Peripherals', order: 2 },
        { category: 'End-user Computing & Services', name: 'Service Desk', order: 3 },
        // Infrastructure & Operations
        { category: 'Infrastructure & Operations', name: 'Network & Security', order: 0 },
        { category: 'Infrastructure & Operations', name: 'Virtual Infrastructure', order: 1 },
        { category: 'Infrastructure & Operations', name: 'Cloud (AWS/Azure/GCP)', order: 2 },
        { category: 'Infrastructure & Operations', name: 'Storage & Backup', order: 3 },
        { category: 'Infrastructure & Operations', name: 'Databases', order: 4 },
        { category: 'Infrastructure & Operations', name: 'Interfaces & Integration', order: 5 },
        // Innovation & Digital Transformation
        { category: 'Innovation & Digital Transformation', name: 'Data & Analytics', order: 0 },
        { category: 'Innovation & Digital Transformation', name: 'AI & Automation', order: 1 },
        { category: 'Innovation & Digital Transformation', name: 'Web & Mobile Development', order: 2 },
        { category: 'Innovation & Digital Transformation', name: 'IoT & Edge', order: 3 },
      ];

      for (const stream of defaultStreams) {
        const categoryId = categoryMap[stream.category];
        if (categoryId) {
          await queryRunner.query(`
            INSERT INTO portfolio_streams (tenant_id, category_id, name, display_order)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (tenant_id, category_id, name) DO NOTHING
          `, [tenant_id, categoryId, stream.name, stream.order]);
        }
      }

      // ============================================
      // Step 5: Migrate existing data for this tenant
      // ============================================

      // Get type IDs
      const types = await queryRunner.query(`
        SELECT id, name FROM portfolio_types WHERE tenant_id = $1
      `, [tenant_id]);
      const typeMap: Record<string, string> = {};
      for (const t of types) {
        typeMap[t.name.toLowerCase()] = t.id;
      }

      // Category mapping: old enum values to new names
      const oldCategoryToNew: Record<string, string> = {
        'business_applications': 'Business Applications',
        'end_user_computing': 'End-user Computing & Services',
        'infrastructure_operations': 'Infrastructure & Operations',
        'innovation_digital': 'Innovation & Digital Transformation',
        'security_compliance': 'Infrastructure & Operations', // Map to Infra, but set type to Compliance
      };

      // Migrate requests
      // First, handle security_compliance specially - set type to Compliance
      await queryRunner.query(`
        UPDATE portfolio_requests
        SET type_id = $2
        WHERE tenant_id = $1 AND category = 'security_compliance'
      `, [tenant_id, typeMap['compliance']]);

      // Map type field: 'it' -> IT, 'business' -> Business
      await queryRunner.query(`
        UPDATE portfolio_requests
        SET type_id = $2
        WHERE tenant_id = $1 AND type = 'it' AND type_id IS NULL
      `, [tenant_id, typeMap['it']]);

      await queryRunner.query(`
        UPDATE portfolio_requests
        SET type_id = $2
        WHERE tenant_id = $1 AND type = 'business' AND type_id IS NULL
      `, [tenant_id, typeMap['business']]);

      // Map category field to category_id
      for (const [oldCat, newCat] of Object.entries(oldCategoryToNew)) {
        const catId = categoryMap[newCat];
        if (catId) {
          await queryRunner.query(`
            UPDATE portfolio_requests
            SET category_id = $2
            WHERE tenant_id = $1 AND category = $3
          `, [tenant_id, catId, oldCat]);
        }
      }

      // Migrate projects
      // Check if projects table has a 'type' column (it might have been removed)
      const projectCols = await queryRunner.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'portfolio_projects' AND column_name = 'type'
      `);
      const projectHasType = projectCols.length > 0;

      if (projectHasType) {
        // Handle security_compliance specially
        await queryRunner.query(`
          UPDATE portfolio_projects
          SET type_id = $2
          WHERE tenant_id = $1 AND category = 'security_compliance'
        `, [tenant_id, typeMap['compliance']]);

        // Map type field
        await queryRunner.query(`
          UPDATE portfolio_projects
          SET type_id = $2
          WHERE tenant_id = $1 AND type = 'it' AND type_id IS NULL
        `, [tenant_id, typeMap['it']]);

        await queryRunner.query(`
          UPDATE portfolio_projects
          SET type_id = $2
          WHERE tenant_id = $1 AND type = 'business' AND type_id IS NULL
        `, [tenant_id, typeMap['business']]);
      }

      // Map category field to category_id for projects
      for (const [oldCat, newCat] of Object.entries(oldCategoryToNew)) {
        const catId = categoryMap[newCat];
        if (catId) {
          await queryRunner.query(`
            UPDATE portfolio_projects
            SET category_id = $2
            WHERE tenant_id = $1 AND category = $3
          `, [tenant_id, catId, oldCat]);
        }
      }
    }

    // ============================================
    // Step 6: Drop old columns
    // ============================================

    // Drop old type and category columns from requests
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      DROP COLUMN IF EXISTS type,
      DROP COLUMN IF EXISTS category
    `);

    // Drop old type and category columns from projects
    await queryRunner.query(`
      ALTER TABLE portfolio_projects
      DROP COLUMN IF EXISTS type,
      DROP COLUMN IF EXISTS category
    `);

    // ============================================
    // Step 7: Create indexes on new FK columns
    // ============================================

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_type_id
      ON portfolio_requests(type_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_category_id
      ON portfolio_requests(category_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_stream_id
      ON portfolio_requests(stream_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_projects_type_id
      ON portfolio_projects(type_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_projects_category_id
      ON portfolio_projects(category_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_projects_stream_id
      ON portfolio_projects(stream_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_type_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_category_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_stream_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_projects_type_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_projects_category_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_projects_stream_id`);

    // Re-add old columns
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      ADD COLUMN IF NOT EXISTS type text DEFAULT 'business',
      ADD COLUMN IF NOT EXISTS category text
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_projects
      ADD COLUMN IF NOT EXISTS type text DEFAULT 'business',
      ADD COLUMN IF NOT EXISTS category text
    `);

    // Drop new FK columns
    await queryRunner.query(`
      ALTER TABLE portfolio_requests
      DROP COLUMN IF EXISTS type_id,
      DROP COLUMN IF EXISTS category_id,
      DROP COLUMN IF EXISTS stream_id
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_projects
      DROP COLUMN IF EXISTS type_id,
      DROP COLUMN IF EXISTS category_id,
      DROP COLUMN IF EXISTS stream_id
    `);

    // Drop new tables (in reverse order due to FK)
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_streams CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_categories CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_types CASCADE`);
  }
}
