import { MigrationInterface, QueryRunner } from 'typeorm';

export class CoaGlobalDefaults1758900000000 implements MigrationInterface {
  name = 'CoaGlobalDefaults1758900000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Extend coa_templates to allow global templates and default loading
    await queryRunner.query(`
      ALTER TABLE coa_templates
        ALTER COLUMN country_iso DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE coa_templates
        ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS loaded_by_default boolean NOT NULL DEFAULT false
    `);
    // Drop legacy unique constraint if present
    await queryRunner.query(`DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'coa_templates' AND c.conname = 'uq_coa_templates_key'
      ) THEN
        ALTER TABLE coa_templates DROP CONSTRAINT uq_coa_templates_key;
      END IF;
    END $$;`);
    // Unique per country (non-global)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'uq_coa_templates_country_key'
        ) THEN
          CREATE UNIQUE INDEX uq_coa_templates_country_key
            ON coa_templates(country_iso, template_code, version)
            WHERE is_global = false;
        END IF;
      END $$;
    `);
    // Unique for global templates by (code, version)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'uq_coa_templates_global_key'
        ) THEN
          CREATE UNIQUE INDEX uq_coa_templates_global_key
            ON coa_templates(template_code, version)
            WHERE is_global = true;
        END IF;
      END $$;
    `);
    // Ensure only one global template can be marked loaded_by_default at a time
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'uq_single_loaded_global_template'
        ) THEN
          CREATE UNIQUE INDEX uq_single_loaded_global_template
            ON coa_templates((true))
            WHERE is_global = true AND loaded_by_default = true;
        END IF;
      END $$;
    `);

    // chart_of_accounts: add is_global_default and unique per tenant
    await queryRunner.query(`
      ALTER TABLE chart_of_accounts
        ADD COLUMN IF NOT EXISTS is_global_default boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public' AND indexname = 'uq_coa_tenant_global_default'
        ) THEN
          CREATE UNIQUE INDEX uq_coa_tenant_global_default
            ON chart_of_accounts(tenant_id)
            WHERE is_global_default = true;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // chart_of_accounts: drop unique index and column
    await queryRunner.query(`DROP INDEX IF EXISTS uq_coa_tenant_global_default`);
    await queryRunner.query(`ALTER TABLE chart_of_accounts DROP COLUMN IF EXISTS is_global_default`);

    // coa_templates: drop new indexes and columns; restore NOT NULL on country_iso
    await queryRunner.query(`DROP INDEX IF EXISTS uq_single_loaded_global_template`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_coa_templates_global_key`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_coa_templates_country_key`);
    await queryRunner.query(`ALTER TABLE coa_templates DROP COLUMN IF EXISTS loaded_by_default`);
    await queryRunner.query(`ALTER TABLE coa_templates DROP COLUMN IF EXISTS is_global`);
    // Attempt to restore NOT NULL (may fail if any NULL rows exist)
    await queryRunner.query(`ALTER TABLE coa_templates ALTER COLUMN country_iso SET NOT NULL`);
    // Attempt to recreate the original unique key (country scoped)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'coa_templates' AND c.conname = 'uq_coa_templates_key'
        ) THEN
          ALTER TABLE coa_templates ADD CONSTRAINT uq_coa_templates_key UNIQUE (country_iso, template_code, version);
        END IF;
      END $$;
    `);
  }
}

