import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes the default allocation method configurable per tenant.
 *
 * The table now holds two kinds of rows:
 * - the global standard row (`tenant_id IS NULL`), seeded as `headcount` and used as the
 *   fallback when a tenant has not configured anything for the fiscal year;
 * - per-tenant override rows (`tenant_id` set), one per fiscal year.
 *
 * RLS is enabled here (the table was previously exempt) so a tenant only ever sees the
 * global standard rows plus its own overrides.
 */
export class AllocationRulesTenantOverride1853530000000 implements MigrationInterface {
  name = 'AllocationRulesTenantOverride1853530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `UNIQUE(tenant_id, fiscal_year)` does not constrain NULL tenant_id, so the global
    // standard row could be duplicated. Collapse duplicates before adding the guard.
    await queryRunner.query(`
      DELETE FROM allocation_rules a
      USING allocation_rules b
      WHERE a.tenant_id IS NULL
        AND b.tenant_id IS NULL
        AND a.fiscal_year = b.fiscal_year
        AND (a.updated_at, a.id) < (b.updated_at, b.id)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS allocation_rules_global_year_unique
        ON allocation_rules (fiscal_year)
        WHERE tenant_id IS NULL
    `);

    // Mixed global + tenant table: the global standard row stays visible to every tenant,
    // tenant rows are only visible inside their own tenant transaction.
    //
    // Note on WITH CHECK: it deliberately accepts `tenant_id IS NULL` as well, so both the
    // seed migrations and the platform-admin path can maintain the global standard row.
    // A tenant transaction could therefore insert a global row; the API never does (it
    // always writes the calling tenant's id), so this is an accepted, bounded opening.
    await queryRunner.query(`ALTER TABLE "allocation_rules" ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "allocation_rules" FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'allocation_rules'
          AND policyname = 'allocation_rules_tenant_isolation'
      ) THEN
        EXECUTE 'CREATE POLICY allocation_rules_tenant_isolation ON allocation_rules
          USING (tenant_id IS NULL OR tenant_id = current_setting(''app.current_tenant'', true)::uuid)
          WITH CHECK (tenant_id IS NULL OR tenant_id = current_setting(''app.current_tenant'', true)::uuid)';
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP POLICY IF EXISTS allocation_rules_tenant_isolation ON allocation_rules`);
    await queryRunner.query(`ALTER TABLE "allocation_rules" NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE "allocation_rules" DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`DROP INDEX IF EXISTS allocation_rules_global_year_unique`);
  }
}
