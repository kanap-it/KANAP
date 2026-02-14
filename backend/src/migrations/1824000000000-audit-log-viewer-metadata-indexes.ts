import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogViewerMetadataIndexes1824000000000 implements MigrationInterface {
  name = 'AuditLogViewerMetadataIndexes1824000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS source text`);
    await queryRunner.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS source_ref text`);

    await queryRunner.query(`ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      UPDATE audit_log
      SET source = CASE WHEN user_id IS NULL THEN 'system' ELSE 'user' END
      WHERE source IS NULL
    `);
    await queryRunner.query(`ALTER TABLE audit_log ALTER COLUMN source SET DEFAULT 'user'`);
    await queryRunner.query(`ALTER TABLE audit_log ALTER COLUMN source SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE audit_log FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created_at
      ON audit_log(tenant_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_source_created_at
      ON audit_log(tenant_id, source, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_user_created_at
      ON audit_log(tenant_id, user_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_log_tenant_user_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_log_tenant_source_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_log_tenant_created_at`);

    await queryRunner.query(`ALTER TABLE audit_log ALTER COLUMN source DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE audit_log ALTER COLUMN source DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE audit_log DROP COLUMN IF EXISTS source_ref`);
    await queryRunner.query(`ALTER TABLE audit_log DROP COLUMN IF EXISTS source`);
  }
}
