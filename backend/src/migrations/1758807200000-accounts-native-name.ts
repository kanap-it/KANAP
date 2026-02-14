import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountsNativeName1758807200000 implements MigrationInterface {
  name = 'AccountsNativeName1758807200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS native_name text NULL`);
    await queryRunner.query(`ALTER TABLE accounts ALTER COLUMN updated_at SET DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE accounts DROP COLUMN IF EXISTS native_name`);
  }
}

