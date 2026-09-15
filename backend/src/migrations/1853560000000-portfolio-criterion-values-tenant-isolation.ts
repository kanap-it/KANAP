import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bring portfolio_criterion_values under the standard tenant isolation model.
 *
 * Migration 1767200000000 dropped tenant_id from this table ("criterion has it"),
 * leaving it isolated only transitively through its FK to portfolio_criteria.
 * That breaks the project rule that every tenant-scoped table carries tenant_id
 * and a FORCE RLS policy, and it lets any query that filters by value id alone
 * see every tenant's rows.
 *
 * Steps:
 *  1. add tenant_id (nullable) and backfill it from the parent criterion.
 *     Migrations run without app.current_tenant and portfolio_criteria is under
 *     FORCE RLS, so the parent is invisible unless RLS is disabled around the
 *     backfill (same precedent as 1824000000000-audit-log-viewer-metadata-indexes).
 *  2. fail loudly if any row could not be resolved, then SET NOT NULL.
 *  3. install a BEFORE INSERT OR UPDATE trigger that fills tenant_id from the
 *     parent criterion when the caller omits it, and rejects a tenant_id that
 *     does not match the parent. The lookup runs under the caller's RLS context,
 *     so a criterion from another tenant is simply not found.
 *  4. enable + force RLS with the canonical policy.
 */
export class PortfolioCriterionValuesTenantIsolation1853560000000 implements MigrationInterface {
  name = 'PortfolioCriterionValuesTenantIsolation1853560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      ADD COLUMN IF NOT EXISTS tenant_id uuid
    `);

    // Backfill from the parent criterion. portfolio_criteria is FORCE RLS and
    // there is no tenant context in a migration: disable RLS on the parent for
    // the duration of the backfill, then restore it exactly as it was.
    await queryRunner.query(`ALTER TABLE portfolio_criteria DISABLE ROW LEVEL SECURITY`);
    try {
      await queryRunner.query(`
        UPDATE portfolio_criterion_values v
        SET tenant_id = c.tenant_id
        FROM portfolio_criteria c
        WHERE c.id = v.criterion_id
          AND v.tenant_id IS DISTINCT FROM c.tenant_id
      `);
    } finally {
      await queryRunner.query(`ALTER TABLE portfolio_criteria ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE portfolio_criteria FORCE ROW LEVEL SECURITY`);
    }

    // The FK is ON DELETE CASCADE so orphans are not expected. If any row is
    // still unresolved, stop here rather than leaving NULL tenant ids behind.
    await queryRunner.query(`
      DO $$
      DECLARE
        unresolved bigint;
      BEGIN
        SELECT count(*) INTO unresolved
        FROM portfolio_criterion_values
        WHERE tenant_id IS NULL;
        IF unresolved > 0 THEN
          RAISE EXCEPTION 'portfolio_criterion_values: % row(s) have no resolvable tenant_id', unresolved;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      ALTER COLUMN tenant_id SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_portfolio_criterion_values_tenant_criterion
      ON portfolio_criterion_values (tenant_id, criterion_id)
    `);

    // Fill tenant_id from the parent criterion and reject mismatches. Runs as
    // SECURITY INVOKER under the caller's RLS context: a criterion that belongs
    // to another tenant is not visible, so the insert fails.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION portfolio_criterion_values_set_tenant()
      RETURNS trigger AS $$
      DECLARE
        parent_tenant uuid;
      BEGIN
        SELECT tenant_id INTO parent_tenant
        FROM portfolio_criteria
        WHERE id = NEW.criterion_id;

        IF parent_tenant IS NULL THEN
          RAISE EXCEPTION 'portfolio_criterion_values: criterion % not found in the current tenant', NEW.criterion_id
            USING ERRCODE = 'foreign_key_violation';
        END IF;

        IF NEW.tenant_id IS NULL THEN
          NEW.tenant_id := parent_tenant;
        ELSIF NEW.tenant_id <> parent_tenant THEN
          RAISE EXCEPTION 'portfolio_criterion_values: tenant_id % does not match criterion tenant %', NEW.tenant_id, parent_tenant
            USING ERRCODE = 'check_violation';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS portfolio_criterion_values_set_tenant ON portfolio_criterion_values
    `);
    await queryRunner.query(`
      CREATE TRIGGER portfolio_criterion_values_set_tenant
      BEFORE INSERT OR UPDATE OF tenant_id, criterion_id ON portfolio_criterion_values
      FOR EACH ROW EXECUTE FUNCTION portfolio_criterion_values_set_tenant()
    `);

    await queryRunner.query(`ALTER TABLE portfolio_criterion_values ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_criterion_values FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DROP POLICY IF EXISTS portfolio_criterion_values_tenant_isolation ON portfolio_criterion_values
    `);
    await queryRunner.query(`
      CREATE POLICY portfolio_criterion_values_tenant_isolation ON portfolio_criterion_values
      USING (tenant_id = app_current_tenant())
      WITH CHECK (tenant_id = app_current_tenant())
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS portfolio_criterion_values_tenant_isolation ON portfolio_criterion_values
    `);
    await queryRunner.query(`ALTER TABLE portfolio_criterion_values NO FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE portfolio_criterion_values DISABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS portfolio_criterion_values_set_tenant ON portfolio_criterion_values
    `);
    await queryRunner.query(`DROP FUNCTION IF EXISTS portfolio_criterion_values_set_tenant()`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_portfolio_criterion_values_tenant_criterion`);
    await queryRunner.query(`
      ALTER TABLE portfolio_criterion_values
      DROP COLUMN IF EXISTS tenant_id
    `);
  }
}
