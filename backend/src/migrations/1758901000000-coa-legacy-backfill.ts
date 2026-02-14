import { MigrationInterface, QueryRunner } from "typeorm";

export class CoaLegacyBackfill1758901000000 implements MigrationInterface {
  name = 'CoaLegacyBackfill1758901000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Iterate tenants to create a Legacy CoA when standalone accounts exist, attach accounts to it,
    // and backfill companies.coa_id to country default or global default where possible.
    const tenants: Array<{ id: string }> = await queryRunner.query(`SELECT id FROM tenants`);

    for (const t of tenants) {
      // Switch RLS tenant context
      await queryRunner.query(`SELECT set_config('app.current_tenant', $1, true)`, [t.id]);

      // Count standalone accounts (coa_id IS NULL)
      const countRows: Array<{ count: number }> = await queryRunner.query(
        `SELECT COUNT(*)::int AS count FROM accounts WHERE coa_id IS NULL`
      );
      const standaloneCount = Number(countRows?.[0]?.count ?? 0);

      let legacyCoaId: string | null = null;
      if (standaloneCount > 0) {
        // Determine most common country among companies in this tenant (fallback 'ZZ')
        const topCountryRows: Array<{ country_iso: string | null; count: number }> = await queryRunner.query(
          `SELECT country_iso, COUNT(*)::int AS count
           FROM companies
           GROUP BY country_iso
           ORDER BY COUNT(*) DESC NULLS LAST
           LIMIT 1`
        );
        const countryIso = (topCountryRows?.[0]?.country_iso || 'ZZ').toString().substring(0, 2).toUpperCase();

        // Create a unique Legacy CoA code within the tenant: LEGACY, LEGACY-2, ...
        const baseCode = 'LEGACY';
        const name = 'Legacy';
        let codeToTry = baseCode;
        for (let attempt = 0; attempt < 20; attempt += 1) {
          try {
            const rows: Array<{ id: string }> = await queryRunner.query(
              `INSERT INTO chart_of_accounts(code, name, country_iso, is_default, is_global_default)
               VALUES ($1, $2, $3, false, false)
               RETURNING id`,
              [codeToTry, name, countryIso],
            );
            legacyCoaId = rows?.[0]?.id ?? null;
            break;
          } catch (e: any) {
            // Unique violation on (tenant_id, code)
            if (e?.code === '23505') {
              codeToTry = `${baseCode}-${attempt + 2}`;
              continue;
            }
            throw e;
          }
        }

        if (!legacyCoaId) {
          // As a last resort, try to find an existing LEGACY code (created concurrently)
          const found: Array<{ id: string }> = await queryRunner.query(
            `SELECT id FROM chart_of_accounts WHERE code LIKE 'LEGACY%' ORDER BY created_at ASC LIMIT 1`
          );
          legacyCoaId = found?.[0]?.id ?? null;
        }

        if (!legacyCoaId) {
          throw new Error('Failed to create or resolve Legacy CoA for tenant ' + t.id);
        }

        // Attach all standalone accounts to the Legacy CoA
        await queryRunner.query(`UPDATE accounts SET coa_id = $1 WHERE coa_id IS NULL`, [legacyCoaId]);
      }

      // Backfill companies.coa_id → prefer country default, else global default (correlated subselects; no LATERAL)
      await queryRunner.query(`
        UPDATE companies c
        SET coa_id = COALESCE(
          (SELECT id FROM chart_of_accounts co WHERE co.tenant_id = c.tenant_id AND co.country_iso = c.country_iso AND co.is_default = true LIMIT 1),
          (SELECT id FROM chart_of_accounts co WHERE co.tenant_id = c.tenant_id AND co.is_global_default = true LIMIT 1)
        )
        WHERE c.coa_id IS NULL
          AND (
            (SELECT id FROM chart_of_accounts co WHERE co.tenant_id = c.tenant_id AND co.country_iso = c.country_iso AND co.is_default = true LIMIT 1) IS NOT NULL
            OR (SELECT id FROM chart_of_accounts co WHERE co.tenant_id = c.tenant_id AND co.is_global_default = true LIMIT 1) IS NOT NULL
          )
      `);
    }

    // Enforce NOT NULL on accounts.coa_id now that backfill is done
    await queryRunner.query(`ALTER TABLE accounts ALTER COLUMN coa_id SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Relax NOT NULL; do not attempt to detach accounts or drop created CoAs.
    await queryRunner.query(`ALTER TABLE accounts ALTER COLUMN coa_id DROP NOT NULL`);
  }
}
