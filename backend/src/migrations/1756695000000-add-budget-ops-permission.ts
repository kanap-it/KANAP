import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBudgetOpsPermission1756695000000 implements MigrationInterface {
  name = 'AddBudgetOpsPermission1756695000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      INSERT INTO role_permissions(tenant_id, role_id, resource, level)
      SELECT r.tenant_id, r.id, 'budget_ops', 'admin'
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id AND rp.resource = 'budget_ops'
      WHERE r.role_name = 'Administrator' AND rp.id IS NULL;
    `);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM role_permissions WHERE resource = 'budget_ops'`);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }
}
