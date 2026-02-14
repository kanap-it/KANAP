import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Critical tenant isolation safety fix
 *
 * PROBLEM 1: app_current_tenant() falls back to 'lohr' tenant when context isn't set.
 * This is dangerous because 'lohr' is a real customer tenant, and any code path that
 * forgets to set tenant context would silently create/read data in the wrong tenant.
 *
 * PROBLEM 2: role_permissions may have mismatched tenant_id values (from migration
 * 1776000000000 bug). This causes RLS to filter them out, making roles appear to
 * have no permissions.
 *
 * FIX 1: Remove the fallback - return NULL if tenant context isn't set.
 * - INSERTs will fail with NOT NULL constraint (correct: prevents silent data corruption)
 * - RLS will filter out all rows (safer than showing wrong tenant's data)
 *
 * FIX 2: Re-sync role_permissions.tenant_id to match parent role (idempotent).
 */
export class FixTenantIsolationSafety1810000000000 implements MigrationInterface {
  name = 'FixTenantIsolationSafety1810000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==========================================================================
    // FIX 1: Remove dangerous fallback from app_current_tenant()
    // ==========================================================================
    console.log('[Migration] Updating app_current_tenant() to remove fallback to lohr tenant');

    // Check if we own the function before trying to update it
    // (to avoid aborting the transaction on permission error)
    const ownerCheck = await queryRunner.query(`
      SELECT p.proowner::regrole::text as owner, current_user as current
      FROM pg_proc p
      WHERE p.proname = 'app_current_tenant'
    `);

    const functionOwner = ownerCheck[0]?.owner;
    const currentUser = ownerCheck[0]?.current;
    const canUpdate = functionOwner === currentUser;

    if (canUpdate) {
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid AS $$
        DECLARE
          t uuid;
        BEGIN
          -- Try to get current tenant from session setting
          BEGIN
            t := NULLIF(current_setting('app.current_tenant', true), '')::uuid;
          EXCEPTION WHEN others THEN
            t := NULL;
          END;

          -- NO FALLBACK: If tenant context isn't set, return NULL.
          -- This is intentional - it ensures:
          -- 1. INSERTs fail with NOT NULL constraint (prevents silent data corruption)
          -- 2. RLS policies filter out all rows (safer than showing wrong tenant's data)
          --
          -- All code paths MUST set app.current_tenant before database operations.

          RETURN t;
        END;
        $$ LANGUAGE plpgsql STABLE;
      `);
      console.log('[Migration] Successfully updated app_current_tenant() function');
    } else {
      console.warn(`[Migration] WARNING: Cannot update app_current_tenant() - owned by '${functionOwner}', running as '${currentUser}'`);
      console.warn('[Migration] A database administrator must run the following SQL:');
      console.warn(`
  sudo -u postgres psql -d YOUR_DATABASE -c "
  CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid AS \\$\\$
  DECLARE t uuid;
  BEGIN
    BEGIN
      t := NULLIF(current_setting('app.current_tenant', true), '')::uuid;
    EXCEPTION WHEN others THEN
      t := NULL;
    END;
    RETURN t;
  END;
  \\$\\$ LANGUAGE plpgsql STABLE;
  "
      `);
      console.warn('[Migration] Continuing with role_permissions fix (critical)...');
    }

    // ==========================================================================
    // FIX 2: Sync role_permissions.tenant_id to match parent role
    // (Re-running fix from 1778000000000 to catch any missed cases)
    // ==========================================================================
    console.log('[Migration] Checking for role_permissions with mismatched tenant_id');

    // Temporarily disable RLS to access all rows
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);

    // Count affected rows
    const affectedBefore = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      WHERE rp.tenant_id IS DISTINCT FROM r.tenant_id
    `);
    const affectedCount = parseInt(affectedBefore[0]?.count || '0', 10);

    console.log(`[Migration] Found ${affectedCount} role_permissions with mismatched tenant_id`);

    if (affectedCount > 0) {
      // Log details of what will be fixed
      const details = await queryRunner.query(`
        SELECT
          t.slug as tenant_slug,
          r.role_name,
          rp.resource,
          rp.level,
          rp.tenant_id as current_tenant_id,
          r.tenant_id as correct_tenant_id
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        LEFT JOIN tenants t ON r.tenant_id = t.id
        WHERE rp.tenant_id IS DISTINCT FROM r.tenant_id
        ORDER BY t.slug, r.role_name, rp.resource
        LIMIT 100
      `);

      console.log('[Migration] Affected rows (first 100):');
      for (const row of details) {
        console.log(`  - ${row.tenant_slug}/${row.role_name} [${row.resource}:${row.level}]: ${row.current_tenant_id || 'NULL'} -> ${row.correct_tenant_id}`);
      }

      // Apply the fix: sync tenant_id to match parent role
      await queryRunner.query(`
        UPDATE role_permissions rp
        SET tenant_id = r.tenant_id
        FROM roles r
        WHERE rp.role_id = r.id
          AND rp.tenant_id IS DISTINCT FROM r.tenant_id
          AND r.tenant_id IS NOT NULL
      `);

      console.log(`[Migration] Fixed ${affectedCount} role_permissions rows`);
    }

    // Verification
    const remainingMismatches = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      WHERE rp.tenant_id IS DISTINCT FROM r.tenant_id
        AND r.tenant_id IS NOT NULL
    `);
    const remainingCount = parseInt(remainingMismatches[0]?.count || '0', 10);

    if (remainingCount > 0) {
      console.error(`[Migration] WARNING: ${remainingCount} mismatches still remain!`);
    } else {
      console.log('[Migration] Verification passed: all role_permissions have correct tenant_id');
    }

    // Re-enable RLS
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to the previous version with environment-configurable fallback
    // (still not ideal, but better than hardcoded 'lohr')
    console.log('[Migration] Reverting app_current_tenant() - WARNING: This restores the fallback behavior');

    // Check ownership before attempting update
    const ownerCheck = await queryRunner.query(`
      SELECT p.proowner::regrole::text as owner, current_user as current
      FROM pg_proc p
      WHERE p.proname = 'app_current_tenant'
    `);

    const functionOwner = ownerCheck[0]?.owner;
    const currentUser = ownerCheck[0]?.current;
    const canUpdate = functionOwner === currentUser;

    if (canUpdate) {
      await queryRunner.query(`
        CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid AS $$
        DECLARE
          t uuid;
          default_slug text;
        BEGIN
          BEGIN
            t := NULLIF(current_setting('app.current_tenant', true), '')::uuid;
          EXCEPTION WHEN others THEN
            t := NULL;
          END;

          IF t IS NULL THEN
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
    } else {
      console.warn(`[Migration] WARNING: Cannot revert app_current_tenant() - owned by '${functionOwner}'`);
      console.warn('[Migration] Manual intervention required if rollback is needed');
    }

    // Note: We don't revert the role_permissions fix - the mismatched state was a bug
    console.log('[Migration] Note: role_permissions tenant_id fix is NOT reverted (was fixing corruption)');
  }
}
