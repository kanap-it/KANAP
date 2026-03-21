import { MigrationInterface, QueryRunner } from "typeorm";

export class RbacPermissionsOverhaul1776000000000 implements MigrationInterface {
  name = 'RbacPermissionsOverhaul1776000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS on tables we need to modify
    const rlsTables = ['roles', 'role_permissions', 'user_page_roles'];
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // Phase 1: Add is_built_in column to roles
    await queryRunner.query(`
      ALTER TABLE roles
      ADD COLUMN IF NOT EXISTS is_built_in boolean NOT NULL DEFAULT false;
    `);

    // Phase 2: Update check constraint to support 'member' instead of 'manager'
    // First drop the existing constraint
    await queryRunner.query(`
      ALTER TABLE role_permissions
      DROP CONSTRAINT IF EXISTS role_permissions_level_check;
    `);

    await queryRunner.query(`
      ALTER TABLE user_page_roles
      DROP CONSTRAINT IF EXISTS user_page_roles_level_check;
    `);

    // Rename 'manager' to 'member' in existing data
    await queryRunner.query(`
      UPDATE role_permissions SET level = 'member' WHERE level = 'manager';
    `);

    await queryRunner.query(`
      UPDATE user_page_roles SET level = 'member' WHERE level = 'manager';
    `);

    // Add new constraint with 'member'
    await queryRunner.query(`
      ALTER TABLE role_permissions
      ADD CONSTRAINT role_permissions_level_check
      CHECK (level IN ('reader', 'member', 'admin'));
    `);

    await queryRunner.query(`
      ALTER TABLE user_page_roles
      ADD CONSTRAINT user_page_roles_level_check
      CHECK (level IN ('reader', 'member', 'admin'));
    `);

    // Phase 3: Grant infrastructure permission to Administrator role (per tenant)
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'infrastructure', 'admin', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'Administrator' AND r.is_system = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'admin';
    `);

    // Phase 4: Create 15 built-in roles (per tenant)

    const tenants = await queryRunner.query(`SELECT id FROM tenants`);

    for (const tenant of tenants) {
      const tenantId = tenant.id;

      // Define built-in roles with their permissions (captured from production tenant configuration)
      const builtInRoles = [
        // Budget Roles
        {
          name: 'Budget Administrator',
          description: 'Full control over budget management including OPEX, CAPEX, contracts, and reporting',
          permissions: {
            opex: 'admin', capex: 'admin', budget_ops: 'admin', contracts: 'admin',
            analytics: 'admin', reporting: 'admin', tasks: 'member', users: 'reader',
            companies: 'member', departments: 'member', suppliers: 'member',
            contacts: 'member', accounts: 'member'
          }
        },
        {
          name: 'Budget Member',
          description: 'Can manage budget items, contracts, and view reports',
          permissions: {
            opex: 'member', capex: 'member', budget_ops: 'reader', contracts: 'member',
            analytics: 'member', reporting: 'member', tasks: 'member',
            companies: 'reader', departments: 'member', suppliers: 'member',
            contacts: 'member', accounts: 'reader'
          }
        },
        {
          name: 'Budget Reader',
          description: 'Read-only access to budget data and reports',
          permissions: {
            opex: 'reader', capex: 'reader', budget_ops: 'reader', contracts: 'reader',
            analytics: 'reader', reporting: 'reader', tasks: 'reader',
            companies: 'reader', departments: 'reader', suppliers: 'reader',
            contacts: 'reader', accounts: 'reader'
          }
        },
        // Portfolio Roles
        {
          name: 'Portfolio Administrator',
          description: 'Full control over portfolio management including requests, projects, and planning',
          permissions: {
            portfolio_requests: 'admin', portfolio_projects: 'admin', portfolio_planning: 'admin',
            portfolio_reports: 'admin', portfolio_settings: 'admin', tasks: 'member', users: 'reader',
            companies: 'reader', departments: 'reader', suppliers: 'member',
            contacts: 'member', accounts: 'member',
            applications: 'reader', infrastructure: 'reader', locations: 'reader', settings: 'reader',
            opex: 'reader', capex: 'reader', contracts: 'reader'
          }
        },
        {
          name: 'Portfolio Member',
          description: 'Can manage portfolio requests, projects, and planning',
          permissions: {
            portfolio_requests: 'member', portfolio_projects: 'member', portfolio_planning: 'member',
            portfolio_reports: 'reader', portfolio_settings: 'reader', tasks: 'member',
            companies: 'reader', departments: 'reader', suppliers: 'reader',
            contacts: 'reader', accounts: 'reader',
            applications: 'reader', infrastructure: 'reader', locations: 'reader'
          }
        },
        {
          name: 'Portfolio Reader',
          description: 'Read-only access to portfolio data',
          permissions: {
            portfolio_requests: 'reader', portfolio_projects: 'reader', portfolio_planning: 'reader',
            portfolio_reports: 'reader', portfolio_settings: 'reader', tasks: 'reader',
            companies: 'reader', departments: 'reader', suppliers: 'reader', contacts: 'reader'
          }
        },
        // IT Operations Roles
        {
          name: 'IT Operations Administrator',
          description: 'Full control over IT operations including applications, infrastructure, and settings',
          permissions: {
            applications: 'admin', infrastructure: 'admin', locations: 'admin', settings: 'admin',
            tasks: 'member', users: 'reader',
            companies: 'reader', departments: 'reader', suppliers: 'member', contacts: 'member',
            opex: 'reader', capex: 'reader', contracts: 'reader',
            portfolio_requests: 'reader', portfolio_projects: 'reader',
            portfolio_planning: 'reader', portfolio_reports: 'reader', portfolio_settings: 'reader'
          }
        },
        {
          name: 'IT Operations Member',
          description: 'Can manage applications and infrastructure',
          permissions: {
            applications: 'member', infrastructure: 'member', locations: 'member', settings: 'member',
            tasks: 'member',
            companies: 'reader', departments: 'reader', suppliers: 'reader', contacts: 'member',
            opex: 'reader', capex: 'reader', contracts: 'reader',
            portfolio_requests: 'reader', portfolio_projects: 'reader', portfolio_planning: 'reader'
          }
        },
        {
          name: 'IT Operations Reader',
          description: 'Read-only access to IT operations data',
          permissions: {
            applications: 'reader', infrastructure: 'reader', locations: 'reader', settings: 'reader',
            tasks: 'reader',
            companies: 'reader', departments: 'reader', suppliers: 'reader', contacts: 'reader'
          }
        },
        // Master Data Roles
        {
          name: 'Master Data Administrator',
          description: 'Full control over master data including companies, departments, suppliers, and locations',
          permissions: {
            companies: 'admin', departments: 'admin', suppliers: 'admin',
            contacts: 'admin', accounts: 'admin'
          }
        },
        {
          name: 'Master Data Member',
          description: 'Can manage master data entries',
          permissions: {
            companies: 'member', departments: 'member', suppliers: 'member',
            contacts: 'member', accounts: 'member'
          }
        },
        {
          name: 'Master Data Reader',
          description: 'Read-only access to master data',
          permissions: {
            companies: 'reader', departments: 'reader', suppliers: 'reader',
            contacts: 'reader', accounts: 'reader'
          }
        },
        // Tasks Roles
        {
          name: 'Tasks Administrator',
          description: 'Full control over task management',
          permissions: { tasks: 'admin' }
        },
        {
          name: 'Tasks Member',
          description: 'Can manage and complete tasks',
          permissions: { tasks: 'member' }
        },
        {
          name: 'Tasks Reader',
          description: 'Read-only access to tasks',
          permissions: { tasks: 'reader' }
        }
      ];

      for (const role of builtInRoles) {
        // Check if role already exists for this tenant
        const existing = await queryRunner.query(
          `SELECT id FROM roles WHERE tenant_id = $1 AND role_name = $2`,
          [tenantId, role.name]
        );

        let roleId: string;

        if (existing.length > 0) {
          roleId = existing[0].id;
          // Update to be built-in
          await queryRunner.query(
            `UPDATE roles SET is_built_in = true, role_description = $1 WHERE id = $2`,
            [role.description, roleId]
          );
        } else {
          // Create the role
          const result = await queryRunner.query(
            `INSERT INTO roles (tenant_id, role_name, role_description, is_built_in)
             VALUES ($1, $2, $3, true)
             RETURNING id`,
            [tenantId, role.name, role.description]
          );
          roleId = result[0].id;
        }

        // Set permissions for the role
        for (const [resource, level] of Object.entries(role.permissions)) {
          await queryRunner.query(
            `INSERT INTO role_permissions (role_id, resource, level, tenant_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (role_id, resource) DO UPDATE SET level = $3`,
            [roleId, resource, level, tenantId]
          );
        }
      }
    }

    // Re-enable RLS on all tables
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS on tables we need to modify
    const rlsTables = ['roles', 'role_permissions', 'user_page_roles'];
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // Remove built-in roles (but not their users - they'd be orphaned)
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (SELECT id FROM roles WHERE is_built_in = true);
    `);

    await queryRunner.query(`
      DELETE FROM roles WHERE is_built_in = true;
    `);

    // Revert 'member' back to 'manager'
    await queryRunner.query(`
      ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_level_check;
    `);

    await queryRunner.query(`
      ALTER TABLE user_page_roles DROP CONSTRAINT IF EXISTS user_page_roles_level_check;
    `);

    await queryRunner.query(`
      UPDATE role_permissions SET level = 'manager' WHERE level = 'member';
    `);

    await queryRunner.query(`
      UPDATE user_page_roles SET level = 'manager' WHERE level = 'member';
    `);

    await queryRunner.query(`
      ALTER TABLE role_permissions
      ADD CONSTRAINT role_permissions_level_check
      CHECK (level IN ('reader', 'manager', 'admin'));
    `);

    await queryRunner.query(`
      ALTER TABLE user_page_roles
      ADD CONSTRAINT user_page_roles_level_check
      CHECK (level IN ('reader', 'manager', 'admin'));
    `);

    // Remove infrastructure permissions
    await queryRunner.query(`
      DELETE FROM role_permissions WHERE resource = 'infrastructure';
    `);

    // Re-enable RLS on all tables
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }

    // Don't drop is_built_in column to avoid destructive downgrade issues
  }
}
