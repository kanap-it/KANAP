import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivityUpdatedAt1802000000000 implements MigrationInterface {
  name = 'AddActivityUpdatedAt1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_activities
      ADD COLUMN updated_at timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_activities
      DROP COLUMN updated_at
    `);
  }
}
