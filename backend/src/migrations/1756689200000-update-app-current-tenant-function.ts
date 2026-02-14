import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAppCurrentTenantFunction1756689200000 implements MigrationInterface {
  name = 'UpdateAppCurrentTenantFunction1756689200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update the app_current_tenant() function to use environment-specific default tenant
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
        
        -- If no tenant set, fall back to environment-specific default
        IF t IS NULL THEN
          -- Get default tenant slug from environment, fallback to 'lohr' for backward compatibility
          default_slug := COALESCE(current_setting('app.default_tenant_slug', true), 'lohr');
          IF default_slug = '' THEN
            default_slug := 'lohr';
          END IF;
          
          SELECT id INTO t FROM tenants WHERE slug = default_slug LIMIT 1;
        END IF;
        
        RETURN t;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the original hardcoded 'lohr' fallback
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid AS $$
      DECLARE t uuid;
      BEGIN
        BEGIN
          t := NULLIF(current_setting('app.current_tenant', true), '')::uuid;
        EXCEPTION WHEN others THEN
          t := NULL; -- ignore if not set
        END;
        IF t IS NULL THEN
          SELECT id INTO t FROM tenants WHERE slug = 'lohr' LIMIT 1;
        END IF;
        RETURN t;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
  }
}
