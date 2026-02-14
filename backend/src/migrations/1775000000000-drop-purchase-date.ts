import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPurchaseDate1775000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS purchase_date;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS purchase_date date NULL;`);
  }
}
