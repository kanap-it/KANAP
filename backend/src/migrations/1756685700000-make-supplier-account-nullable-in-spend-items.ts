import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeSupplierAccountNullableInSpendItems1756685700000 implements MigrationInterface {
  name = 'MakeSupplierAccountNullableInSpendItems1756685700000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "spend_items" ALTER COLUMN "supplier_id" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "spend_items" ALTER COLUMN "account_id" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "spend_items" SET "supplier_id" = NULL WHERE "supplier_id" IS NULL`);
    await queryRunner.query(`UPDATE "spend_items" SET "account_id" = NULL WHERE "account_id" IS NULL`);
    await queryRunner.query(`ALTER TABLE "spend_items" ALTER COLUMN "supplier_id" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "spend_items" ALTER COLUMN "account_id" SET NOT NULL`);
  }
}

