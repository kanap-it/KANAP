import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApplicationsGridIndexes1790000000000 implements MigrationInterface {
  name = 'AddApplicationsGridIndexes1790000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // APPLICATIONS - Grid sorting indexes
    // Matches the pattern used for SpendItems grid performance
    // ============================================================

    // Index for grid sorting by updated_at (recently modified)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_tenant_updated
      ON applications(tenant_id, updated_at DESC)
    `);

    // Index for grid sorting by created_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_tenant_created
      ON applications(tenant_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_applications_tenant_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_applications_tenant_updated`);
  }
}
