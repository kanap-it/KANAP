import { MigrationInterface, QueryRunner } from 'typeorm';

export class ItemNumbers1825000000000 implements MigrationInterface {
  name = 'ItemNumbers1825000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1a. Create item_sequences table
    await queryRunner.query(`
      CREATE TABLE item_sequences (
        tenant_id uuid NOT NULL,
        entity_type text NOT NULL CHECK (entity_type IN ('task', 'request', 'project')),
        next_val int NOT NULL DEFAULT 1,
        PRIMARY KEY (tenant_id, entity_type)
      )
    `);

    // 1b. Add item_number column to 3 tables (nullable initially)
    await queryRunner.query(`ALTER TABLE tasks ADD COLUMN item_number int`);
    await queryRunner.query(`ALTER TABLE portfolio_projects ADD COLUMN item_number int`);
    await queryRunner.query(`ALTER TABLE portfolio_requests ADD COLUMN item_number int`);

    // 1c. Temporarily disable RLS so backfill can see all rows
    const tables = ['tasks', 'portfolio_projects', 'portfolio_requests'];
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }

    // 1d. Backfill existing rows (ordered by created_at ASC, id ASC)
    await queryRunner.query(`
      WITH numbered AS (
        SELECT id, tenant_id,
          ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC, id ASC) AS rn
        FROM tasks
      )
      UPDATE tasks SET item_number = numbered.rn
      FROM numbered WHERE tasks.id = numbered.id
    `);

    await queryRunner.query(`
      WITH numbered AS (
        SELECT id, tenant_id,
          ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC, id ASC) AS rn
        FROM portfolio_projects
      )
      UPDATE portfolio_projects SET item_number = numbered.rn
      FROM numbered WHERE portfolio_projects.id = numbered.id
    `);

    await queryRunner.query(`
      WITH numbered AS (
        SELECT id, tenant_id,
          ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC, id ASC) AS rn
        FROM portfolio_requests
      )
      UPDATE portfolio_requests SET item_number = numbered.rn
      FROM numbered WHERE portfolio_requests.id = numbered.id
    `);

    // 1e. Seed item_sequences with current max per tenant
    await queryRunner.query(`
      INSERT INTO item_sequences (tenant_id, entity_type, next_val)
      SELECT tenant_id, 'task', COALESCE(MAX(item_number), 0) + 1
      FROM tasks GROUP BY tenant_id
    `);

    await queryRunner.query(`
      INSERT INTO item_sequences (tenant_id, entity_type, next_val)
      SELECT tenant_id, 'project', COALESCE(MAX(item_number), 0) + 1
      FROM portfolio_projects GROUP BY tenant_id
    `);

    await queryRunner.query(`
      INSERT INTO item_sequences (tenant_id, entity_type, next_val)
      SELECT tenant_id, 'request', COALESCE(MAX(item_number), 0) + 1
      FROM portfolio_requests GROUP BY tenant_id
    `);

    // 1f. Re-enable RLS on the 3 tables
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
    }

    // 1g. Enable RLS on item_sequences (AFTER seeding)
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY item_sequences_tenant_isolation ON item_sequences
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)
    `);

    // 1h. Add NOT NULL constraints and unique indexes
    await queryRunner.query(`ALTER TABLE tasks ALTER COLUMN item_number SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_tasks_tenant_item_number ON tasks(tenant_id, item_number)`);

    await queryRunner.query(`ALTER TABLE portfolio_projects ALTER COLUMN item_number SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_portfolio_projects_tenant_item_number ON portfolio_projects(tenant_id, item_number)`);

    await queryRunner.query(`ALTER TABLE portfolio_requests ALTER COLUMN item_number SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_portfolio_requests_tenant_item_number ON portfolio_requests(tenant_id, item_number)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS uq_tasks_tenant_item_number`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_portfolio_projects_tenant_item_number`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_portfolio_requests_tenant_item_number`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN IF EXISTS item_number`);
    await queryRunner.query(`ALTER TABLE portfolio_projects DROP COLUMN IF EXISTS item_number`);
    await queryRunner.query(`ALTER TABLE portfolio_requests DROP COLUMN IF EXISTS item_number`);

    // Drop RLS policy and table
    await queryRunner.query(`DROP POLICY IF EXISTS item_sequences_tenant_isolation ON item_sequences`);
    await queryRunner.query(`DROP TABLE IF EXISTS item_sequences`);
  }
}
