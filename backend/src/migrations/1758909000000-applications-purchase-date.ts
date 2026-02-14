import { MigrationInterface, QueryRunner } from "typeorm";

export class ApplicationsPurchaseDate1758909000000 implements MigrationInterface {
  name = 'ApplicationsPurchaseDate1758909000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS purchase_date date NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE applications DROP COLUMN IF EXISTS purchase_date`);
  }
}

