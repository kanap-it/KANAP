import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFreezeStates1756694900000 implements MigrationInterface {
  name = 'CreateFreezeStates1756694900000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS freeze_states (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        budget_year integer NOT NULL,
        scope text NOT NULL,
        column_key text NOT NULL,
        is_frozen boolean NOT NULL DEFAULT true,
        frozen_by uuid NULL,
        frozen_at timestamptz NULL,
        unfrozen_by uuid NULL,
        unfrozen_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_freeze_states_scope CHECK (scope IN ('opex','capex','companies','departments')),
        CONSTRAINT chk_freeze_states_column CHECK (
          (scope IN ('opex','capex') AND column_key IN ('budget','revision','actual','landing')) OR
          (scope IN ('companies','departments') AND column_key = '__all__')
        )
      );
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uniq_freeze_states_scope ON freeze_states(tenant_id, budget_year, scope, column_key);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_freeze_states_tenant ON freeze_states(tenant_id);`);

    await queryRunner.query(`ALTER TABLE freeze_states ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE freeze_states FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'freeze_states' AND policyname = 'freeze_states_tenant_isolation'
      ) THEN
        DROP POLICY freeze_states_tenant_isolation ON freeze_states;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE POLICY freeze_states_tenant_isolation ON freeze_states
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'freeze_states' AND policyname = 'freeze_states_tenant_isolation'
      ) THEN
        DROP POLICY freeze_states_tenant_isolation ON freeze_states;
      END IF;
    END $$;`);
    await queryRunner.query(`ALTER TABLE freeze_states DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS freeze_states;`);
  }
}
