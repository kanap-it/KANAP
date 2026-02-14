import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReverseLookupIndexes1789000000000 implements MigrationInterface {
  name = 'AddReverseLookupIndexes1789000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // APPLICATIONS - Supplier filter index
    // ============================================================

    // Index for filtering applications by supplier
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_tenant_supplier
      ON applications(tenant_id, supplier_id)
    `);

    // ============================================================
    // JUNCTION TABLE REVERSE LOOKUPS
    // These enable efficient queries from the "other side" of the relationship
    // ============================================================

    // Reverse lookup: find all applications linked to a spend item
    // Used when viewing a spend item's related applications
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_application_spend_items_spend
      ON application_spend_items(spend_item_id)
    `);

    // Reverse lookup: find all incoming relations to an asset
    // Used when viewing "what depends on this asset" or "what contains this asset"
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asset_relations_related
      ON asset_relations(tenant_id, related_asset_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_asset_relations_related`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_application_spend_items_spend`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_applications_tenant_supplier`);
  }
}
