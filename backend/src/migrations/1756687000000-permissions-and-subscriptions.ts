import { MigrationInterface, QueryRunner } from "typeorm";

export class PermissionsAndSubscriptions1756687000000 implements MigrationInterface {
  name = 'PermissionsAndSubscriptions1756687000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // user_page_roles
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_page_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource text NOT NULL,
        level text NOT NULL CHECK (level IN ('reader','manager','admin')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, resource)
      );
    `);

    // subscriptions (single row expected per tenant)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_name text,
        seat_limit integer NOT NULL DEFAULT 5,
        stripe_customer_id text,
        stripe_subscription_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_page_roles`);
    await queryRunner.query(`DROP TABLE IF EXISTS subscriptions`);
  }
}
