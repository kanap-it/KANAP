import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRolePermissions1799000000000 implements MigrationInterface {
  name = 'FixRolePermissions1799000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS on tables we need to modify
    const rlsTables = ['role_permissions'];
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // Fix 1: Add users:reader to IT Operations Member and IT Operations Reader
    // These roles need to be able to list users for owner selection dropdowns

    // IT Operations Member: add users:reader
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'users', 'reader', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'IT Operations Member' AND r.is_built_in = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'reader';
    `);

    // IT Operations Reader: add users:reader
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'users', 'reader', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'IT Operations Reader' AND r.is_built_in = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'reader';
    `);

    // Fix 2: Add business_processes permissions to Master Data roles
    // These roles need access to Business Processes

    // Master Data Administrator: add business_processes:admin
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'business_processes', 'admin', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'Master Data Administrator' AND r.is_built_in = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'admin';
    `);

    // Master Data Member: add business_processes:member
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'business_processes', 'member', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'Master Data Member' AND r.is_built_in = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'member';
    `);

    // Master Data Reader: add business_processes:reader
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'business_processes', 'reader', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'Master Data Reader' AND r.is_built_in = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'reader';
    `);

    // Re-enable RLS on all tables
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS on tables we need to modify
    const rlsTables = ['role_permissions'];
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // Remove the permissions we added

    // Remove users:reader from IT Operations Member
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'users'
      AND role_id IN (SELECT id FROM roles WHERE role_name = 'IT Operations Member' AND is_built_in = true);
    `);

    // Remove users:reader from IT Operations Reader
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'users'
      AND role_id IN (SELECT id FROM roles WHERE role_name = 'IT Operations Reader' AND is_built_in = true);
    `);

    // Remove business_processes from Master Data Administrator
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'business_processes'
      AND role_id IN (SELECT id FROM roles WHERE role_name = 'Master Data Administrator' AND is_built_in = true);
    `);

    // Remove business_processes from Master Data Member
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'business_processes'
      AND role_id IN (SELECT id FROM roles WHERE role_name = 'Master Data Member' AND is_built_in = true);
    `);

    // Remove business_processes from Master Data Reader
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'business_processes'
      AND role_id IN (SELECT id FROM roles WHERE role_name = 'Master Data Reader' AND is_built_in = true);
    `);

    // Re-enable RLS on all tables
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }
  }
}
