import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioPhaseMilestones1770900000000 implements MigrationInterface {
  name = 'PortfolioPhaseMilestones1770900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================
    // DROP target_delivery_date from Projects
    // ========================
    await queryRunner.query(`
      ALTER TABLE portfolio_projects
        DROP COLUMN IF EXISTS target_delivery_date
    `);

    // ========================
    // PHASE TEMPLATES (Settings - tenant-level)
    // ========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_phase_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        is_system boolean NOT NULL DEFAULT false,
        sequence int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_portfolio_phase_templates_tenant_name
      ON portfolio_phase_templates(tenant_id, name)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_phase_templates_tenant_seq
      ON portfolio_phase_templates(tenant_id, sequence)
    `);

    // Phase Template Items (phases within a template)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_phase_template_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        template_id uuid NOT NULL REFERENCES portfolio_phase_templates(id) ON DELETE CASCADE,
        name text NOT NULL,
        sequence int NOT NULL DEFAULT 0,
        has_milestone boolean NOT NULL DEFAULT true,
        milestone_name text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_phase_template_items_template
      ON portfolio_phase_template_items(template_id, sequence)
    `);

    // ========================
    // PROJECT PHASES
    // ========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_phases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        name text NOT NULL,
        sequence int NOT NULL DEFAULT 0,
        planned_start date,
        planned_end date,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_project_phases_project
      ON portfolio_project_phases(project_id, sequence)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_project_phases_tenant
      ON portfolio_project_phases(tenant_id, project_id)
    `);

    // ========================
    // PROJECT MILESTONES
    // ========================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_project_milestones (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        project_id uuid NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        phase_id uuid REFERENCES portfolio_project_phases(id) ON DELETE CASCADE,
        name text NOT NULL,
        target_date date,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_project_milestones_project
      ON portfolio_project_milestones(project_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_project_milestones_phase
      ON portfolio_project_milestones(phase_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_portfolio_project_milestones_tenant
      ON portfolio_project_milestones(tenant_id, project_id)
    `);

    // ========================
    // RLS POLICIES
    // ========================
    const tables = [
      'portfolio_phase_templates',
      'portfolio_phase_template_items',
      'portfolio_project_phases',
      'portfolio_project_milestones',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
        USING (tenant_id = app_current_tenant()::uuid)
        WITH CHECK (tenant_id = app_current_tenant()::uuid)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    const tables = [
      'portfolio_project_milestones',
      'portfolio_project_phases',
      'portfolio_phase_template_items',
      'portfolio_phase_templates',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }

    // Restore target_delivery_date column
    await queryRunner.query(`
      ALTER TABLE portfolio_projects
        ADD COLUMN IF NOT EXISTS target_delivery_date date
    `);
  }
}
