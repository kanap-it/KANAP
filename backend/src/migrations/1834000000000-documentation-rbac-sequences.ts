import { MigrationInterface, QueryRunner } from 'typeorm';

export class DocumentationRbacSequences1834000000000 implements MigrationInterface {
  name = 'DocumentationRbacSequences1834000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // item_sequences uses RLS; disable while altering constraints.
    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      DO $$
      DECLARE c record;
      BEGIN
        FOR c IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'item_sequences'::regclass
            AND contype = 'c'
        LOOP
          EXECUTE format('ALTER TABLE item_sequences DROP CONSTRAINT IF EXISTS %I', c.conname);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project', 'document'))
    `);

    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);

    const rlsTables = ['roles', 'role_permissions'];
    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }

    await queryRunner.query(`
      WITH target_roles AS (
        SELECT
          r.id,
          r.tenant_id,
          CASE
            WHEN r.is_system = true AND lower(r.role_name) = 'administrator' THEN 'admin'
            WHEN r.is_built_in = true AND r.role_name LIKE '%Administrator' THEN 'admin'
            WHEN r.is_built_in = true AND (r.role_name LIKE '%Member' OR r.role_name = 'Business Contributor') THEN 'member'
            WHEN r.is_built_in = true AND r.role_name LIKE '%Reader' THEN 'reader'
            ELSE NULL
          END AS level
        FROM roles r
      )
      INSERT INTO role_permissions (role_id, resource, level, tenant_id)
      SELECT id, 'documentation', level, tenant_id
      FROM target_roles
      WHERE level IS NOT NULL
      ON CONFLICT (role_id, resource)
      DO UPDATE
        SET level = EXCLUDED.level,
            tenant_id = EXCLUDED.tenant_id
    `);

    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE item_sequences DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DELETE FROM item_sequences WHERE entity_type = 'document'`);

    await queryRunner.query(`
      ALTER TABLE item_sequences
      DROP CONSTRAINT IF EXISTS item_sequences_entity_type_check
    `);

    await queryRunner.query(`
      ALTER TABLE item_sequences
      ADD CONSTRAINT item_sequences_entity_type_check
      CHECK (entity_type IN ('task', 'request', 'project'))
    `);

    await queryRunner.query(`ALTER TABLE item_sequences ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE item_sequences FORCE ROW LEVEL SECURITY`);

    const rlsTables = ['roles', 'role_permissions'];
    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }

    await queryRunner.query(`DELETE FROM role_permissions WHERE resource = 'documentation'`);

    for (const table of rlsTables) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
  }
}
