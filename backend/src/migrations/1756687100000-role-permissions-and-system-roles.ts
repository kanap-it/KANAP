import { MigrationInterface, QueryRunner } from "typeorm";

export class RolePermissionsAndSystemRoles1756687100000 implements MigrationInterface {
  name = 'RolePermissionsAndSystemRoles1756687100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add is_system flag to roles
    await queryRunner.query(`
      ALTER TABLE roles
      ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
    `);

    // Create role_permissions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        resource text NOT NULL,
        level text NOT NULL CHECK (level IN ('reader','manager','admin')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(role_id, resource)
      );
    `);

    // Mark Administrator and Contact as system roles if present
    await queryRunner.query(`
      UPDATE roles SET is_system = true WHERE role_name IN ('Administrator','Contact');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS role_permissions`);
    // Do not drop is_system column to avoid destructive downgrade issues
  }
}

