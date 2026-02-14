import { MigrationInterface, QueryRunner } from "typeorm";

export class TasksTenantDefault1756695100000 implements MigrationInterface {
  name = 'TasksTenantDefault1756695100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure tenant default and not-null to satisfy RLS WITH CHECK on insert
    await queryRunner.query(`ALTER TABLE tasks ALTER COLUMN tenant_id SET DEFAULT app_current_tenant()`);
    await queryRunner.query(`ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_tenant_id`);
    await queryRunner.query(`ALTER TABLE tasks ALTER COLUMN tenant_id DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE tasks ALTER COLUMN tenant_id DROP DEFAULT`);
  }
}

