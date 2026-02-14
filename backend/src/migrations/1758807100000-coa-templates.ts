import { MigrationInterface, QueryRunner } from "typeorm";

export class CoaTemplates1758807100000 implements MigrationInterface {
  name = 'CoaTemplates1758807100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coa_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        country_iso char(2) NOT NULL,
        template_code text NOT NULL,
        template_name text NOT NULL,
        version text NOT NULL,
        csv_payload text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_coa_templates_country ON coa_templates(country_iso)`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'coa_templates' AND c.conname = 'uq_coa_templates_key'
      ) THEN
        ALTER TABLE coa_templates ADD CONSTRAINT uq_coa_templates_key UNIQUE (country_iso, template_code, version);
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE coa_templates DROP CONSTRAINT IF EXISTS uq_coa_templates_key`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_coa_templates_country`);
    await queryRunner.query(`DROP TABLE IF EXISTS coa_templates`);
  }
}

