import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUsersSchema1756685400000 implements MigrationInterface {
  name = 'UpdateUsersSchema1756685400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add foreign key constraints for company_id and department_id if they don't exist
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_8cf1183cf00af4b7bdece682c03'
          AND table_name = 'users'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT FK_8cf1183cf00af4b7bdece682c03 FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_049980018eefc7dc7f97f75af4c'
          AND table_name = 'users'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT FK_049980018eefc7dc7f97f75af4c FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);

    // Add role_id column
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN role_id uuid REFERENCES roles(id);
    `);

    // Create a temporary table to map old roles to new role_ids
    await queryRunner.query(`
      CREATE TEMP TABLE role_mapping AS
      SELECT DISTINCT u.email, r.id as role_id
      FROM users u
      JOIN roles r ON (
        (u.role = 'CIO' AND r.role_name = 'Administrator') OR
        (u.role IN ('Controller', 'Viewer') AND r.role_name = 'Budget manager')
      );
    `);

    // Update existing users with role_id
    await queryRunner.query(`
      UPDATE users
      SET role_id = rm.role_id
      FROM role_mapping rm
      WHERE users.email = rm.email;
    `);

    // For any users without a matching role, assign Budget manager
    await queryRunner.query(`
      UPDATE users
      SET role_id = (SELECT id FROM roles WHERE role_name = 'Budget manager' LIMIT 1)
      WHERE role_id IS NULL;
    `);

    // Make role_id NOT NULL
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;`);

    // If admin@example.com exists, ensure it has Administrator role
    await queryRunner.query(`
      UPDATE users
      SET role_id = (SELECT id FROM roles WHERE role_name = 'Administrator' LIMIT 1)
      WHERE email = 'admin@example.com' and role_id IS NOT NULL;
    `);

    // Drop the old role column
    await queryRunner.query(`ALTER TABLE users DROP COLUMN role;`);

    // Drop temp table
    await queryRunner.query(`DROP TABLE role_mapping;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the role column
    await queryRunner.query(`ALTER TABLE users ADD COLUMN role text;`);

    // Restore role values based on role relationships
    await queryRunner.query(`
      UPDATE users
      SET role = CASE
        WHEN r.role_name = 'Administrator' THEN 'CIO'
        WHEN r.role_name = 'Master data manager' THEN 'Controller'
        WHEN r.role_name = 'Budget manager' THEN 'Controller'
        ELSE 'Viewer'
      END
      FROM roles r
      WHERE users.role_id = r.id;
    `);

    // Drop the role_id column
    await queryRunner.query(`ALTER TABLE users DROP COLUMN role_id;`);
  }
}
