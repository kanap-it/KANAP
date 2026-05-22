import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestrictBusinessContributorAccess1850600000000 implements MigrationInterface {
  name = 'RestrictBusinessContributorAccess1850600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(
      `
        DELETE FROM role_permissions rp
        USING roles r
        WHERE rp.role_id = r.id
          AND LOWER(TRIM(r.role_name)) = 'business contributor'
          AND rp.resource = ANY($1)
      `,
      [[
        'portfolio_settings',
        'companies',
        'departments',
        'suppliers',
        'contacts',
        'accounts',
        'analytics',
        'business_processes',
        'settings',
        'budget_ops',
        'billing',
        'ai_settings',
      ]],
    );

    await queryRunner.query(
      `
        UPDATE roles
        SET role_description = 'Can submit requests, contribute to projects, and work on project tasks'
        WHERE LOWER(TRIM(role_name)) = 'business contributor'
      `,
    );

    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);

    const permissions: Record<string, string> = {
      companies: 'reader',
      departments: 'reader',
      contacts: 'reader',
      portfolio_settings: 'reader',
    };

    for (const [resource, level] of Object.entries(permissions)) {
      await queryRunner.query(
        `
          INSERT INTO role_permissions (tenant_id, role_id, resource, level)
          SELECT r.tenant_id, r.id, $1, $2
          FROM roles r
          WHERE LOWER(TRIM(r.role_name)) = 'business contributor'
          ON CONFLICT (role_id, resource)
          DO UPDATE SET level = EXCLUDED.level,
                        tenant_id = EXCLUDED.tenant_id
        `,
        [resource, level],
      );
    }

    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }
}
