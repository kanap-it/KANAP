import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameDocumentationToKnowledge1836000000000 implements MigrationInterface {
  name = 'RenameDocumentationToKnowledge1836000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`UPDATE role_permissions SET resource = 'knowledge' WHERE resource = 'documentation'`);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`UPDATE role_permissions SET resource = 'documentation' WHERE resource = 'knowledge'`);
    await queryRunner.query(`ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY`);
  }
}
