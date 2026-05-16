import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refactor "connection layers" into a clearer "network path hops" model.
 *
 * - Renames `layer_type` (hardcoded enum web/app/db/proxy/...) into `function_code`
 *   (configurable list of network functions: NAT, VIP, WAF, reverse proxy, etc.)
 * - Drops `source_asset_id` / `source_entity_code` per hop (redundant: implicit from order).
 * - Renames `destination_asset_id` / `destination_entity_code` into
 *   `equipment_asset_id` / `equipment_entity_code` (the equipment performing the hop).
 * - Removes the 1..3 cap on order_index (no DB-level max; soft warning in UI).
 *
 * Backfill of `function_code`:
 *   - 'proxy'    → 'reverse_proxy'
 *   - 'gateway'  → 'api_gateway'
 *   - 'web','app','db','cache','queue' → NULL (no equivalent network function;
 *     original layer_type preserved as a `[migrated layer_type: X]` prefix in `notes`
 *     so the user can re-classify)
 */
export class ConnectionPathHops1850300000000 implements MigrationInterface {
  name = 'ConnectionPathHops1850300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add new columns.
    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD COLUMN IF NOT EXISTS function_code text,
      ADD COLUMN IF NOT EXISTS equipment_asset_id uuid,
      ADD COLUMN IF NOT EXISTS equipment_entity_code text
    `);

    // 2. Backfill equipment_* from destination_*.
    await queryRunner.query(`
      UPDATE connection_legs
      SET equipment_asset_id = destination_asset_id,
          equipment_entity_code = destination_entity_code
    `);

    // 3. Backfill function_code from layer_type.
    await queryRunner.query(`
      UPDATE connection_legs
      SET function_code = CASE
        WHEN layer_type = 'proxy' THEN 'reverse_proxy'
        WHEN layer_type = 'gateway' THEN 'api_gateway'
        WHEN layer_type IN ('web', 'app', 'db', 'cache', 'queue') THEN NULL
        WHEN layer_type IS NULL OR btrim(layer_type) = '' THEN NULL
        ELSE layer_type
      END
    `);

    // 4. Preserve original layer_type in notes for the cases mapped to NULL,
    //    so the user can re-classify the hop's function later.
    await queryRunner.query(`
      UPDATE connection_legs
      SET notes = CASE
        WHEN notes IS NULL OR btrim(notes) = ''
          THEN '[migrated layer_type: ' || layer_type || ']'
        ELSE '[migrated layer_type: ' || layer_type || '] ' || notes
      END
      WHERE function_code IS NULL
        AND layer_type IN ('web', 'app', 'db', 'cache', 'queue')
    `);

    // 5. Drop the 1..3 cap on order_index, keep ≥1.
    await queryRunner.query(`
      ALTER TABLE connection_legs
      DROP CONSTRAINT IF EXISTS chk_connection_legs_order_index
    `);
    await queryRunner.query(`
      DO $$ DECLARE
        constraint_name text;
      BEGIN
        SELECT con.conname INTO constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'connection_legs'
          AND pg_get_constraintdef(con.oid) ILIKE '%order_index%BETWEEN%'
        LIMIT 1;
        IF constraint_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE connection_legs DROP CONSTRAINT %I', constraint_name);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD CONSTRAINT chk_connection_legs_order_index_min CHECK (order_index >= 1)
    `);

    // 6. Drop old columns.
    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS source_asset_id`);
    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS source_entity_code`);
    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS destination_asset_id`);
    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS destination_entity_code`);
    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS layer_type`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD COLUMN IF NOT EXISTS source_asset_id uuid,
      ADD COLUMN IF NOT EXISTS source_entity_code text,
      ADD COLUMN IF NOT EXISTS destination_asset_id uuid,
      ADD COLUMN IF NOT EXISTS destination_entity_code text,
      ADD COLUMN IF NOT EXISTS layer_type text
    `);

    await queryRunner.query(`
      UPDATE connection_legs
      SET destination_asset_id = equipment_asset_id,
          destination_entity_code = equipment_entity_code,
          layer_type = COALESCE(function_code, 'app')
    `);

    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS function_code`);
    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS equipment_asset_id`);
    await queryRunner.query(`ALTER TABLE connection_legs DROP COLUMN IF EXISTS equipment_entity_code`);

    await queryRunner.query(`
      ALTER TABLE connection_legs DROP CONSTRAINT IF EXISTS chk_connection_legs_order_index_min
    `);
    await queryRunner.query(`
      ALTER TABLE connection_legs
      ADD CONSTRAINT chk_connection_legs_order_index CHECK (order_index BETWEEN 1 AND 3)
    `);
  }
}
