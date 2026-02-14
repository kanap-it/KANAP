import { MigrationInterface, QueryRunner } from "typeorm";

export class DropPaymentTermsFromSpendItems1756686000000 implements MigrationInterface {
  name = 'DropPaymentTermsFromSpendItems1756686000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spend_items" DROP COLUMN IF EXISTS "payment_terms"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spend_items" ADD COLUMN IF NOT EXISTS "payment_terms" text NULL`);
  }
}

