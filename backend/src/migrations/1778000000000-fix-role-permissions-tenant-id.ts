import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Fix role_permissions tenant_id mismatch
 *
 * ROOT CAUSE: Migration 1776000000000-rbac-permissions-overhaul.ts used:
 *   ON CONFLICT (role_id, resource) DO UPDATE SET level = $3
 *
 * This only updated `level` but NOT `tenant_id`, leaving some role_permissions
 * with incorrect tenant_id values (NULL or from a different tenant).
 *
 * IMPACT: RLS policy filters out these mismatched rows, causing built-in roles
 * to appear as if they have no permissions (403 errors).
 *
 * FIX: Sync role_permissions.tenant_id to match the parent role's tenant_id.
 */
export class FixRolePermissionsTenantId1778000000000 implements MigrationInterface {
  name = 'FixRolePermissionsTenantId1778000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS to access all rows
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);

    // Safety check 1: Verify no roles have NULL tenant_id
    const rolesWithNullTenant = await queryRunner.query(`
      SELECT id, role_name, is_system, is_built_in
      FROM roles
      WHERE tenant_id IS NULL
    `);

    if (rolesWithNullTenant.length > 0) {
      console.warn('[Migration] WARNING: Found roles with NULL tenant_id:', rolesWithNullTenant);
      // These would need manual investigation - but continue with the fix for others
    }

    // Safety check 2: Count affected rows before fix
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
          r.role_name,
          r.is_built_in,
          rp.resource,
          rp.level,
          rp.tenant_id as current_tenant_id,
          r.tenant_id as correct_tenant_id,
          t.slug as tenant_slug
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        LEFT JOIN tenants t ON r.tenant_id = t.id
        WHERE rp.tenant_id IS DISTINCT FROM r.tenant_id
        ORDER BY t.slug, r.role_name, rp.resource
        LIMIT 50
      `);

      console.log('[Migration] Sample of affected rows (first 50):');
      for (const row of details) {
        console.log(`  - ${row.tenant_slug}/${row.role_name} [${row.resource}:${row.level}]: ${row.current_tenant_id || 'NULL'} -> ${row.correct_tenant_id}`);
      }

      // Apply the fix: sync tenant_id to match parent role
      const result = await queryRunner.query(`
        UPDATE role_permissions rp
        SET tenant_id = r.tenant_id
        FROM roles r
        WHERE rp.role_id = r.id
          AND rp.tenant_id IS DISTINCT FROM r.tenant_id
          AND r.tenant_id IS NOT NULL
      `);

      console.log(`[Migration] Fixed ${result?.[1] || affectedCount} role_permissions rows`);
    }

    // Verification: confirm no mismatches remain (except for roles with NULL tenant_id)
    const remainingMismatches = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      WHERE rp.tenant_id IS DISTINCT FROM r.tenant_id
        AND r.tenant_id IS NOT NULL
    `);
    const remainingCount = parseInt(remainingMismatches[0]?.count || '0', 10);

    if (remainingCount > 0) {
      console.error(`[Migration] ERROR: ${remainingCount} mismatches still remain after fix!`);
    } else {
      console.log('[Migration] Verification passed: all role_permissions now have correct tenant_id');
    }

    // Re-enable RLS
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This migration fixes data corruption - there's no meaningful rollback.
    // The "before" state was incorrect, so we don't want to restore it.
    console.log('[Migration] Rollback is a no-op: the previous state was data corruption');
  }
}
