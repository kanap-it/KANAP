import { MigrationInterface, QueryRunner } from "typeorm";

export class BillingProfileInfo1756699700000 implements MigrationInterface {
  name = 'BillingProfileInfo1756699700000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_customer_info jsonb DEFAULT '{}'::jsonb`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_invoice_info jsonb DEFAULT '{}'::jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS billing_invoice_info`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS billing_customer_info`);
  }
}
