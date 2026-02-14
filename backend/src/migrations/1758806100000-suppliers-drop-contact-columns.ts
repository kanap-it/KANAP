import { MigrationInterface, QueryRunner } from "typeorm";

export class SuppliersDropContactColumns1758806100000 implements MigrationInterface {
  name = 'SuppliersDropContactColumns1758806100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE suppliers DROP COLUMN IF EXISTS commercial_contact`);
    await queryRunner.query(`ALTER TABLE suppliers DROP COLUMN IF EXISTS technical_contact`);
    await queryRunner.query(`ALTER TABLE suppliers DROP COLUMN IF EXISTS support_contact`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS commercial_contact text NULL`);
    await queryRunner.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS technical_contact text NULL`);
    await queryRunner.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS support_contact text NULL`);
  }
}

