import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioRequestCapexOpex1767300000000 implements MigrationInterface {
  name = 'PortfolioRequestCapexOpex1767300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Request CAPEX junction table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_capex (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        capex_id uuid NOT NULL REFERENCES capex_items(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (request_id, capex_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_request_capex_request ON portfolio_request_capex(request_id)`);
    await queryRunner.query(`CREATE INDEX idx_portfolio_request_capex_capex ON portfolio_request_capex(capex_id)`);

    // Request OPEX junction table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_request_opex (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_id uuid NOT NULL REFERENCES portfolio_requests(id) ON DELETE CASCADE,
        opex_id uuid NOT NULL REFERENCES spend_items(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (request_id, opex_id)
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_portfolio_request_opex_request ON portfolio_request_opex(request_id)`);
    await queryRunner.query(`CREATE INDEX idx_portfolio_request_opex_opex ON portfolio_request_opex(opex_id)`);

    // Enable RLS on new tables
    await queryRunner.query(`ALTER TABLE portfolio_request_capex ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_request_opex ENABLE ROW LEVEL SECURITY`);

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY portfolio_request_capex_tenant_isolation ON portfolio_request_capex
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid)
    `);
    await queryRunner.query(`
      CREATE POLICY portfolio_request_opex_tenant_isolation ON portfolio_request_opex
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS portfolio_request_opex_tenant_isolation ON portfolio_request_opex`);
    await queryRunner.query(`DROP POLICY IF EXISTS portfolio_request_capex_tenant_isolation ON portfolio_request_capex`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_request_opex`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_request_capex`);
  }
}
