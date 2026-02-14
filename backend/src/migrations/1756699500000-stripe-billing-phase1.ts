import { MigrationInterface, QueryRunner } from "typeorm";

export class StripeBillingPhase11756699500000 implements MigrationInterface {
  name = 'StripeBillingPhase11756699500000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
          CREATE TYPE subscription_status AS ENUM (
            'incomplete',
            'incomplete_expired',
            'trialing',
            'active',
            'past_due',
            'canceled',
            'unpaid',
            'paused'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_collection_method') THEN
          CREATE TYPE subscription_collection_method AS ENUM (
            'charge_automatically',
            'send_invoice'
          );
        END IF;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS status subscription_status`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS collection_method subscription_collection_method`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start timestamptz`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end timestamptz`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS trial_end timestamptz`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancel_at timestamptz`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS canceled_at timestamptz`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount integer`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_product_id text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_price_id text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS default_payment_method_id text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS latest_invoice_id text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS latest_invoice_status text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS latest_invoice_number text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS latest_invoice_url text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS latest_invoice_pdf text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS days_until_due integer`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_error_code text`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_payment_error_message text`);

    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email text`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_company_name text`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_phone text`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_tax_id text`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_address jsonb DEFAULT '{}'::jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS billing_address`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS billing_tax_id`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS billing_phone`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS billing_company_name`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS billing_email`);

    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS last_payment_error_message`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS last_payment_error_code`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS days_until_due`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS latest_invoice_pdf`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS latest_invoice_url`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS latest_invoice_number`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS latest_invoice_status`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS latest_invoice_id`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS default_payment_method_id`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_price_id`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_product_id`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS amount`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS currency`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS canceled_at`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS cancel_at`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS trial_end`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS current_period_end`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS current_period_start`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS collection_method`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS status`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_collection_method') THEN
          DROP TYPE subscription_collection_method;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
          DROP TYPE subscription_status;
        END IF;
      END $$;
    `);
  }
}
