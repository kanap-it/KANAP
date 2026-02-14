import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix portfolio criteria tables schema to match entity definitions.
 * The original migration used different column names than the entities.
 */
export class PortfolioCriteriaSchemaFix1767200000000 implements MigrationInterface {
  name = 'PortfolioCriteriaSchemaFix1767200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix portfolio_criteria table
    // Rename sort_order -> display_order
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      RENAME COLUMN sort_order TO display_order
    `);

    // Add enabled column (boolean), remove status column
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      ADD COLUMN enabled boolean NOT NULL DEFAULT true
    `);

    // Migrate status values to enabled
    await queryRunner.query(`
      UPDATE portfolio_criteria
      SET enabled = (status = 'enabled')
    `);

    // Drop status column
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      DROP COLUMN status
    `);

    // Add inverted column
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      ADD COLUMN inverted boolean NOT NULL DEFAULT false
    `);

    // Drop is_mandatory column (not used in new schema)
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      DROP COLUMN is_mandatory
    `);

    // Drop description column (not in entity)
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      DROP COLUMN IF EXISTS description
    `);

    // Fix portfolio_criterion_values table
    // Rename sort_order -> position
    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      RENAME COLUMN sort_order TO position
    `);

    // Add triggers_mandatory_bypass column
    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      ADD COLUMN triggers_mandatory_bypass boolean NOT NULL DEFAULT false
    `);

    // Drop numeric_value column (not used in new scoring model)
    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      DROP COLUMN numeric_value
    `);

    // Drop the RLS policy on values table BEFORE dropping tenant_id
    await queryRunner.query(`
      DROP POLICY IF EXISTS portfolio_criterion_values_tenant_isolation
      ON portfolio_criterion_values
    `);

    // Disable RLS on values table
    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values DISABLE ROW LEVEL SECURITY
    `);

    // Drop tenant_id from values table (not needed, criterion has it)
    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      DROP COLUMN IF EXISTS tenant_id
    `);

    // Add unique constraint on criteria name per tenant
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      ADD CONSTRAINT portfolio_criteria_tenant_name_unique UNIQUE (tenant_id, name)
    `);

    // Add updated_at to values table
    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse changes to portfolio_criterion_values
    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      DROP COLUMN IF EXISTS updated_at
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      ADD COLUMN IF NOT EXISTS tenant_id uuid
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values ENABLE ROW LEVEL SECURITY
    `);

    await queryRunner.query(`
      CREATE POLICY portfolio_criterion_values_tenant_isolation
      ON portfolio_criterion_values
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      ADD COLUMN numeric_value numeric(5,2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      DROP COLUMN triggers_mandatory_bypass
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      RENAME COLUMN position TO sort_order
    `);

    // Reverse changes to portfolio_criteria
    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      DROP CONSTRAINT IF EXISTS portfolio_criteria_tenant_name_unique
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      ADD COLUMN description text
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      ADD COLUMN is_mandatory boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      DROP COLUMN inverted
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      ADD COLUMN status text NOT NULL DEFAULT 'enabled'
    `);

    await queryRunner.query(`
      UPDATE portfolio_criteria
      SET status = CASE WHEN enabled THEN 'enabled' ELSE 'disabled' END
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      DROP COLUMN enabled
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criteria
      RENAME COLUMN display_order TO sort_order
    `);
  }
}
