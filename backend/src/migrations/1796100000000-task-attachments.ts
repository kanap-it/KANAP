import { MigrationInterface, QueryRunner } from 'typeorm';

export class TaskAttachments1796100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE task_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        original_filename TEXT NOT NULL,
        stored_filename TEXT NOT NULL,
        mime_type TEXT,
        size INT NOT NULL DEFAULT 0,
        storage_path TEXT NOT NULL,
        uploaded_by_id UUID,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_task_attachments_tenant_task
      ON task_attachments(tenant_id, task_id)
    `);

    // Row-level security
    await queryRunner.query(`
      ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      ALTER TABLE task_attachments FORCE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      CREATE POLICY task_attachments_tenant_isolation ON task_attachments
      FOR ALL
      USING (tenant_id = current_setting('app.current_tenant')::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS task_attachments`);
  }
}
