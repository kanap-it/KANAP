import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a per-tenant sequential business reference (item_number, rendered as CPX-N)
 * to capex_items, backfills existing rows, and seeds the shared item_sequences
 * allocator for the new 'capex' entity type.
 */
export class CapexItemNumber1853200000000 implements MigrationInterface {
  name = 'CapexItemNumber1853200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE capex_items ADD COLUMN IF NOT EXISTS item_number int`);

    await queryRunner.query(`ALTER TABLE capex_items DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);

    // The search_index sync trigger (1853000000000) fires on UPDATE and writes into
    // search_index, which stays under FORCE RLS with no tenant context here → violation.
    // Disable it during the backfill; 1853220000000 re-syncs all capex search_index rows
    // right after (with the new CPX token), so nothing is lost.
    await queryRunner.query(`ALTER TABLE capex_items DISABLE TRIGGER trg_search_index_capex_items`);

    await queryRunner.query(`ALTER TABLE item_sequences DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application', 'asset', 'location', 'connection', 'interface', 'spend', 'capex'))
    `);

    await queryRunner.query(`
      WITH numbered AS (
        SELECT id, tenant_id,
          ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC, id ASC) AS rn
        FROM capex_items
      )
      UPDATE capex_items SET item_number = numbered.rn
      FROM numbered WHERE capex_items.id = numbered.id
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM capex_items
          GROUP BY tenant_id
          HAVING COUNT(*) > 0 AND COUNT(item_number) = 0
        ) THEN
          RAISE EXCEPTION 'capex item_number backfill touched zero rows for a tenant with CAPEX items';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      INSERT INTO item_sequences (tenant_id, entity_type, next_val)
      SELECT tenant_id, 'capex', COALESCE(MAX(item_number), 0) + 1
      FROM capex_items GROUP BY tenant_id
      ON CONFLICT (tenant_id, entity_type)
      DO UPDATE SET next_val = GREATEST(item_sequences.next_val, EXCLUDED.next_val)
    `);

    await queryRunner.query(`ALTER TABLE capex_items ENABLE TRIGGER trg_search_index_capex_items`);
    await queryRunner.query(`ALTER TABLE capex_items ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE capex_items FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`ALTER TABLE capex_items ALTER COLUMN item_number SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_capex_items_tenant_item_number ON capex_items(tenant_id, item_number)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_capex_items_tenant_item_number`);
    await queryRunner.query(`ALTER TABLE capex_items DROP COLUMN IF EXISTS item_number`);

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM item_sequences WHERE entity_type = 'capex'`);
    await queryRunner.query(`ALTER TABLE item_sequences DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application', 'asset', 'location', 'connection', 'interface', 'spend'))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);
  }
}
