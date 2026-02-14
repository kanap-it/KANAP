import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPortfolioFilterIndexes1788000000000 implements MigrationInterface {
  name = 'AddPortfolioFilterIndexes1788000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // PORTFOLIO PROJECTS - Additional filter indexes
    // Existing indexes: tenant_id+name, tenant_id+status, tenant_id+company_id
    // ============================================================

    // Index for filtering by project type
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_projects_tenant_type
      ON portfolio_projects(tenant_id, type_id)
    `);

    // Index for filtering by category
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_projects_tenant_category
      ON portfolio_projects(tenant_id, category_id)
    `);

    // Index for filtering by stream
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_projects_tenant_stream
      ON portfolio_projects(tenant_id, stream_id)
    `);

    // Index for filtering by department
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_projects_tenant_department
      ON portfolio_projects(tenant_id, department_id)
    `);

    // Index for grid sorting by updated_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_projects_tenant_updated
      ON portfolio_projects(tenant_id, updated_at DESC)
    `);

    // ============================================================
    // PORTFOLIO REQUESTS - Additional filter indexes
    // Existing indexes: tenant_id+name, tenant_id+status, tenant_id+company_id
    // ============================================================

    // Index for filtering by request type
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_tenant_type
      ON portfolio_requests(tenant_id, type_id)
    `);

    // Index for filtering by category
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_tenant_category
      ON portfolio_requests(tenant_id, category_id)
    `);

    // Index for filtering by stream
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_tenant_stream
      ON portfolio_requests(tenant_id, stream_id)
    `);

    // Index for filtering by department
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_tenant_department
      ON portfolio_requests(tenant_id, department_id)
    `);

    // Index for filtering by requestor
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_tenant_requestor
      ON portfolio_requests(tenant_id, requestor_id)
    `);

    // Index for grid sorting by updated_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_requests_tenant_updated
      ON portfolio_requests(tenant_id, updated_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop requests indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_tenant_updated`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_tenant_requestor`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_tenant_department`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_tenant_stream`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_tenant_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_requests_tenant_type`);

    // Drop projects indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_projects_tenant_updated`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_projects_tenant_department`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_projects_tenant_stream`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_projects_tenant_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_projects_tenant_type`);
  }
}
