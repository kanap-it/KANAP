import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSpendItemsGridIndexes1763071695000 implements MigrationInterface {
  name = 'AddSpendItemsGridIndexes1763071695000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for sorting/filtering by updated_at (dashboard recent updates, grid sorting)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_updated
      ON spend_items(tenant_id, updated_at DESC)
    `);

    // Index for sorting/filtering by created_at (grid default sort)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_created
      ON spend_items(tenant_id, created_at DESC)
    `);

    // Index for filtering/sorting by IT owner
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_owner_it
      ON spend_items(tenant_id, owner_it_id)
    `);

    // Index for filtering/sorting by business owner
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_owner_business
      ON spend_items(tenant_id, owner_business_id)
    `);

    // Index for filtering/sorting by supplier
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_supplier
      ON spend_items(tenant_id, supplier_id)
    `);

    // Index for filtering/sorting by account
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_account
      ON spend_items(tenant_id, account_id)
    `);

    // Index for filtering/sorting by analytics category
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_items_tenant_category
      ON spend_items(tenant_id, analytics_category_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_items_tenant_category`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_items_tenant_account`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_items_tenant_supplier`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_items_tenant_owner_business`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_items_tenant_owner_it`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_items_tenant_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_items_tenant_updated`);
  }
}
