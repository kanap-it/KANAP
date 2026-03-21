import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAppCurrentTenantFunction1756689200000 implements MigrationInterface {
  name = 'UpdateAppCurrentTenantFunction1756689200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update app_current_tenant() to use the configured default slug, then the first tenant.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid AS $$
      DECLARE 
        t uuid;
        default_slug text;
      BEGIN
        -- Try to get current tenant from session setting
        BEGIN
          t := NULLIF(current_setting('app.current_tenant', true), '')::uuid;
        EXCEPTION WHEN others THEN
          t := NULL; -- ignore if not set
        END;
        
        -- If no tenant set, try the configured default slug first.
        IF t IS NULL THEN
          default_slug := NULLIF(current_setting('app.default_tenant_slug', true), '');
          IF default_slug IS NOT NULL THEN
            SELECT id INTO t FROM tenants WHERE slug = default_slug LIMIT 1;
          END IF;
        END IF;

        -- Final fallback for legacy flows: use the oldest tenant if one exists.
        IF t IS NULL THEN
          SELECT id INTO t FROM tenants ORDER BY created_at, id LIMIT 1;
        END IF;
        
        RETURN t;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the legacy fallback behavior without a customer-specific slug.
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
  }
}
