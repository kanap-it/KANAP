import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApplicationCriticalityDefault1807000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add default for criticality (importable field but not required in CSV)
    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN criticality SET DEFAULT 'medium'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN criticality DROP DEFAULT
    `);
  }
}
