import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['spend_items', 'capex_items'] as const;

/**
 * One end date per budget item: `effective_end` merges into `disabled_at`
 * (shown as "End of validity"), on OPEX and CAPEX items.
 *
 * - `effective_end` is renamed `legacy_effective_end` and kept for the
 *   rollback window; a later migration drops it after a production release.
 * - An item without a `disabled_at` gets its `effective_end` at 12:00 UTC:
 *   the last service day stays inclusive, the calendar day reads the same in
 *   every European time zone and the year (which the budget summary masks on)
 *   is preserved. An item that already has a `disabled_at` keeps it; the
 *   preflight script (`npm run preflight:end-date-merge`) lists those rows.
 * - Stored `status` is reconciled with the date, like `resolveLifecycleState`.
 *
 * RLS is disabled on both tables around the data changes (restored to
 * ENABLE + FORCE, the state found before). The UPDATEs still run per tenant
 * with a transaction-local `app.current_tenant`: the search_index sync
 * trigger fires on UPDATE and writes into `search_index` (FORCE RLS), which
 * would refuse the row without a tenant context. `updated_at` is not touched.
 */
export class SingleItemEndDate1853620000000 implements MigrationInterface {
  name = 'SingleItemEndDate1853620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE ${table} RENAME COLUMN effective_end TO legacy_effective_end`);
    }
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }
    await queryRunner.query(`
      DO $do$
      DECLARE
        t RECORD;
      BEGIN
        FOR t IN SELECT id FROM tenants ORDER BY created_at ASC, id ASC LOOP
          PERFORM set_config('app.current_tenant', t.id::text, true);

          UPDATE spend_items
          SET disabled_at = (legacy_effective_end + time '12:00') AT TIME ZONE 'UTC'
          WHERE tenant_id = t.id AND disabled_at IS NULL AND legacy_effective_end IS NOT NULL;
          UPDATE capex_items
          SET disabled_at = (legacy_effective_end + time '12:00') AT TIME ZONE 'UTC'
          WHERE tenant_id = t.id AND disabled_at IS NULL AND legacy_effective_end IS NOT NULL;

          UPDATE spend_items SET status = 'disabled'
          WHERE tenant_id = t.id AND disabled_at IS NOT NULL AND disabled_at <= now() AND status <> 'disabled';
          UPDATE capex_items SET status = 'disabled'
          WHERE tenant_id = t.id AND disabled_at IS NOT NULL AND disabled_at <= now() AND status <> 'disabled';
        END LOOP;
      END
      $do$
    `);
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only the rows up() set are reverted: an end of validity a user edited
    // since then no longer matches the formula and is left as it is, like a
    // conflict up() kept (the preflight script, run once migrated, lists both
    // as "not reverted by down()"). The status reconciliation of rows whose
    // disabled_at was already past is not undone: it matched their date.
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY`);
    }
    await queryRunner.query(`
      DO $do$
      DECLARE
        t RECORD;
      BEGIN
        FOR t IN SELECT id FROM tenants ORDER BY created_at ASC, id ASC LOOP
          PERFORM set_config('app.current_tenant', t.id::text, true);
          UPDATE spend_items SET disabled_at = NULL, status = 'enabled'
          WHERE tenant_id = t.id AND legacy_effective_end IS NOT NULL
            AND disabled_at = (legacy_effective_end + time '12:00') AT TIME ZONE 'UTC';
          UPDATE capex_items SET disabled_at = NULL, status = 'enabled'
          WHERE tenant_id = t.id AND legacy_effective_end IS NOT NULL
            AND disabled_at = (legacy_effective_end + time '12:00') AT TIME ZONE 'UTC';
        END LOOP;
      END
      $do$
    `);
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    }
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE ${table} RENAME COLUMN legacy_effective_end TO effective_end`);
    }
  }
}
