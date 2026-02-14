import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncStatusFromDisabledAt1758803100000 implements MigrationInterface {
  name = 'SyncStatusFromDisabledAt1758803100000';

  private readonly tables = [
    'analytics_categories',
    'accounts',
    'suppliers',
    'contracts',
    'companies',
    'departments',
    'spend_items',
    'capex_items',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        UPDATE ${table}
        SET status = CASE
          WHEN disabled_at IS NULL OR disabled_at > NOW() THEN 'enabled'::status_state
          ELSE 'disabled'::status_state
        END
        WHERE status IS DISTINCT FROM CASE
          WHEN disabled_at IS NULL OR disabled_at > NOW() THEN 'enabled'::status_state
          ELSE 'disabled'::status_state
        END;
      `);

      await queryRunner.query(`
        UPDATE ${table}
        SET disabled_at = NOW()
        WHERE status = 'disabled'::status_state AND disabled_at IS NULL;
      `);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // No-op: status values continue to be derived from disabled_at timestamps.
  }
}
