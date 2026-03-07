import { MigrationInterface, QueryRunner } from 'typeorm';

export class KnowledgePermissionCleanup1837000000000 implements MigrationInterface {
  name = 'KnowledgePermissionCleanup1837000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      UPDATE role_permissions
      SET level = 'reader'
      WHERE resource = 'knowledge'
        AND level = 'contributor'
    `);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Irreversible: we intentionally fold knowledge:contributor down to reader.
  }
}
