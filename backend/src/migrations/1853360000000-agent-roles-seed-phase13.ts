import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds three dedicated AI-agent roles for every existing tenant so administrators
 * can assign agent access directly without hand-building a role. Mirrors the
 * BUILT_IN_ROLES definitions in tenants.service.ts that cover newly-created tenants:
 *   - Agent Admin       -> ai_agents:admin       (configure agents + grant autonomy)
 *   - Agent Contributor -> ai_agents:contributor (approve/reject proposals, operate)
 *   - Agent Reader      -> ai_agents:reader       (view-only)
 *
 * Idempotent via ON CONFLICT. Works in both multi-tenant and single-tenant modes
 * (single-tenant simply has one row in `tenants`). `tenants` is the global registry
 * (no RLS / no tenant_id), so the cross-tenant SELECT returns every live tenant.
 */
export class AgentRolesSeedPhase131853360000000 implements MigrationInterface {
  name = 'AgentRolesSeedPhase131853360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      INSERT INTO roles (id, tenant_id, role_name, role_description, is_built_in, is_system, created_at, updated_at)
      SELECT gen_random_uuid(), t.id, v.role_name, v.role_description, true, false, now(), now()
      FROM tenants t
      CROSS JOIN (VALUES
        ('Agent Admin', 'Configure AI agents, grant autonomy, and manage the agent lifecycle'),
        ('Agent Contributor', 'Review and approve or reject AI agent proposals, run checks, and pause agents'),
        ('Agent Reader', 'View AI agents, their activity, and performance (read-only)')
      ) AS v(role_name, role_description)
      WHERE t.deleted_at IS NULL
      ON CONFLICT (tenant_id, role_name) DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO role_permissions (id, tenant_id, role_id, resource, level, created_at, updated_at)
      SELECT gen_random_uuid(), r.tenant_id, r.id, 'ai_agents', v.level, now(), now()
      FROM roles r
      JOIN (VALUES
        ('Agent Admin', 'admin'),
        ('Agent Contributor', 'contributor'),
        ('Agent Reader', 'reader')
      ) AS v(role_name, level) ON v.role_name = r.role_name
      WHERE r.is_built_in = true
        AND r.role_name IN ('Agent Admin', 'Agent Contributor', 'Agent Reader')
      ON CONFLICT (role_id, resource) DO UPDATE
        SET level = EXCLUDED.level, updated_at = now()
    `);

    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (
        SELECT id FROM roles
        WHERE is_built_in = true AND role_name IN ('Agent Admin', 'Agent Contributor', 'Agent Reader')
      )
    `);
    // user_roles references roles(id) ON DELETE CASCADE, so any assignments are removed with the role.
    await queryRunner.query(`
      DELETE FROM roles
      WHERE is_built_in = true AND role_name IN ('Agent Admin', 'Agent Contributor', 'Agent Reader')
    `);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }
}
