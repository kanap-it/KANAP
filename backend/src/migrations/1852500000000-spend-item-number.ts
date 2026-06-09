import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a per-tenant sequential business reference (item_number, rendered as OPX-N)
 * to spend_items, backfills existing rows, and seeds the shared item_sequences
 * allocator for the new 'spend' entity type.
 *
 * Mirrors ItemNumbers1825000000000 / InterfaceReferences1850400000000:
 *  - RLS is disabled on the affected tables for the duration of the backfill/seed
 *    so the migration sees every tenant's rows, then re-enabled + forced.
 *  - The item_sequences entity_type CHECK is widened to include 'spend' BEFORE any
 *    'spend' rows are seeded (otherwise the INSERT would violate the constraint).
 */
export class SpendItemNumber1852500000000 implements MigrationInterface {
  name = 'SpendItemNumber1852500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add nullable item_number column.
    await queryRunner.query(`ALTER TABLE spend_items ADD COLUMN IF NOT EXISTS item_number int`);

    // 2. Disable RLS on both tables for backfill + sequence seeding.
    await queryRunner.query(`ALTER TABLE spend_items DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);

    // 3. Widen the entity_type CHECK to include 'spend' BEFORE seeding any spend rows.
    await queryRunner.query(`ALTER TABLE item_sequences DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application', 'asset', 'location', 'connection', 'interface', 'spend'))
    `);

    // 4. Backfill existing rows per tenant (ordered by created_at ASC, id ASC).
    await queryRunner.query(`
      WITH numbered AS (
        SELECT id, tenant_id,
          ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC, id ASC) AS rn
        FROM spend_items
      )
      UPDATE spend_items SET item_number = numbered.rn
      FROM numbered WHERE spend_items.id = numbered.id
    `);

    // 5. Seed item_sequences for 'spend' with current max per tenant (idempotent).
    await queryRunner.query(`
      INSERT INTO item_sequences (tenant_id, entity_type, next_val)
      SELECT tenant_id, 'spend', COALESCE(MAX(item_number), 0) + 1
      FROM spend_items GROUP BY tenant_id
      ON CONFLICT (tenant_id, entity_type)
      DO UPDATE SET next_val = GREATEST(item_sequences.next_val, EXCLUDED.next_val)
    `);

    // 6. Re-enable + force RLS.
    await queryRunner.query(`ALTER TABLE spend_items ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE spend_items FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);

    // 7. Enforce NOT NULL + per-tenant uniqueness.
    await queryRunner.query(`ALTER TABLE spend_items ALTER COLUMN item_number SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_spend_items_tenant_item_number ON spend_items(tenant_id, item_number)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_spend_items_tenant_item_number`);
    await queryRunner.query(`ALTER TABLE spend_items DROP COLUMN IF EXISTS item_number`);

    // Remove spend sequence rows BEFORE tightening the CHECK back, otherwise the
    // narrower ADD CONSTRAINT would fail against existing 'spend' rows.
    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM item_sequences WHERE entity_type = 'spend'`);
    await queryRunner.query(`ALTER TABLE item_sequences DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application', 'asset', 'location', 'connection', 'interface'))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);
  }
}
