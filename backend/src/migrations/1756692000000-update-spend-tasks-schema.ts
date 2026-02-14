import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSpendTasksSchema1756692000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add title column
    await queryRunner.query(`
      ALTER TABLE spend_tasks
      ADD COLUMN IF NOT EXISTS title text;
    `);

    // Add tenant_id column for multi-tenancy
    await queryRunner.query(`
      ALTER TABLE spend_tasks
      ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    `);

    // Backfill tenant_id from spend_items
    await queryRunner.query(`
      UPDATE spend_tasks st
      SET tenant_id = si.tenant_id
      FROM spend_items si
      WHERE st.item_id = si.id
      AND st.tenant_id IS NULL;
    `);

    // Make tenant_id NOT NULL after backfill
    await queryRunner.query(`
      ALTER TABLE spend_tasks
      ALTER COLUMN tenant_id SET NOT NULL;
    `);

    // Update existing 'skipped' status to 'cancelled'
    await queryRunner.query(`
      UPDATE spend_tasks
      SET status = 'cancelled'
      WHERE status = 'skipped';
    `);

    // Add check constraint for valid status values
    await queryRunner.query(`
      ALTER TABLE spend_tasks
      DROP CONSTRAINT IF EXISTS spend_tasks_status_check;
    `);

    await queryRunner.query(`
      ALTER TABLE spend_tasks
      ADD CONSTRAINT spend_tasks_status_check
      CHECK (status IN ('open', 'in_progress', 'done', 'cancelled'));
    `);

    // Enable RLS for spend_tasks
    await queryRunner.query(`ALTER TABLE spend_tasks ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE spend_tasks FORCE ROW LEVEL SECURITY;`);

    // Drop existing policies if any
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_policy ON spend_tasks;`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select_policy ON spend_tasks;`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert_policy ON spend_tasks;`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update_policy ON spend_tasks;`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete_policy ON spend_tasks;`);

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select_policy ON spend_tasks
      FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert_policy ON spend_tasks
      FOR INSERT WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update_policy ON spend_tasks
      FOR UPDATE USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete_policy ON spend_tasks
      FOR DELETE USING (tenant_id::text = current_setting('app.current_tenant_id', TRUE));
    `);

    // Create index on tenant_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_tasks_tenant_id ON spend_tasks(tenant_id);
    `);

    // Create index on status for filtering
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_spend_tasks_status ON spend_tasks(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_tasks_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_spend_tasks_tenant_id;`);

    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete_policy ON spend_tasks;`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update_policy ON spend_tasks;`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert_policy ON spend_tasks;`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select_policy ON spend_tasks;`);

    // Disable RLS
    await queryRunner.query(`ALTER TABLE spend_tasks DISABLE ROW LEVEL SECURITY;`);

    // Revert status constraint
    await queryRunner.query(`ALTER TABLE spend_tasks DROP CONSTRAINT IF EXISTS spend_tasks_status_check;`);

    // Revert 'cancelled' back to 'skipped'
    await queryRunner.query(`
      UPDATE spend_tasks
      SET status = 'skipped'
      WHERE status = 'cancelled';
    `);

    // Drop tenant_id column
    await queryRunner.query(`ALTER TABLE spend_tasks DROP COLUMN IF EXISTS tenant_id;`);

    // Drop title column
    await queryRunner.query(`ALTER TABLE spend_tasks DROP COLUMN IF EXISTS title;`);
  }
}