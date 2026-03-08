import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequestAppAssetJunctions1842000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        request_id UUID NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(request_id, application_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_request_applications_tenant_id
        ON portfolio_request_applications(tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_request_applications_request_id
        ON portfolio_request_applications(request_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_request_applications_application_id
        ON portfolio_request_applications(application_id);
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_request_applications ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE tablename = 'portfolio_request_applications'
            AND policyname = 'portfolio_request_applications_tenant_isolation'
        ) THEN
          CREATE POLICY portfolio_request_applications_tenant_isolation
            ON portfolio_request_applications
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        request_id UUID NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(request_id, asset_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_request_assets_tenant_id
        ON portfolio_request_assets(tenant_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_request_assets_request_id
        ON portfolio_request_assets(request_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_request_assets_asset_id
        ON portfolio_request_assets(asset_id);
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_request_assets ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE tablename = 'portfolio_request_assets'
            AND policyname = 'portfolio_request_assets_tenant_isolation'
        ) THEN
          CREATE POLICY portfolio_request_assets_tenant_isolation
            ON portfolio_request_assets
            USING (tenant_id = app_current_tenant())
            WITH CHECK (tenant_id = app_current_tenant());
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_request_assets;`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_request_applications;`);
  }
}
