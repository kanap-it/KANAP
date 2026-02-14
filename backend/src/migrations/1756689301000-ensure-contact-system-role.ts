import { MigrationInterface, QueryRunner } from "typeorm";

export class EnsureContactSystemRole1756689301000 implements MigrationInterface {
  name = 'EnsureContactSystemRole1756689301000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE roles
      SET is_system = true,
          role_description = CASE
            WHEN LOWER(role_name) = 'administrator' THEN 'Full system administrator with access to all features'
            WHEN LOWER(role_name) = 'contact' THEN 'Directory contact without app access by default'
            ELSE role_description
          END
      WHERE LOWER(role_name) IN ('administrator', 'contact');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // no-op: retain system role flags
  }
}
