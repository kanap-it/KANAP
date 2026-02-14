import { MigrationInterface, QueryRunner } from "typeorm";

export class CoaInit1758807000000 implements MigrationInterface {
  name = 'CoaInit1758807000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant(),
        code text NOT NULL,
        name text NOT NULL,
        country_iso char(2) NOT NULL,
        is_default boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant_id ON chart_of_accounts(tenant_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_country ON chart_of_accounts(country_iso)`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'chart_of_accounts' AND c.conname = 'uq_coa_tenant_code'
      ) THEN
        ALTER TABLE chart_of_accounts ADD CONSTRAINT uq_coa_tenant_code UNIQUE (tenant_id, code);
      END IF;
    END $$;`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'uq_coa_tenant_country_default'
        ) THEN
          CREATE UNIQUE INDEX uq_coa_tenant_country_default
            ON chart_of_accounts(tenant_id, country_iso)
            WHERE is_default = true;
        END IF;
      END $$;
    `);

    // Enable RLS and tenant isolation policy
    await queryRunner.query(`ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE chart_of_accounts FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chart_of_accounts' AND policyname = 'chart_of_accounts_tenant_isolation'
      ) THEN
        DROP POLICY chart_of_accounts_tenant_isolation ON chart_of_accounts;
      END IF;
    END $$;`);
    await queryRunner.query(`CREATE POLICY chart_of_accounts_tenant_isolation ON chart_of_accounts
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'chart_of_accounts' AND policyname = 'chart_of_accounts_tenant_isolation'
      ) THEN
        DROP POLICY chart_of_accounts_tenant_isolation ON chart_of_accounts;
      END IF;
    END $$;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_coa_tenant_country_default`);
    await queryRunner.query(`ALTER TABLE chart_of_accounts DROP CONSTRAINT IF EXISTS uq_coa_tenant_code`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chart_of_accounts_tenant_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chart_of_accounts_country`);
    await queryRunner.query(`DROP TABLE IF EXISTS chart_of_accounts`);
  }
}

