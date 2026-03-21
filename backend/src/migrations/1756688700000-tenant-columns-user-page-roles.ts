import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantColumnsUserPageRoles1756688700000 implements MigrationInterface {
  name = 'TenantColumnsUserPageRoles1756688700000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const t = 'user_page_roles';
    await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS tenant_id uuid`);
    await queryRunner.query(`UPDATE ${t} SET tenant_id = (SELECT id FROM tenants ORDER BY created_at, id LIMIT 1) WHERE tenant_id IS NULL`);
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN tenant_id SET DEFAULT app_current_tenant()`);
    await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN tenant_id SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_${t}_tenant_id ON ${t}(tenant_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = 'user_page_roles';
    await queryRunner.query(`DROP INDEX IF EXISTS idx_${t}_tenant_id`);
    await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS tenant_id`);
  }
}
