import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContributorLevelAndBusinessContributorRole1818000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Disable RLS so we can operate across all tenants
    const rlsTables = ['roles', 'role_permissions'];
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // Update check constraint to include 'contributor'
    await queryRunner.query(`
      ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_level_check;
    `);
    await queryRunner.query(`
      ALTER TABLE role_permissions
      ADD CONSTRAINT role_permissions_level_check
      CHECK (level IN ('reader', 'contributor', 'member', 'manager', 'admin'));
    `);

    // Create Business Contributor built-in role for each tenant
    const tenants = await queryRunner.query(`SELECT id FROM tenants`);

    const permissions: Record<string, string> = {
      portfolio_requests: 'member',
      portfolio_projects: 'contributor',
      tasks: 'member',
      users: 'reader',
      companies: 'reader',
      departments: 'reader',
      contacts: 'reader',
    };

    for (const tenant of tenants) {
      const tenantId = tenant.id;

      // Skip if this tenant already has the role
      const existing = await queryRunner.query(
        `SELECT id FROM roles WHERE tenant_id = $1 AND role_name = $2`,
        [tenantId, 'Business Contributor'],
      );

      let roleId: string;

      if (existing.length > 0) {
        roleId = existing[0].id;
        await queryRunner.query(
          `UPDATE roles SET is_built_in = true, role_description = $1 WHERE id = $2`,
          ['Can submit requests, contribute to projects, and work on project tasks', roleId],
        );
      } else {
        const result = await queryRunner.query(
          `INSERT INTO roles (tenant_id, role_name, role_description, is_built_in)
           VALUES ($1, $2, $3, true)
           RETURNING id`,
          [tenantId, 'Business Contributor', 'Can submit requests, contribute to projects, and work on project tasks'],
        );
        roleId = result[0].id;
      }

      // Set permissions for the role
      for (const [resource, level] of Object.entries(permissions)) {
        await queryRunner.query(
          `INSERT INTO role_permissions (tenant_id, role_id, resource, level)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (role_id, resource) DO UPDATE SET level = $4`,
          [tenantId, roleId, resource, level],
        );
      }
    }

    // Re-enable RLS
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rlsTables = ['roles', 'role_permissions'];
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // Remove Business Contributor roles and their permissions
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (SELECT id FROM roles WHERE role_name = 'Business Contributor' AND is_built_in = true);
    `);
    await queryRunner.query(`
      DELETE FROM roles WHERE role_name = 'Business Contributor' AND is_built_in = true;
    `);

    // Remove any 'contributor' level permissions that might have been set manually
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE level = 'contributor';
    `);

    // Revert check constraint
    await queryRunner.query(`
      ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_level_check;
    `);
    await queryRunner.query(`
      ALTER TABLE role_permissions
      ADD CONSTRAINT role_permissions_level_check
      CHECK (level IN ('reader', 'member', 'manager', 'admin'));
    `);

    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }
  }
}
