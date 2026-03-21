import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantColumnsInitial1756687300000 implements MigrationInterface {
  name = 'TenantColumnsInitial1756687300000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helper function: use the current tenant, configured default slug, or first tenant.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid AS $$
      DECLARE
        t uuid;
        default_slug text;
      BEGIN
        BEGIN
          t := NULLIF(current_setting('app.current_tenant', true), '')::uuid;
        EXCEPTION WHEN others THEN
          t := NULL; -- ignore if not set
        END;

        IF t IS NULL THEN
          default_slug := NULLIF(current_setting('app.default_tenant_slug', true), '');
          IF default_slug IS NOT NULL THEN
            SELECT id INTO t FROM tenants WHERE slug = default_slug LIMIT 1;
          END IF;
        END IF;

        IF t IS NULL THEN
          SELECT id INTO t FROM tenants ORDER BY created_at, id LIMIT 1;
        END IF;

        RETURN t;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);

    // Users
    await queryRunner.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id uuid`);
    await queryRunner.query(`UPDATE users SET tenant_id = (SELECT id FROM tenants ORDER BY created_at, id LIMIT 1) WHERE tenant_id IS NULL`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN tenant_id SET DEFAULT app_current_tenant()`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN tenant_id SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)`);

    // Companies
    await queryRunner.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_id uuid`);
    await queryRunner.query(`UPDATE companies SET tenant_id = (SELECT id FROM tenants ORDER BY created_at, id LIMIT 1) WHERE tenant_id IS NULL`);
    await queryRunner.query(`ALTER TABLE companies ALTER COLUMN tenant_id SET DEFAULT app_current_tenant()`);
    await queryRunner.query(`ALTER TABLE companies ALTER COLUMN tenant_id SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id)`);

    // Departments
    await queryRunner.query(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS tenant_id uuid`);
    await queryRunner.query(`UPDATE departments SET tenant_id = (SELECT id FROM tenants ORDER BY created_at, id LIMIT 1) WHERE tenant_id IS NULL`);
    await queryRunner.query(`ALTER TABLE departments ALTER COLUMN tenant_id SET DEFAULT app_current_tenant()`);
    await queryRunner.query(`ALTER TABLE departments ALTER COLUMN tenant_id SET NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON departments(tenant_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_departments_tenant_id`);
    await queryRunner.query(`ALTER TABLE departments DROP COLUMN IF EXISTS tenant_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_companies_tenant_id`);
    await queryRunner.query(`ALTER TABLE companies DROP COLUMN IF EXISTS tenant_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_tenant_id`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS tenant_id`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS app_current_tenant()`);
  }
}
