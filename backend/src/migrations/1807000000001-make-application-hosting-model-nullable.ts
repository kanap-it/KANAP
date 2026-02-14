import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeApplicationHostingModelNullable1807000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make hosting_model column nullable (deprecated field)
    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN hosting_model DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Set default value for any nulls before making not null again
    await queryRunner.query(`
      UPDATE applications SET hosting_model = 'saas' WHERE hosting_model IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN hosting_model SET NOT NULL
    `);
  }
}
