import { MigrationInterface, QueryRunner } from "typeorm";

export class RLSEnableCapex1756688200000 implements MigrationInterface {
  name = 'RLSEnableCapex1756688200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = ['capex_items','capex_versions','capex_amounts'];
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${t}' AND policyname = '${t}_tenant_isolation'
        ) THEN
          DROP POLICY ${t}_tenant_isolation ON ${t};
        END IF;
      END $$;`);
      await queryRunner.query(`CREATE POLICY ${t}_tenant_isolation ON ${t}
        USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = ['capex_items','capex_versions','capex_amounts'];
    for (const t of tables) {
      await queryRunner.query(`DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${t}' AND policyname = '${t}_tenant_isolation'
        ) THEN
          DROP POLICY ${t}_tenant_isolation ON ${t};
        END IF;
      END $$;`);
      await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    }
  }
}

