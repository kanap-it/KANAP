import { MigrationInterface, QueryRunner } from "typeorm";

export class RLSEnableInitial1756687500000 implements MigrationInterface {
  name = 'RLSEnableInitial1756687500000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = ['users','companies','departments','suppliers','accounts'];
    for (const t of tables) {
      await queryRunner.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${t} FORCE ROW LEVEL SECURITY`);
      await queryRunner.query(`DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${t}' AND policyname = '${t}_tenant_isolation'
        ) THEN
          EXECUTE format('CREATE POLICY %I ON %I USING (tenant_id = current_setting(''app.current_tenant'', true)::uuid)', '${t}_tenant_isolation', '${t}');
        END IF;
      END $$;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = ['users','companies','departments','suppliers','accounts'];
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

