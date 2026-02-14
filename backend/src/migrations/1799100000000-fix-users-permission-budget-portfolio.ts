import { MigrationInterface, QueryRunner } from "typeorm";

export class FixUsersPermissionBudgetPortfolio1799100000000 implements MigrationInterface {
  name = 'FixUsersPermissionBudgetPortfolio1799100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS on tables we need to modify
    const rlsTables = ['role_permissions'];
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // Add users:reader to Budget and Portfolio Member/Reader roles
    // These roles need to be able to list users for selection dropdowns throughout the app

    // Budget Member: add users:reader
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'users', 'reader', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'Budget Member' AND r.is_built_in = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'reader';
    `);

    // Budget Reader: add users:reader
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'users', 'reader', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'Budget Reader' AND r.is_built_in = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'reader';
    `);

    // Portfolio Member: add users:reader
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'users', 'reader', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'Portfolio Member' AND r.is_built_in = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'reader';
    `);

    // Portfolio Reader: add users:reader
    await queryRunner.query(`
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT r.id, 'users', 'reader', r.tenant_id
      FROM roles r
      WHERE r.role_name = 'Portfolio Reader' AND r.is_built_in = true
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

    // Remove users:reader from Budget Member
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'users'
      AND role_id IN (SELECT id FROM roles WHERE role_name = 'Budget Member' AND is_built_in = true);
    `);

    // Remove users:reader from Budget Reader
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'users'
      AND role_id IN (SELECT id FROM roles WHERE role_name = 'Budget Reader' AND is_built_in = true);
    `);

    // Remove users:reader from Portfolio Member
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'users'
      AND role_id IN (SELECT id FROM roles WHERE role_name = 'Portfolio Member' AND is_built_in = true);
    `);

    // Remove users:reader from Portfolio Reader
    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'users'
      AND role_id IN (SELECT id FROM roles WHERE role_name = 'Portfolio Reader' AND is_built_in = true);
    `);

    // Re-enable RLS on all tables
    for (const t of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }
  }
}
