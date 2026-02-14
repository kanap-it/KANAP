import { MigrationInterface, QueryRunner } from 'typeorm';

export class StandaloneTasksAndCategories1809000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create portfolio_task_types table if not exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_task_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // Indexes for portfolio_task_types (use IF NOT EXISTS)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_portfolio_task_types_tenant_name" ON portfolio_task_types (tenant_id, name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_portfolio_task_types_tenant_order" ON portfolio_task_types (tenant_id, display_order)`);

    // Add RLS policy for portfolio_task_types (check if not exists)
    await queryRunner.query(`ALTER TABLE portfolio_task_types ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE POLICY tenant_isolation_policy ON portfolio_task_types
          USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);

    // 2. Make related fields nullable for standalone tasks (IF they are NOT NULL)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE tasks ALTER COLUMN related_object_type DROP NOT NULL;
      EXCEPTION WHEN others THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE tasks ALTER COLUMN related_object_id DROP NOT NULL;
      EXCEPTION WHEN others THEN NULL; END $$
    `);

    // 3. Add task_type_id column (FK to portfolio_task_types) if not exists
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE tasks ADD COLUMN task_type_id UUID NULL REFERENCES portfolio_task_types(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$
    `);

    // 4. Add classification fields for standalone tasks if not exists
    // (category_id and stream_id already exist)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE tasks ADD COLUMN source_id UUID NULL REFERENCES portfolio_sources(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE tasks ADD COLUMN company_id UUID NULL REFERENCES companies(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_column THEN NULL; END $$
    `);

    // 5. Update indexes - drop old composite index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_tenant_related_object_type_related_object_id"`);

    // Partial index for linked tasks
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_tenant_related_linked"
      ON tasks (tenant_id, related_object_type, related_object_id)
      WHERE related_object_type IS NOT NULL
    `);

    // Index for standalone task queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_tenant_standalone"
      ON tasks (tenant_id, created_at DESC)
      WHERE related_object_type IS NULL
    `);

    // Index for task_type and classification filtering
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_tenant_task_type" ON tasks (tenant_id, task_type_id) WHERE task_type_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_tenant_source" ON tasks (tenant_id, source_id) WHERE source_id IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tasks_tenant_company" ON tasks (tenant_id, company_id) WHERE company_id IS NOT NULL`);

    // 6. Seed default task types for all existing tenants
    const defaultTypes = [
      { name: 'Task', description: 'Standard task or work item', display_order: 0, is_system: true },
      { name: 'Bug', description: 'Software defect or error', display_order: 1, is_system: false },
      { name: 'Problem', description: 'Operational issue requiring investigation', display_order: 2, is_system: false },
      { name: 'Incident', description: 'Service disruption or security event', display_order: 3, is_system: false },
    ];

    const tenants = await queryRunner.query(`SELECT id FROM tenants`);
    for (const tenant of tenants) {
      for (const type of defaultTypes) {
        await queryRunner.query(`
          INSERT INTO portfolio_task_types (tenant_id, name, description, display_order, is_system)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (tenant_id, name) DO NOTHING
        `, [tenant.id, type.name, type.description, type.display_order, type.is_system]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove new indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_tenant_company"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_tenant_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_tenant_task_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_tenant_standalone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_tenant_related_linked"`);

    // Remove new columns from tasks
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS company_id`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS source_id`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS task_type_id`);

    // Restore NOT NULL constraints (will fail if standalone tasks exist)
    await queryRunner.query(`ALTER TABLE tasks ALTER COLUMN related_object_id SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE tasks ALTER COLUMN related_object_type SET NOT NULL`);

    // Drop portfolio_task_types table
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON portfolio_task_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_task_types`);

    // Recreate original index
    await queryRunner.query(`
      CREATE INDEX "IDX_tasks_tenant_related_object_type_related_object_id"
      ON tasks (tenant_id, related_object_type, related_object_id)
    `);
  }
}
