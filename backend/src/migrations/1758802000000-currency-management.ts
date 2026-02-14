import { MigrationInterface, QueryRunner } from 'typeorm';

export class CurrencyManagement1758802000000 implements MigrationInterface {
  name = 'CurrencyManagement1758802000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS currency_rate_sets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL DEFAULT app_current_tenant() REFERENCES tenants(id) ON DELETE CASCADE,
        fiscal_year integer NOT NULL,
        base_currency char(3) NOT NULL REFERENCES currencies(code),
        rates jsonb NOT NULL,
        rate_basis text NOT NULL DEFAULT 'annual_avg',
        source text NOT NULL DEFAULT 'world-bank',
        captured_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_currency_rate_sets_tenant_year
        ON currency_rate_sets(tenant_id, fiscal_year);
    `);

    await queryRunner.query(`
      ALTER TABLE spend_versions
        ADD COLUMN IF NOT EXISTS reporting_currency char(3) NOT NULL DEFAULT 'EUR',
        ADD COLUMN IF NOT EXISTS fx_rate_set_id uuid NULL REFERENCES currency_rate_sets(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE capex_versions
        ADD COLUMN IF NOT EXISTS reporting_currency char(3) NOT NULL DEFAULT 'EUR',
        ADD COLUMN IF NOT EXISTS fx_rate_set_id uuid NULL REFERENCES currency_rate_sets(id) ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE currency_rate_sets ENABLE ROW LEVEL SECURITY;
    `);

    await queryRunner.query(`
      CREATE POLICY currency_rate_sets_isolation ON currency_rate_sets
        USING (tenant_id = app_current_tenant())
        WITH CHECK (tenant_id = app_current_tenant());
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE capex_versions
        DROP COLUMN IF EXISTS fx_rate_set_id,
        DROP COLUMN IF EXISTS reporting_currency;
    `);

    await queryRunner.query(`
      ALTER TABLE spend_versions
        DROP COLUMN IF EXISTS fx_rate_set_id,
        DROP COLUMN IF EXISTS reporting_currency;
    `);

    await queryRunner.query(`
      DROP POLICY IF EXISTS currency_rate_sets_isolation ON currency_rate_sets;
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS currency_rate_sets;
    `);
  }
}
