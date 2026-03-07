import { MigrationInterface, QueryRunner } from 'typeorm';

export class IntegratedDocsCleanup1841000001000 implements MigrationInterface {
  name = 'IntegratedDocsCleanup1841000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Intentionally a no-op.
    //
    // The original implementation deleted legacy inline-attachment rows and dropped the
    // request/project source columns immediately after foundation setup. That made the
    // rollout irreversible before the explicit backfill + verification steps had run.
    //
    // Keep the legacy source intact for future environments. Once integrated documents
    // are backfilled and verified in QA/prod, cleanup must happen in a separate,
    // explicitly gated migration or operational step.
    await queryRunner.query(`SELECT 1`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`SELECT 1`);
  }
}
