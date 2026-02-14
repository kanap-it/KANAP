import { MigrationInterface, QueryRunner } from "typeorm";

export class MultiRoleSupport1777000000000 implements MigrationInterface {
  name = 'MultiRoleSupport1777000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Temporarily disable RLS on tables we need to modify
    await queryRunner.query(`ALTER TABLE users DISABLE ROW LEVEL SECURITY`);

    // Create user_roles junction table for many-to-many relationship
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        is_primary boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, role_id)
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id)`);

    // Migrate existing role_id from users to user_roles (as primary role)
    // Do this BEFORE enabling RLS on user_roles
    await queryRunner.query(`
      INSERT INTO user_roles (tenant_id, user_id, role_id, is_primary)
      SELECT tenant_id, id, role_id, true
      FROM users
      WHERE role_id IS NOT NULL
      ON CONFLICT (user_id, role_id) DO NOTHING
    `);

    // Enable RLS on user_roles
    await queryRunner.query(`ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE user_roles FORCE ROW LEVEL SECURITY`);

    // Create RLS policies for user_roles
    await queryRunner.query(`
      CREATE POLICY user_roles_tenant_isolation ON user_roles
      FOR ALL
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);

    // Re-enable RLS on users
    await queryRunner.query(`ALTER TABLE users ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE users FORCE ROW LEVEL SECURITY`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS user_roles_tenant_isolation ON user_roles`);

    // Drop the junction table
    await queryRunner.query(`DROP TABLE IF EXISTS user_roles`);
  }
}
