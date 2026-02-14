import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantColumnsSpendContracts1756687800000 implements MigrationInterface {
  name = 'TenantColumnsSpendContracts1756687800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'spend_items','spend_versions','spend_amounts','spend_allocations','spend_tasks',
      'contracts','contract_tasks','contract_spend_items','contract_attachments','contract_links',
      'company_metrics','department_metrics'
    ];
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS tenant_id uuid`);
      await queryRunner.query(`UPDATE ${t} SET tenant_id = (SELECT id FROM tenants WHERE slug='lohr') WHERE tenant_id IS NULL`);
      await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN tenant_id SET DEFAULT app_current_tenant()`);
      await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN tenant_id SET NOT NULL`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_${t}_tenant_id ON ${t}(tenant_id)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'spend_items','spend_versions','spend_amounts','spend_allocations','spend_tasks',
      'contracts','contract_tasks','contract_spend_items','contract_attachments','contract_links',
      'company_metrics','department_metrics'
    ];
    for (const t of tables) {
      await queryRunner.query(`DROP INDEX IF EXISTS idx_${t}_tenant_id`);
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS tenant_id`);
    }
  }
}

