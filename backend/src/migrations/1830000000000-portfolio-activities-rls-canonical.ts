import { MigrationInterface, QueryRunner } from 'typeorm';

export class PortfolioActivitiesRlsCanonical1830000000000 implements MigrationInterface {
  name = 'PortfolioActivitiesRlsCanonical1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = 'portfolio_activities';

    await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);

    // Keep the table with a single canonical tenant policy.
    await queryRunner.query(`
      DO $$
      DECLARE p record;
      BEGIN
        FOR p IN
          SELECT policyname
          FROM pg_policies
          WHERE schemaname = 'public' AND tablename = '${table}'
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON ${table}', p.policyname);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`
      CREATE POLICY ${table}_tenant_isolation ON ${table}
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = 'portfolio_activities';

    await queryRunner.query(`DROP POLICY IF EXISTS ${table}_tenant_isolation ON ${table}`);
    await queryRunner.query(`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
  }
}

