import { MigrationInterface, QueryRunner } from 'typeorm';

const DEFAULT_EMPLOYMENT_TYPES = [
  { name: 'Internal', display_order: 0 },
  { name: 'External', display_order: 1 },
  { name: 'Apprentice', display_order: 2 },
  { name: 'Other', display_order: 3 },
];

/**
 * Adds the two contributor attributes the reporting line and the org chart need:
 * a manager (stored as a user reference so an Entra manager resolves before the
 * person is a contributor) and a contract type (employment type in the code),
 * backed by a new tenant-scoped lookup table modelled on portfolio_teams.
 *
 * All three columns on portfolio_team_member_configs stay NULLABLE: the raw SQL
 * fixtures in ai-phase1.integration.spec.ts insert an explicit column list and a
 * NOT NULL column without a default would break them.
 */
export class ContributorManagerEmploymentType1853520000000 implements MigrationInterface {
  name = 'ContributorManagerEmploymentType1853520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS portfolio_employment_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        display_order int NOT NULL DEFAULT 0,
        is_system boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (tenant_id, name)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_employment_types_tenant_order
      ON portfolio_employment_types(tenant_id, display_order)
    `);

    // Seeded (and, below, joined by the backfill) before the policy goes on:
    // FORCE ROW LEVEL SECURITY applies to the table owner too, and a migration
    // has no `app.current_tenant` to read or write under. New tenants get
    // their defaults from TenantsService instead.
    const tenants = await queryRunner.query(`SELECT id FROM tenants`);
    for (const { id } of tenants) {
      for (const type of DEFAULT_EMPLOYMENT_TYPES) {
        await queryRunner.query(`
          INSERT INTO portfolio_employment_types (tenant_id, name, display_order, is_system)
          VALUES ($1, $2, $3, true)
          ON CONFLICT (tenant_id, name) DO NOTHING
        `, [id, type.name, type.display_order]);
      }
    }

    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS manager_user_id uuid REFERENCES users(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS manager_source text
    `);
    await queryRunner.query(`
      ALTER TABLE portfolio_team_member_configs
      ADD COLUMN IF NOT EXISTS employment_type_id uuid REFERENCES portfolio_employment_types(id) ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_team_member_configs_manager
      ON portfolio_team_member_configs(tenant_id, manager_user_id)
    `);

    // Every existing contributor starts on the default type, the same one the
    // service gives new contributors. The column stays nullable for the raw
    // fixtures; RLS is lifted for the backfill exactly as 1853510000000 does.
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      UPDATE portfolio_team_member_configs tmc
      SET employment_type_id = et.id
      FROM portfolio_employment_types et
      WHERE et.tenant_id = tmc.tenant_id
        AND et.name = 'Internal'
        AND et.is_system = true
        AND tmc.employment_type_id IS NULL
    `);
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs FORCE ROW LEVEL SECURITY`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM portfolio_team_member_configs WHERE employment_type_id IS NULL
        ) THEN
          RAISE EXCEPTION 'contract type backfill left contributors without a type';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`ALTER TABLE portfolio_employment_types ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_employment_types FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY portfolio_employment_types_tenant_isolation
      ON portfolio_employment_types
      USING (tenant_id = app_current_tenant()::uuid)
      WITH CHECK (tenant_id = app_current_tenant()::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_team_member_configs_manager`);
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs DROP COLUMN IF EXISTS employment_type_id`);
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs DROP COLUMN IF EXISTS manager_source`);
    await queryRunner.query(`ALTER TABLE portfolio_team_member_configs DROP COLUMN IF EXISTS manager_user_id`);

    await queryRunner.query(`DROP POLICY IF EXISTS portfolio_employment_types_tenant_isolation ON portfolio_employment_types`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_employment_types_tenant_order`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_employment_types`);
  }
}
