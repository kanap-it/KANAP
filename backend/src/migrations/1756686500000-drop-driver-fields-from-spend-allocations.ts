import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropDriverFieldsFromSpendAllocations1756686500000 implements MigrationInterface {
  name = 'DropDriverFieldsFromSpendAllocations1756686500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spend_allocations" DROP COLUMN IF EXISTS "driver_type"`);
    await queryRunner.query(`ALTER TABLE "spend_allocations" DROP COLUMN IF EXISTS "driver_note"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spend_allocations" ADD COLUMN "driver_note" text NULL`);
    await queryRunner.query(`ALTER TABLE "spend_allocations" ADD COLUMN "driver_type" text NULL`);
  }
}

