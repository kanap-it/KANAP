import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssetProjectsJunction1786000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS asset_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(asset_id, project_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_projects_tenant_id ON asset_projects(tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_projects_asset_id ON asset_projects(asset_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_projects_project_id ON asset_projects(project_id);
    `);

    // Enable RLS
    await queryRunner.query(`
      ALTER TABLE asset_projects ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = 'asset_projects' AND policyname = 'asset_projects_tenant_isolation'
        ) THEN
          CREATE POLICY asset_projects_tenant_isolation ON asset_projects
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS asset_projects;`);
  }
}
