import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDomainFqdnAliasesToAssets1783000000000 implements MigrationInterface {
  name = 'AddDomainFqdnAliasesToAssets1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns
    await queryRunner.query(`ALTER TABLE assets ADD COLUMN domain text`);
    await queryRunner.query(`ALTER TABLE assets ADD COLUMN fqdn text`);
    await queryRunner.query(`ALTER TABLE assets ADD COLUMN aliases text[]`);

    // Add index for FQDN searchability
    await queryRunner.query(`CREATE INDEX idx_assets_tenant_fqdn ON assets(tenant_id, fqdn)`);

    // Add index for domain lookups
    await queryRunner.query(`CREATE INDEX idx_assets_tenant_domain ON assets(tenant_id, domain)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_tenant_domain`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_assets_tenant_fqdn`);
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN IF EXISTS aliases`);
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN IF EXISTS fqdn`);
    await queryRunner.query(`ALTER TABLE assets DROP COLUMN IF EXISTS domain`);
  }
}
