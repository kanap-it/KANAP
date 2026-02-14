import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRolesTable1756685300000 implements MigrationInterface {
  name = 'CreateRolesTable1756685300000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        role_name text NOT NULL UNIQUE,
        role_description text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Prepopulate roles
    await queryRunner.query(`
      INSERT INTO roles(role_name, role_description) VALUES
      ('Administrator', 'Full system administrator with access to all features'),
      ('Master data manager', 'Manages master data including companies, departments, and suppliers'),
      ('Budget manager', 'Manages budget and financial data')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS roles`);
  }
}
