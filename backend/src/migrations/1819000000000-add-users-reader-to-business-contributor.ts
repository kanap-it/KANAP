import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersReaderToBusinessContributor1819000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      INSERT INTO role_permissions (tenant_id, role_id, resource, level)
      SELECT r.tenant_id, r.id, 'users', 'reader'
      FROM roles r
      WHERE r.role_name = 'Business Contributor' AND r.is_built_in = true
      ON CONFLICT (role_id, resource) DO UPDATE SET level = 'reader'
    `);

    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      DELETE FROM role_permissions
      WHERE resource = 'users'
        AND role_id IN (SELECT id FROM roles WHERE role_name = 'Business Contributor' AND is_built_in = true)
    `);

    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }
}
