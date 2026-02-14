import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCapexItemsGridIndexes1787000000000 implements MigrationInterface {
  name = 'AddCapexItemsGridIndexes1787000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // CAPEX ITEMS INDEXES (parity with spend_items)
    // ============================================================

    // Index for sorting/filtering by updated_at (dashboard recent updates, grid sorting)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_items_tenant_updated
      ON capex_items(tenant_id, updated_at DESC)
    `);

    // Index for sorting/filtering by created_at (grid default sort)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_items_tenant_created
      ON capex_items(tenant_id, created_at DESC)
    `);

    // Index for filtering/sorting by supplier
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_items_tenant_supplier
      ON capex_items(tenant_id, supplier_id)
    `);

    // Index for filtering/sorting by account
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_items_tenant_account
      ON capex_items(tenant_id, account_id)
    `);

    // Index for filtering by linked project
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_items_tenant_project
      ON capex_items(tenant_id, project_id)
    `);

    // ============================================================
    // CAPEX VERSIONS INDEXES (parity with spend_versions)
    // ============================================================

    // Composite index for version lookups by item and year (most common query pattern)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_versions_tenant_item_year
      ON capex_versions(tenant_id, capex_item_id, budget_year)
    `);

    // Index for year-based filtering across all items (budget reports)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_capex_versions_tenant_year
      ON capex_versions(tenant_id, budget_year)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_versions_tenant_year`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_versions_tenant_item_year`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_tenant_project`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_tenant_account`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_tenant_supplier`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_tenant_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_items_tenant_updated`);
  }
}
