import { MigrationInterface, QueryRunner } from 'typeorm';

export class LocationReferences1846200000000 implements MigrationInterface {
  name = 'LocationReferences1846200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE locations
      ADD COLUMN IF NOT EXISTS location_reference text
    `);

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

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assign_location_reference()
      RETURNS trigger AS $$
      DECLARE
        allocated_number integer;
      BEGIN
        IF NEW.location_reference IS NULL OR btrim(NEW.location_reference) = '' THEN
          INSERT INTO item_sequences (tenant_id, entity_type, next_val)
          VALUES (NEW.tenant_id, 'location', 2)
          ON CONFLICT (tenant_id, entity_type)
          DO UPDATE SET next_val = item_sequences.next_val + 1
          RETURNING next_val - 1 INTO allocated_number;

          NEW.location_reference := 'LOC-' || allocated_number::text;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_locations_location_reference ON locations`);
    await queryRunner.query(`
      CREATE TRIGGER trg_locations_location_reference
      BEFORE INSERT ON locations
      FOR EACH ROW
      EXECUTE FUNCTION assign_location_reference()
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
          FROM locations
          WHERE tenant_id = app_current_tenant()
            AND (location_reference IS NULL OR location_reference = '')
        )
        UPDATE locations l
        SET location_reference = 'LOC-' || ordered.rn::text
        FROM ordered
        WHERE l.id = ordered.id
          AND l.tenant_id = app_current_tenant()
      `);

      await queryRunner.query(`
        INSERT INTO item_sequences (tenant_id, entity_type, next_val)
        SELECT app_current_tenant(),
               'location',
               COALESCE(MAX(NULLIF(regexp_replace(location_reference, '^LOC-', ''), '')::int), 0) + 1
        FROM locations
        WHERE tenant_id = app_current_tenant()
          AND location_reference ~ '^LOC-[0-9]+$'
        ON CONFLICT (tenant_id, entity_type)
        DO UPDATE SET next_val = GREATEST(item_sequences.next_val, EXCLUDED.next_val)
      `);
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_locations_tenant_location_reference
      ON locations (tenant_id, location_reference)
      WHERE location_reference IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE locations
      ALTER COLUMN location_reference SET NOT NULL
    `);

    // Drop legacy unique index on lower(code) before dropping the column
    await queryRunner.query(`DROP INDEX IF EXISTS idx_locations_tenant_code_ci`);
    await queryRunner.query(`ALTER TABLE locations DROP COLUMN IF EXISTS code`);
    await queryRunner.query(`ALTER TABLE locations DROP COLUMN IF EXISTS datacenter`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS datacenter text`);
    await queryRunner.query(`ALTER TABLE locations ADD COLUMN IF NOT EXISTS code text`);
    // Best-effort backfill of `code` from `location_reference` so the NOT NULL recovery is possible
    await queryRunner.query(`UPDATE locations SET code = location_reference WHERE code IS NULL`);
    await queryRunner.query(`ALTER TABLE locations ALTER COLUMN code SET NOT NULL`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_tenant_code_ci
      ON locations(tenant_id, lower(code))
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS uq_locations_tenant_location_reference`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_locations_location_reference ON locations`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS assign_location_reference`);
    await queryRunner.query(`ALTER TABLE locations DROP COLUMN IF EXISTS location_reference`);

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check
    `);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application', 'asset'))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);
  }
}
