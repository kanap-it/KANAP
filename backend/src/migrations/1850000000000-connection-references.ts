import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConnectionReferences1850000000000 implements MigrationInterface {
  name = 'ConnectionReferences1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE connections
      ADD COLUMN IF NOT EXISTS connection_reference text
    `);

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check
    `);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application', 'asset', 'location', 'connection'))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assign_connection_reference()
      RETURNS trigger AS $$
      DECLARE
        allocated_number integer;
      BEGIN
        IF NEW.connection_reference IS NULL OR btrim(NEW.connection_reference) = '' THEN
          INSERT INTO item_sequences (tenant_id, entity_type, next_val)
          VALUES (NEW.tenant_id, 'connection', 2)
          ON CONFLICT (tenant_id, entity_type)
          DO UPDATE SET next_val = item_sequences.next_val + 1
          RETURNING next_val - 1 INTO allocated_number;

          NEW.connection_reference := 'CONN-' || allocated_number::text;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_connections_connection_reference ON connections`);
    await queryRunner.query(`
      CREATE TRIGGER trg_connections_connection_reference
      BEFORE INSERT ON connections
      FOR EACH ROW
      EXECUTE FUNCTION assign_connection_reference()
    `);

    const tenants = await queryRunner.query(`
      SELECT id
      FROM tenants
      ORDER BY id
    `) as Array<{ id: string }>;

    for (const tenant of tenants) {
      await queryRunner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);

      await queryRunner.query(`
        WITH ordered AS (
          SELECT id,
                 row_number() OVER (ORDER BY created_at ASC, id ASC) AS rn
          FROM connections
          WHERE tenant_id = app_current_tenant()
            AND (connection_reference IS NULL OR connection_reference = '')
        )
        UPDATE connections c
        SET connection_reference = 'CONN-' || ordered.rn::text
        FROM ordered
        WHERE c.id = ordered.id
          AND c.tenant_id = app_current_tenant()
      `);

      await queryRunner.query(`
        INSERT INTO item_sequences (tenant_id, entity_type, next_val)
        SELECT app_current_tenant(),
               'connection',
               COALESCE(MAX(NULLIF(regexp_replace(connection_reference, '^CONN-', ''), '')::int), 0) + 1
        FROM connections
        WHERE tenant_id = app_current_tenant()
          AND connection_reference ~ '^CONN-[0-9]+$'
        ON CONFLICT (tenant_id, entity_type)
        DO UPDATE SET next_val = GREATEST(item_sequences.next_val, EXCLUDED.next_val)
      `);
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_connections_tenant_connection_reference
      ON connections (tenant_id, connection_reference)
      WHERE connection_reference IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE connections
      ALTER COLUMN connection_reference SET NOT NULL
    `);

    // Drop legacy unique index on (tenant_id, connection_id) before dropping the column
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_a4ea15234dec0fe2efb6b6f5e6"`);
    await queryRunner.query(`
      DO $$ DECLARE
        idx_name text;
      BEGIN
        SELECT indexname INTO idx_name
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'connections'
          AND indexdef ILIKE '%(tenant_id, connection_id)%'
        LIMIT 1;
        IF idx_name IS NOT NULL THEN
          EXECUTE format('DROP INDEX IF EXISTS %I', idx_name);
        END IF;
      END $$;
    `);
    await queryRunner.query(`ALTER TABLE connections DROP COLUMN IF EXISTS connection_id`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE connections ADD COLUMN IF NOT EXISTS connection_id text`);
    await queryRunner.query(`UPDATE connections SET connection_id = connection_reference WHERE connection_id IS NULL`);
    await queryRunner.query(`ALTER TABLE connections ALTER COLUMN connection_id SET NOT NULL`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_connections_tenant_connection_id
      ON connections (tenant_id, connection_id)
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS uq_connections_tenant_connection_reference`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_connections_connection_reference ON connections`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS assign_connection_reference`);
    await queryRunner.query(`ALTER TABLE connections DROP COLUMN IF EXISTS connection_reference`);

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check
    `);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application', 'asset', 'location'))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);
  }
}
