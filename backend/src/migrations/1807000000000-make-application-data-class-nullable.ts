import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeApplicationDataClassNullable1807000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make data_class column nullable
    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN data_class DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Set default value for any nulls before making not null again
    await queryRunner.query(`
      UPDATE applications SET data_class = 'internal' WHERE data_class IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN data_class SET NOT NULL
    `);
  }
}
