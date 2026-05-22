import { MigrationInterface, QueryRunner } from 'typeorm';

export class InterfaceReferences1850400000000 implements MigrationInterface {
  name = 'InterfaceReferences1850400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE interfaces
      ADD COLUMN IF NOT EXISTS interface_reference text
    `);

    await queryRunner.query(`
      ALTER TABLE interfaces
      ALTER COLUMN interface_id DROP NOT NULL
    `);

    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check
    `);
    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document', 'application', 'asset', 'location', 'connection', 'interface'))
    `);
    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION assign_interface_reference()
      RETURNS trigger AS $$
      DECLARE
        allocated_number integer;
      BEGIN
        IF NEW.interface_reference IS NULL OR btrim(NEW.interface_reference) = '' THEN
          INSERT INTO item_sequences (tenant_id, entity_type, next_val)
          VALUES (NEW.tenant_id, 'interface', 2)
          ON CONFLICT (tenant_id, entity_type)
          DO UPDATE SET next_val = item_sequences.next_val + 1
          RETURNING next_val - 1 INTO allocated_number;

          NEW.interface_reference := 'INT-' || allocated_number::text;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_interfaces_interface_reference ON interfaces`);
    await queryRunner.query(`
      CREATE TRIGGER trg_interfaces_interface_reference
      BEFORE INSERT ON interfaces
      FOR EACH ROW
      EXECUTE FUNCTION assign_interface_reference()
    `);

    const tenants = await queryRunner.query(`
      SELECT id
      FROM tenants
      ORDER BY id
    `) as Array<{ id: string }>;

    for (const tenant of tenants) {
      await queryRunner.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenant.id]);

      await queryRunner.query(`
        WITH current_max AS (
          SELECT COALESCE(MAX(NULLIF(regexp_replace(interface_reference, '^INT-', ''), '')::int), 0) AS max_num
          FROM interfaces
          WHERE tenant_id = app_current_tenant()
            AND interface_reference ~ '^INT-[0-9]+$'
        ),
        ordered AS (
          SELECT i.id,
                 current_max.max_num + row_number() OVER (ORDER BY i.created_at ASC, i.id ASC) AS allocated_number
          FROM interfaces i
          CROSS JOIN current_max
          WHERE i.tenant_id = app_current_tenant()
            AND (i.interface_reference IS NULL OR btrim(i.interface_reference) = '')
        )
        UPDATE interfaces i
        SET interface_reference = 'INT-' || ordered.allocated_number::text
        FROM ordered
        WHERE i.id = ordered.id
          AND i.tenant_id = app_current_tenant()
      `);

      await queryRunner.query(`
        INSERT INTO item_sequences (tenant_id, entity_type, next_val)
        SELECT app_current_tenant(),
               'interface',
               COALESCE(MAX(NULLIF(regexp_replace(interface_reference, '^INT-', ''), '')::int), 0) + 1
        FROM interfaces
        WHERE tenant_id = app_current_tenant()
          AND interface_reference ~ '^INT-[0-9]+$'
        ON CONFLICT (tenant_id, entity_type)
        DO UPDATE SET next_val = GREATEST(item_sequences.next_val, EXCLUDED.next_val)
      `);
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_interfaces_tenant_interface_reference
      ON interfaces (tenant_id, interface_reference)
      WHERE interface_reference IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE interfaces
      ALTER COLUMN interface_reference SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_interfaces_tenant_interface_reference`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_interfaces_interface_reference ON interfaces`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS assign_interface_reference`);
    await queryRunner.query(`UPDATE interfaces SET interface_id = interface_reference WHERE interface_id IS NULL OR btrim(interface_id) = ''`);
    await queryRunner.query(`ALTER TABLE interfaces DROP COLUMN IF EXISTS interface_reference`);
    await queryRunner.query(`ALTER TABLE interfaces ALTER COLUMN interface_id SET NOT NULL`);

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
  }
}
