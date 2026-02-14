import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTasksPermissions1756693000000 implements MigrationInterface {
  name = 'AddTasksPermissions1756693000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily relax RLS on role_permissions to grant across tenants
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    // Grant Administrator role admin level on tasks resource for all tenants
    await queryRunner.query(`
      INSERT INTO role_permissions(tenant_id, role_id, resource, level)
      SELECT r.tenant_id, r.id, 'tasks', 'admin'
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.resource = 'tasks'
      WHERE r.role_name = 'Administrator' AND rp.id IS NULL;
    `);

    // Re-enable RLS
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove tasks permissions if rolling back
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM role_permissions WHERE resource = 'tasks'`);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }
}