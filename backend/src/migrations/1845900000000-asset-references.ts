import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssetReferences1845900000000 implements MigrationInterface {
  name = 'AssetReferences1845900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE assets
      ADD COLUMN IF NOT EXISTS asset_reference text
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_assets_tenant_asset_reference
      ON assets (tenant_id, asset_reference)
      WHERE asset_reference IS NOT NULL
    `);

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

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assign_asset_reference()
      RETURNS trigger AS $$
      DECLARE
        allocated_number integer;
      BEGIN
        IF NEW.asset_reference IS NULL OR btrim(NEW.asset_reference) = '' THEN
          INSERT INTO item_sequences (tenant_id, entity_type, next_val)
          VALUES (NEW.tenant_id, 'asset', 2)
          ON CONFLICT (tenant_id, entity_type)
          DO UPDATE SET next_val = item_sequences.next_val + 1
          RETURNING next_val - 1 INTO allocated_number;

          NEW.asset_reference := 'AST-' || allocated_number::text;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_assets_asset_reference ON assets`);
    await queryRunner.query(`
      CREATE TRIGGER trg_assets_asset_reference
      BEFORE INSERT ON assets
      FOR EACH ROW
      EXECUTE FUNCTION assign_asset_reference()
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
          FROM assets
          WHERE tenant_id = app_current_tenant()
            AND (asset_reference IS NULL OR asset_reference = '')
        )
        UPDATE assets a
        SET asset_reference = 'AST-' || ordered.rn::text
        FROM ordered
        WHERE a.id = ordered.id
          AND a.tenant_id = app_current_tenant()
      `);

      await queryRunner.query(`
        INSERT INTO item_sequences (tenant_id, entity_type, next_val)
        SELECT app_current_tenant(),
               'asset',
               COALESCE(MAX(NULLIF(regexp_replace(asset_reference, '^AST-', ''), '')::int), 0) + 1
        FROM assets
        WHERE tenant_id = app_current_tenant()
          AND asset_reference ~ '^AST-[0-9]+$'
        ON CONFLICT (tenant_id, entity_type)
        DO UPDATE SET next_val = GREATEST(item_sequences.next_val, EXCLUDED.next_val)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_assets_asset_reference ON assets`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS assign_asset_reference`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_assets_tenant_asset_reference`);
    await queryRunner.query(`
      ALTER TABLE assets
      DROP COLUMN IF EXISTS asset_reference
    `);

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check
    `);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application'))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);
  }
}
