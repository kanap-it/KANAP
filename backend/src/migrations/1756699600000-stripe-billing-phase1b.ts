import { MigrationInterface, QueryRunner } from "typeorm";

export class StripeBillingPhase1B1756699600000 implements MigrationInterface {
  name = 'StripeBillingPhase1B1756699600000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id text`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_stripe_customer ON tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_tenants_stripe_customer`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS stripe_customer_id`);
  }
}
