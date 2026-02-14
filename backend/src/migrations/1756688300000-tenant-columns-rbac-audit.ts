import { MigrationInterface, QueryRunner } from "typeorm";

export class TenantColumnsRbacAudit1756688300000 implements MigrationInterface {
  name = 'TenantColumnsRbacAudit1756688300000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tenant_id columns + defaults + indexes
    const tables = ['roles','role_permissions','subscriptions','audit_log'];
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS tenant_id uuid`);
      await queryRunner.query(`UPDATE ${t} SET tenant_id = (SELECT id FROM tenants WHERE slug='lohr') WHERE tenant_id IS NULL`);
      await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN tenant_id SET DEFAULT app_current_tenant()`);
      await queryRunner.query(`ALTER TABLE ${t} ALTER COLUMN tenant_id SET NOT NULL`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_${t}_tenant_id ON ${t}(tenant_id)`);
    }

    // roles: change unique(role_name) -> unique(tenant_id, role_name)
    await queryRunner.query(`
      DO $$ DECLARE cname text; BEGIN
        SELECT conname INTO cname
        FROM pg_constraint c
        JOIN pg_class r ON r.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = r.relnamespace
        WHERE r.relname = 'roles' AND c.contype = 'u' AND pg_get_constraintdef(c.oid) ILIKE '%(role_name)%';
        IF cname IS NOT NULL THEN
          EXECUTE format('ALTER TABLE roles DROP CONSTRAINT %I', cname);
        END IF;
      END $$;
    `);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class r ON r.oid = c.conrelid
        WHERE r.relname='roles' AND c.contype='u' AND pg_get_constraintdef(c.oid) ILIKE '%(tenant_id, role_name)%'
      ) THEN
        ALTER TABLE roles ADD CONSTRAINT uq_roles_tenant_name UNIQUE (tenant_id, role_name);
      END IF;
    END $$;`);

    // role_permissions: ensure tenant_id matches parent role
    await queryRunner.query(`
      UPDATE role_permissions rp
      SET tenant_id = r.tenant_id
      FROM roles r
      WHERE rp.role_id = r.id AND rp.tenant_id IS DISTINCT FROM r.tenant_id;
    `);

    // subscriptions: one per tenant
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class r ON r.oid = c.conrelid
        WHERE r.relname='subscriptions' AND c.contype='u' AND pg_get_constraintdef(c.oid) ILIKE '%(tenant_id)%'
      ) THEN
        ALTER TABLE subscriptions ADD CONSTRAINT uq_subscriptions_tenant UNIQUE (tenant_id);
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort revert of tenant columns
    await queryRunner.query(`ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS uq_subscriptions_tenant`);
    await queryRunner.query(`ALTER TABLE roles DROP CONSTRAINT IF EXISTS uq_roles_tenant_name`);
    for (const t of ['roles','role_permissions','subscriptions','audit_log']) {
      await queryRunner.query(`DROP INDEX IF EXISTS idx_${t}_tenant_id`);
      await queryRunner.query(`ALTER TABLE ${t} DROP COLUMN IF EXISTS tenant_id`);
    }
  }
}

