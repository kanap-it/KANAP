import { MigrationInterface, QueryRunner } from 'typeorm';

const ITEM_SEQUENCE_TYPES_BEFORE = `'task', 'request', 'project', 'document', 'application', 'asset', 'location', 'connection', 'interface', 'spend', 'capex', 'incident'`;
const ITEM_SEQUENCE_TYPES_AFTER = `${ITEM_SEQUENCE_TYPES_BEFORE}, 'contributor'`;

/**
 * Adds a per-tenant sequential business reference (item_number, rendered as CTR-N)
 * to portfolio_team_member_configs so contributor URLs and titles carry a readable
 * reference instead of the row UUID. Backfills existing rows in creation order and
 * seeds the shared item_sequences allocator for the new 'contributor' entity type.
 */
export class ContributorItemNumber1853510000000 implements MigrationInterface {
  name = 'ContributorItemNumber1853510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs ADD COLUMN IF NOT EXISTS item_number int`);

    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`ALTER TABLE item_sequences DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN (${ITEM_SEQUENCE_TYPES_AFTER}))
    `);

    await queryRunner.query(`
      WITH numbered AS (
        SELECT id, tenant_id,
          ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC, id ASC) AS rn
        FROM portfolio_team_member_configs
      )
      UPDATE portfolio_team_member_configs SET item_number = numbered.rn
      FROM numbered WHERE portfolio_team_member_configs.id = numbered.id
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM portfolio_team_member_configs
          GROUP BY tenant_id
          HAVING COUNT(*) > 0 AND COUNT(item_number) = 0
        ) THEN
          RAISE EXCEPTION 'contributor item_number backfill touched zero rows for a tenant with contributors';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      INSERT INTO item_sequences (tenant_id, entity_type, next_val)
      SELECT tenant_id, 'contributor', COALESCE(MAX(item_number), 0) + 1
      FROM portfolio_team_member_configs GROUP BY tenant_id
      ON CONFLICT (tenant_id, entity_type)
      DO UPDATE SET next_val = GREATEST(item_sequences.next_val, EXCLUDED.next_val)
    `);

    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs ALTER COLUMN item_number SET NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_portfolio_team_member_configs_tenant_item_number ON portfolio_team_member_configs(tenant_id, item_number)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_portfolio_team_member_configs_tenant_item_number`);
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs DROP COLUMN IF EXISTS item_number`);

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM item_sequences WHERE entity_type = 'contributor'`);
    await queryRunner.query(`ALTER TABLE item_sequences DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN (${ITEM_SEQUENCE_TYPES_BEFORE}))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);
  }
}
