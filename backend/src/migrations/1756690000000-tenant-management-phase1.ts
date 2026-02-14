import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantManagementPhase11756690000000 implements MigrationInterface {
  name = 'TenantManagementPhase11756690000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tenant status enum
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_status') THEN
          CREATE TYPE tenant_status AS ENUM ('active', 'frozen', 'deleting', 'deleted');
        END IF;
      END $$;
    `);

    // Drop existing unique constraint on tenants.slug to replace with filtered unique index
    await queryRunner.query(`ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_slug_key`);

    // Alter status column to use enum and default
    await queryRunner.query(`ALTER TABLE tenants ALTER COLUMN status DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE tenants ALTER COLUMN status TYPE tenant_status USING status::tenant_status`);
    await queryRunner.query(`ALTER TABLE tenants ALTER COLUMN status SET DEFAULT 'active'::tenant_status`);

    // Lifecycle columns
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS frozen_at timestamptz`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS frozen_by uuid`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deletion_requested_by uuid`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deletion_confirmed_at timestamptz`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at timestamptz`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deletion_reason text`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deletion_token uuid`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notes text`);
    await queryRunner.query(`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb`);

    // Filtered indexes for status and slug reuse
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_status_active
      ON tenants(status)
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_slug_active
      ON tenants(slug)
      WHERE deleted_at IS NULL
    `);

    // Subscription enums
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_billing_period') THEN
          CREATE TYPE subscription_billing_period AS ENUM ('monthly', 'annual');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_payment_mode') THEN
          CREATE TYPE subscription_payment_mode AS ENUM ('card', 'bank_transfer');
        END IF;
      END $$;
    `);

    // Extend subscriptions table
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscription_type subscription_billing_period`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_mode subscription_payment_mode`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS active_seats integer`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS next_payment_at timestamptz`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS last_synced_at timestamptz`);
    await queryRunner.query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notes text`);

    await queryRunner.query(`ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`UPDATE subscriptions SET subscription_type = 'monthly' WHERE subscription_type IS NULL`);
    await queryRunner.query(`UPDATE subscriptions SET payment_mode = 'card' WHERE payment_mode IS NULL`);
    await queryRunner.query(`UPDATE subscriptions SET active_seats = COALESCE(active_seats, seat_limit, 0)`);
    await queryRunner.query(`UPDATE subscriptions SET last_synced_at = COALESCE(last_synced_at, now())`);

    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN subscription_type SET DEFAULT 'monthly'::subscription_billing_period`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN payment_mode SET DEFAULT 'card'::subscription_payment_mode`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN active_seats SET DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN subscription_type SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN payment_mode SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN active_seats SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN active_seats DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN active_seats DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN payment_mode DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN payment_mode DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN subscription_type DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN subscription_type DROP NOT NULL`);

    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS notes`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS last_synced_at`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS next_payment_at`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS active_seats`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS payment_mode`);
    await queryRunner.query(`ALTER TABLE subscriptions DROP COLUMN IF EXISTS subscription_type`);

    await queryRunner.query(`DROP TYPE IF EXISTS subscription_payment_mode`);
    await queryRunner.query(`DROP TYPE IF EXISTS subscription_billing_period`);

    await queryRunner.query(`DROP INDEX IF EXISTS uq_tenants_slug_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tenants_status_active`);

    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS metadata`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS notes`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS deletion_token`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS deletion_reason`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS deleted_at`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS deletion_confirmed_at`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS deletion_requested_by`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS deletion_requested_at`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS frozen_by`);
    await queryRunner.query(`ALTER TABLE tenants DROP COLUMN IF EXISTS frozen_at`);

    await queryRunner.query(`ALTER TABLE tenants ALTER COLUMN status SET DATA TYPE text USING status::text`);
    await queryRunner.query(`ALTER TABLE tenants ALTER COLUMN status SET DEFAULT 'active'`);

    await queryRunner.query(`DROP TYPE IF EXISTS tenant_status`);

    await queryRunner.query(`ALTER TABLE tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug)`);
  }
}
