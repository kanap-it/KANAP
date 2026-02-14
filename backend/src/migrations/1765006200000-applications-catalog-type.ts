import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationsCatalogType1765006200000 implements MigrationInterface {
  name = 'ApplicationsCatalogType1765006200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications ADD COLUMN catalog_type text NOT NULL DEFAULT 'application'`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_applications_tenant_catalog_type ON applications(tenant_id, catalog_type)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_applications_tenant_catalog_type`);
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS catalog_type`);
  }
}
