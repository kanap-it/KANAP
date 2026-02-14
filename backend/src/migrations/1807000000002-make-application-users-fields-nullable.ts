import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeApplicationUsersFieldsNullable1807000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make users_year nullable (export-only field, not in CSV import template)
    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN users_year DROP NOT NULL
    `);

    // Make users_mode nullable (export-only field, not in CSV import template)
    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN users_mode DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Set defaults for any nulls before making not null again
    await queryRunner.query(`
      UPDATE applications SET users_year = EXTRACT(YEAR FROM CURRENT_DATE) WHERE users_year IS NULL
    `);
    await queryRunner.query(`
      UPDATE applications SET users_mode = 'it_users' WHERE users_mode IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN users_year SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE applications
      ALTER COLUMN users_mode SET NOT NULL
    `);
  }
}
