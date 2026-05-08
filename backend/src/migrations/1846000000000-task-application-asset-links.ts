import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaskApplicationAssetLinks1846000000000 implements MigrationInterface {
  name = 'TaskApplicationAssetLinks1846000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE task_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        task_id uuid NOT NULL,
        application_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_task_applications_task
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_task_applications_application
          FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_task_applications_pair ON task_applications (task_id, application_id)`);
    await queryRunner.query(`CREATE INDEX idx_task_applications_tenant_task ON task_applications (tenant_id, task_id)`);
    await queryRunner.query(`CREATE INDEX idx_task_applications_tenant_application ON task_applications (tenant_id, application_id)`);

    await queryRunner.query(`
      CREATE TABLE task_assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        task_id uuid NOT NULL,
        asset_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_task_assets_task
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_task_assets_asset
          FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX uq_task_assets_pair ON task_assets (task_id, asset_id)`);
    await queryRunner.query(`CREATE INDEX idx_task_assets_tenant_task ON task_assets (tenant_id, task_id)`);
    await queryRunner.query(`CREATE INDEX idx_task_assets_tenant_asset ON task_assets (tenant_id, asset_id)`);

    for (const table of ['task_applications', 'task_assets']) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        CREATE POLICY ${table}_tenant_isolation ON ${table}
          USING (tenant_id = app_current_tenant())
          WITH CHECK (tenant_id = app_current_tenant())
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['task_assets', 'task_applications']) {
      await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
  }
}
