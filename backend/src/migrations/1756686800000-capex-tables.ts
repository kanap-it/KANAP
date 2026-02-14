import { MigrationInterface, QueryRunner } from "typeorm";

export class CapexTables1756686800000 implements MigrationInterface {
  name = 'CapexTables1756686800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums for CAPEX domain (compatibility: emulate IF NOT EXISTS via DO blocks)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ppe_type') THEN
          CREATE TYPE ppe_type AS ENUM ('hardware','software');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'capex_investment_type') THEN
          CREATE TYPE capex_investment_type AS ENUM ('replacement','capacity','productivity','security','conformity','business_growth','other');
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
          CREATE TYPE priority_level AS ENUM ('mandatory','high','medium','low');
        END IF;
      END $$;
    `);

    // capex_items
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS capex_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        description text NOT NULL,
        ppe_type ppe_type NOT NULL,
        investment_type capex_investment_type NOT NULL,
        priority priority_level NOT NULL,
        currency char(3) NOT NULL REFERENCES currencies(code),
        effective_start date NOT NULL,
        effective_end date,
        status text NOT NULL DEFAULT 'enabled',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    // capex_versions (reuse existing input_grain enum)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS capex_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        capex_item_id uuid NOT NULL REFERENCES capex_items(id) ON DELETE CASCADE,
        version_name text NOT NULL,
        input_grain input_grain NOT NULL DEFAULT 'annual',
        is_approved boolean NOT NULL DEFAULT false,
        as_of_date date NOT NULL,
        budget_year integer NOT NULL,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (capex_item_id, version_name)
      );
    `);

    // capex_amounts
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS capex_amounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        version_id uuid NOT NULL REFERENCES capex_versions(id) ON DELETE CASCADE,
        period date NOT NULL,
        planned numeric(18,2) DEFAULT 0,
        forecast numeric(18,2) DEFAULT 0,
        committed numeric(18,2) DEFAULT 0,
        actual numeric(18,2) DEFAULT 0,
        expected_landing numeric(18,2) DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (version_id, period)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_capex_amounts_version_period ON capex_amounts(version_id, period)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_capex_amounts_version_period`);
    await queryRunner.query(`DROP TABLE IF EXISTS capex_amounts`);
    await queryRunner.query(`DROP TABLE IF EXISTS capex_versions`);
    await queryRunner.query(`DROP TABLE IF EXISTS capex_items`);
    await queryRunner.query(`DROP TYPE IF EXISTS priority_level`);
    await queryRunner.query(`DROP TYPE IF EXISTS capex_investment_type`);
    await queryRunner.query(`DROP TYPE IF EXISTS ppe_type`);
  }
}
