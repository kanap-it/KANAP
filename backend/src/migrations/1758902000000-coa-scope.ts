import { MigrationInterface, QueryRunner } from 'typeorm';

export class CoaScope1758902000000 implements MigrationInterface {
  name = 'CoaScope1758902000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Add scope column (text) defaulting to 'COUNTRY'
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
        ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'COUNTRY'
    `);

    // 2) Relax NOT NULL on country_iso to allow GLOBAL rows with NULL country
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
        ALTER COLUMN country_iso DROP NOT NULL
    `);

    // 3) Backfill: rows with country_iso = 'ZZ' OR is_global_default = true → scope = 'GLOBAL', country_iso = NULL, is_default = false
    await queryRunner.query(`
      UPDATE chart_of_accounts
      SET scope = 'GLOBAL', country_iso = NULL, is_default = false
      WHERE country_iso = 'ZZ' OR is_global_default = true
    `);

    // 4) Add constraint: scope/country consistency
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'chart_of_accounts' AND c.conname = 'ck_coa_scope_country'
        ) THEN
          ALTER TABLE chart_of_accounts
            ADD CONSTRAINT ck_coa_scope_country
            CHECK (
              (scope = 'GLOBAL' AND country_iso IS NULL AND is_default = false)
              OR (scope = 'COUNTRY' AND country_iso IS NOT NULL)
            );
        END IF;
      END $$;
    `);

    // 5) Recreate per-country default uniqueness to include scope filter
    await queryRunner.query(`DROP INDEX IF EXISTS uq_coa_tenant_country_default`);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'uq_coa_tenant_country_default'
        ) THEN
          CREATE UNIQUE INDEX uq_coa_tenant_country_default
            ON chart_of_accounts(tenant_id, country_iso)
            WHERE is_default = true AND scope = 'COUNTRY';
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraint and scope column; attempt to restore NOT NULL and original index
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'chart_of_accounts' AND c.conname = 'ck_coa_scope_country'
        ) THEN
          ALTER TABLE chart_of_accounts DROP CONSTRAINT ck_coa_scope_country;
        END IF;
      END $$;
    `);
    await queryRunner.query(`ALTER TABLE chart_of_accounts DROP COLUMN IF EXISTS scope`);
    // Try to restore NOT NULL on country_iso (may fail if NULL rows exist)
    await queryRunner.query(`ALTER TABLE chart_of_accounts ALTER COLUMN country_iso SET NOT NULL`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_coa_tenant_country_default`);
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
  }
}

