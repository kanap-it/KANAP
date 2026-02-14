import { MigrationInterface, QueryRunner } from "typeorm";

export class BillingSubscriptionSync1756699800000 implements MigrationInterface {
  name = 'BillingSubscriptionSync1756699800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at_effective timestamptz`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS default_payment_method_brand text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS default_payment_method_last4 text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS latest_invoice_amount integer`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS latest_invoice_currency text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS latest_invoice_created timestamptz`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS latest_invoice_created`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS latest_invoice_currency`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS latest_invoice_amount`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS default_payment_method_last4`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS default_payment_method_brand`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS canceled_at_effective`);
  }
}
