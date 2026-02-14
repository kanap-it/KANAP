import { MigrationInterface, QueryRunner } from 'typeorm';

// Enforce uniqueness of department name within a company (per tenant), case-insensitive
export class UniqueDeptCompanyName1758805200000 implements MigrationInterface {
  name = 'UniqueDeptCompanyName1758805200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create a unique index on (tenant_id, company_id, lower(name))
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_departments_tenant_company_name_ci'
        ) THEN
          CREATE UNIQUE INDEX uniq_departments_tenant_company_name_ci
          ON departments(tenant_id, company_id, lower(name));
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uniq_departments_tenant_company_name_ci'
        ) THEN
          DROP INDEX uniq_departments_tenant_company_name_ci;
        END IF;
      END$$;
    `);
  }
}

