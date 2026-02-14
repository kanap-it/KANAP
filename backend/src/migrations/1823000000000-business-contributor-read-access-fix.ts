import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessContributorReadAccessFix1823000000000 implements MigrationInterface {
  name = 'BusinessContributorReadAccessFix1823000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS to update all tenant roles safely.
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    const resources = ['users', 'contacts', 'portfolio_settings'];

    for (const resource of resources) {
      await queryRunner.query(
        `
          INSERT INTO role_permissions (tenant_id, role_id, resource, level)
          SELECT r.tenant_id, r.id, $1, 'reader'
          FROM roles r
          WHERE LOWER(TRIM(r.role_name)) = 'business contributor'
          ON CONFLICT (role_id, resource) DO UPDATE
          SET
            level = CASE
              WHEN role_permissions.level = 'admin' THEN 'admin'
              WHEN role_permissions.level = 'manager' THEN 'manager'
              WHEN role_permissions.level = 'member' THEN 'member'
              WHEN role_permissions.level = 'contributor' THEN 'contributor'
              ELSE 'reader'
            END,
            tenant_id = EXCLUDED.tenant_id
        `,
        [resource],
      );
    }

    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only revert the portfolio_settings reader grant.
    // users/contacts reader access is intentionally preserved.
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      DELETE FROM role_permissions rp
      USING roles r
      WHERE rp.role_id = r.id
        AND LOWER(TRIM(r.role_name)) = 'business contributor'
        AND rp.resource = 'portfolio_settings'
        AND rp.level = 'reader'
    `);

    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }
}
