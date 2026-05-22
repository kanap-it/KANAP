import { MigrationInterface, QueryRunner } from 'typeorm';

export class InterfaceMappingRuleScope1850900000000 implements MigrationInterface {
  name = 'InterfaceMappingRuleScope1850900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE interface_mapping_rules
      ADD COLUMN IF NOT EXISTS lifecycle text NOT NULL DEFAULT 'active'
    `);
    await queryRunner.query(`
      ALTER TABLE interface_mapping_rules
      ADD COLUMN IF NOT EXISTS environment_scope text[] NULL
    `);
    await queryRunner.query(`
      UPDATE interface_mapping_rules
      SET lifecycle = 'active'
      WHERE lifecycle IS NULL OR trim(lifecycle) = ''
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_interface_mapping_rules_lifecycle'
        ) THEN
          ALTER TABLE interface_mapping_rules
          ADD CONSTRAINT chk_interface_mapping_rules_lifecycle
          CHECK (lifecycle IN ('active', 'proposed', 'deprecated', 'retired'));
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_interface_mapping_rules_environment_scope'
        ) THEN
          ALTER TABLE interface_mapping_rules
          ADD CONSTRAINT chk_interface_mapping_rules_environment_scope
          CHECK (
            environment_scope IS NULL
            OR environment_scope <@ ARRAY['prod', 'pre_prod', 'qa', 'test', 'dev', 'sandbox']::text[]
          );
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_interface_mapping_rules_lifecycle
      ON interface_mapping_rules(tenant_id, mapping_set_id, lifecycle)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_interface_mapping_rules_environment_scope
      ON interface_mapping_rules USING GIN (environment_scope)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_interface_mapping_rules_environment_scope`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_interface_mapping_rules_lifecycle`);
    await queryRunner.query(`
      ALTER TABLE interface_mapping_rules
      DROP CONSTRAINT IF EXISTS chk_interface_mapping_rules_environment_scope
    `);
    await queryRunner.query(`
      ALTER TABLE interface_mapping_rules
      DROP CONSTRAINT IF EXISTS chk_interface_mapping_rules_lifecycle
    `);
    await queryRunner.query(`
      ALTER TABLE interface_mapping_rules
      DROP COLUMN IF EXISTS environment_scope
    `);
    await queryRunner.query(`
      ALTER TABLE interface_mapping_rules
      DROP COLUMN IF EXISTS lifecycle
    `);
  }
}
