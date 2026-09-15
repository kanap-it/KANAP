import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogRecordCreatorIndex1853550000000 implements MigrationInterface {
  name = 'AuditLogRecordCreatorIndex1853550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Workspace history headers resolve the creation author from the audit
    // trail (portfolio_projects has no creator column, tasks.creator_id is the
    // requestor). Without this index that lookup scans every audit row of the
    // tenant on each record open.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_record_created
      ON audit_log(tenant_id, record_id, created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_log_tenant_record_created`);
  }
}
