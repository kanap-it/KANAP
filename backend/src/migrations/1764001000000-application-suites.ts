import { MigrationInterface, QueryRunner } from "typeorm";

export class ApplicationSuites1764001000000 implements MigrationInterface {
  name = 'ApplicationSuites1764001000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_suites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        application_id uuid NOT NULL,
        suite_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_app_suites UNIQUE (tenant_id, application_id, suite_id)
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_suites_tenant ON application_suites(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_suites_app ON application_suites(tenant_id, application_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_app_suites_suite ON application_suites(tenant_id, suite_id)`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_suites_application'
    ) THEN
      ALTER TABLE application_suites ADD CONSTRAINT fk_app_suites_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);
    await queryRunner.query(`DO $$ BEGIN IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_app_suites_suite'
    ) THEN
      ALTER TABLE application_suites ADD CONSTRAINT fk_app_suites_suite FOREIGN KEY (suite_id) REFERENCES applications(id) ON DELETE CASCADE;
    END IF; END $$;`);

    // Enable RLS and tenant isolation policy
    const t = 'application_suites';
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
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = 'application_suites';
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '${t}' AND policyname = '${t}_tenant_isolation'
      ) THEN
        DROP POLICY ${t}_tenant_isolation ON ${t};
      END IF;
    END $$;`);
    await queryRunner.query(`ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP TABLE IF EXISTS ${t};`);
  }
}

