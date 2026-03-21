import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantColumnsSuppliersAccountsUniques1756687400000 implements MigrationInterface {
  name = 'TenantColumnsSuppliersAccountsUniques1756687400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Suppliers
    await queryRunner.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tenant_id uuid`);
    await queryRunner.query(`UPDATE suppliers SET tenant_id = (SELECT id FROM tenants ORDER BY created_at, id LIMIT 1) WHERE tenant_id IS NULL`);
    await queryRunner.query(`ALTER TABLE suppliers ALTER COLUMN tenant_id SET DEFAULT app_current_tenant()`);
    await queryRunner.query(`ALTER TABLE suppliers ALTER COLUMN tenant_id SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id)`);
    // Add unique per tenant on (tenant_id, name)
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'suppliers' AND c.conname = 'uq_suppliers_tenant_name'
      ) THEN
        ALTER TABLE suppliers ADD CONSTRAINT uq_suppliers_tenant_name UNIQUE (tenant_id, name);
      END IF;
    END $$;`);

    // Accounts
    await queryRunner.query(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tenant_id uuid`);
    await queryRunner.query(`UPDATE accounts SET tenant_id = (SELECT id FROM tenants ORDER BY created_at, id LIMIT 1) WHERE tenant_id IS NULL`);
    await queryRunner.query(`ALTER TABLE accounts ALTER COLUMN tenant_id SET DEFAULT app_current_tenant()`);
    await queryRunner.query(`ALTER TABLE accounts ALTER COLUMN tenant_id SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id)`);
    // Drop global unique on account_number and add composite
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'accounts' AND c.conname = 'accounts_account_number_key'
      ) THEN
        ALTER TABLE accounts DROP CONSTRAINT accounts_account_number_key;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'accounts' AND c.conname = 'uq_accounts_tenant_number'
      ) THEN
        ALTER TABLE accounts ADD CONSTRAINT uq_accounts_tenant_number UNIQUE (tenant_id, account_number);
      END IF;
    END $$;`);

    // Users: drop global unique email and add composite unique
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'users' AND c.conname = 'users_email_key'
      ) THEN
        ALTER TABLE users DROP CONSTRAINT users_email_key;
      END IF;
    END $$;`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'users' AND c.conname = 'uq_users_tenant_email'
      ) THEN
        ALTER TABLE users ADD CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email);
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_tenant_email`);
    await queryRunner.query(`ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)`);

    await queryRunner.query(`ALTER TABLE accounts DROP CONSTRAINT IF EXISTS uq_accounts_tenant_number`);
    await queryRunner.query(`ALTER TABLE accounts DROP COLUMN IF EXISTS tenant_id`);
    await queryRunner.query(`ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS uq_suppliers_tenant_name`);
    await queryRunner.query(`ALTER TABLE suppliers DROP COLUMN IF EXISTS tenant_id`);
  }
}
