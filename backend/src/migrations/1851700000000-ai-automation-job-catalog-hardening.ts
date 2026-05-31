import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiAutomationJobCatalogHardening1851700000000 implements MigrationInterface {
  name = 'AiAutomationJobCatalogHardening1851700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE ai_automation_job_catalog SET environment = lower(btrim(environment))`);
    await queryRunner.query(`
      ALTER TABLE ai_automation_job_catalog
      DROP CONSTRAINT IF EXISTS chk_ai_automation_job_catalog_environment
    `);
    await queryRunner.query(`
      ALTER TABLE ai_automation_job_catalog
      ADD CONSTRAINT chk_ai_automation_job_catalog_environment
      CHECK (environment = lower(btrim(environment)) AND environment IN ('mock', 'lab', 'sandbox', 'staging', 'production'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ai_automation_job_catalog
      DROP CONSTRAINT IF EXISTS chk_ai_automation_job_catalog_environment
    `);
  }
}
