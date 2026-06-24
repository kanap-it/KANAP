import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiAgentsPermissionPhase131853300000000 implements MigrationInterface {
  name = 'AiAgentsPermissionPhase131853300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      INSERT INTO role_permissions (tenant_id, role_id, resource, level)
      SELECT r.tenant_id, r.id, 'ai_agents', 'admin'
      FROM roles r
      WHERE r.role_name IN ('Administrator', 'AI Administrator')
      ON CONFLICT (role_id, resource)
      DO UPDATE
        SET level = 'admin',
            tenant_id = EXCLUDED.tenant_id
    `);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE roles DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM role_permissions WHERE resource = 'ai_agents'`);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE roles FORCE ROW LEVEL SECURITY`);
  }
}
