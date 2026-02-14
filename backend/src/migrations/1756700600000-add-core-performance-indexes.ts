import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCorePerformanceIndexes1756700600000 implements MigrationInterface {
  name = 'AddCorePerformanceIndexes1756700600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_versions_tenant_item_year
      ON spend_versions(tenant_id, spend_item_id, budget_year)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_versions_tenant_year
      ON spend_versions(tenant_id, budget_year)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_amounts_version_period
      ON spend_amounts(version_id, period)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_allocations_version
      ON spend_allocations(version_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_company_metrics_tenant_year_company
      ON company_metrics(tenant_id, fiscal_year, company_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_company_metrics_tenant_year_company`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_allocations_version`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_amounts_version_period`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_versions_tenant_year`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_versions_tenant_item_year`);
  }
}
