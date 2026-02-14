import { MigrationInterface, QueryRunner } from "typeorm";

export class UnifiedTasksTable1756695000000 implements MigrationInterface {
  name = 'UnifiedTasksTable1756695000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        title text NOT NULL,
        description text NULL,
        status text NOT NULL DEFAULT 'open',
        due_date date NULL,
        assignee_user_id uuid NULL,
        related_object_type text NOT NULL,
        related_object_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_related ON tasks (tenant_id, related_object_type, related_object_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks (tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_assignee ON tasks (tenant_id, assignee_user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_due_date ON tasks (tenant_id, due_date)`);

    // Optional backfill from spend_tasks
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spend_tasks') THEN
        INSERT INTO tasks (tenant_id, title, description, status, due_date, assignee_user_id, related_object_type, related_object_id, created_at, updated_at)
        SELECT tenant_id, title, description, status, due_date, assignee_user_id, 'spend_item'::text, item_id, created_at, updated_at
        FROM spend_tasks;
      END IF;
    END $$;`);

    // Enable RLS with tenant isolation policy (after backfill to avoid RLS violations)
    await queryRunner.query(`ALTER TABLE tasks ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE tasks FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_tenant_isolation'
      ) THEN
        DROP POLICY tasks_tenant_isolation ON tasks;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE POLICY tasks_tenant_isolation ON tasks
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_tenant_isolation'
      ) THEN
        DROP POLICY tasks_tenant_isolation ON tasks;
      END IF;
    END $$;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tasks`);
  }
}
