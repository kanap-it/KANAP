import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationProjectsJunction1785000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(application_id, project_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_application_projects_tenant_id ON application_projects(tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_application_projects_application_id ON application_projects(application_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_application_projects_project_id ON application_projects(project_id);
    `);

    // Enable RLS
    await queryRunner.query(`
      ALTER TABLE application_projects ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'application_projects' AND policyname = 'application_projects_tenant_isolation'
        ) THEN
          CREATE POLICY application_projects_tenant_isolation ON application_projects
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS application_projects;`);
  }
}
