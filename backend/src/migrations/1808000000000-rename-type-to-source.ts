import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename portfolio "type" to "source" throughout:
 * - Rename table portfolio_types → portfolio_sources
 * - Rename column type_id → source_id in portfolio_requests and portfolio_projects
 */
export class RenameTypeToSource1808000000000 implements MigrationInterface {
  name = 'RenameTypeToSource1808000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename the portfolio_types table to portfolio_sources
    await queryRunner.query(`ALTER TABLE portfolio_types RENAME TO portfolio_sources`);

    // 2. Rename the unique index on portfolio_sources (tenant_id, name)
    await queryRunner.query(`
      ALTER INDEX IF EXISTS "IDX_portfolio_types_tenant_id_name"
      RENAME TO "IDX_portfolio_sources_tenant_id_name"
    `);

    // 3. Rename the display_order index on portfolio_sources
    await queryRunner.query(`
      ALTER INDEX IF EXISTS "IDX_portfolio_types_tenant_id_display_order"
      RENAME TO "IDX_portfolio_sources_tenant_id_display_order"
    `);

    // 4. Rename type_id → source_id in portfolio_requests
    await queryRunner.query(`
      ALTER TABLE portfolio_requests RENAME COLUMN type_id TO source_id
    `);

    // 5. Rename type_id → source_id in portfolio_projects
    await queryRunner.query(`
      ALTER TABLE portfolio_projects RENAME COLUMN type_id TO source_id
    `);

    // 6. Update RLS policy if it exists (portfolio_sources)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_types_tenant_isolation') THEN
          ALTER POLICY portfolio_types_tenant_isolation ON portfolio_sources
          RENAME TO portfolio_sources_tenant_isolation;
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse all changes

    // 1. Rename RLS policy back
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'portfolio_sources_tenant_isolation') THEN
          ALTER POLICY portfolio_sources_tenant_isolation ON portfolio_types
          RENAME TO portfolio_types_tenant_isolation;
        END IF;
      END$$;
    `);

    // 2. Rename source_id → type_id in portfolio_projects
    await queryRunner.query(`
      ALTER TABLE portfolio_projects RENAME COLUMN source_id TO type_id
    `);

    // 3. Rename source_id → type_id in portfolio_requests
    await queryRunner.query(`
      ALTER TABLE portfolio_requests RENAME COLUMN source_id TO type_id
    `);

    // 4. Rename display_order index back
    await queryRunner.query(`
      ALTER INDEX IF EXISTS "IDX_portfolio_sources_tenant_id_display_order"
      RENAME TO "IDX_portfolio_types_tenant_id_display_order"
    `);

    // 5. Rename unique index back
    await queryRunner.query(`
      ALTER INDEX IF EXISTS "IDX_portfolio_sources_tenant_id_name"
      RENAME TO "IDX_portfolio_types_tenant_id_name"
    `);

    // 6. Rename table back to portfolio_types
    await queryRunner.query(`ALTER TABLE portfolio_sources RENAME TO portfolio_types`);
  }
}
