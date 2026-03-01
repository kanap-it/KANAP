import { MigrationInterface, QueryRunner } from 'typeorm';
import { htmlToMarkdown, isHtmlContent } from '../common/html-to-markdown';

type TableConfig = {
  table: string;
  columns: string[];
};

const TABLES: TableConfig[] = [
  { table: 'tasks', columns: ['description'] },
  { table: 'portfolio_requests', columns: ['purpose', 'current_situation', 'expected_benefits', 'risks'] },
  { table: 'portfolio_projects', columns: ['purpose'] },
  { table: 'portfolio_activities', columns: ['content'] },
];

const BATCH_SIZE = 100;

export class ConvertHtmlToMarkdown1833000000000 implements MigrationInterface {
  name = 'ConvertHtmlToMarkdown1833000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenants = await queryRunner.query(
      `SELECT id::text AS id, COALESCE(slug, '')::text AS slug
       FROM tenants
       ORDER BY slug`,
    ) as Array<{ id: string; slug: string }>;

    if (tenants.length === 0) {
      // eslint-disable-next-line no-console
      console.log('[migration:1833000000000] no tenants found, nothing to convert');
      return;
    }

    for (const table of TABLES) {
      let tableUpdated = 0;
      let tableScanned = 0;
      let tenantWithDataCount = 0;

      for (const tenant of tenants) {
        const tenantId = tenant.id;
        await queryRunner.query(`SELECT set_config('app.current_tenant', $1, false)`, [tenantId]);
        await queryRunner.query(`SELECT set_config('app.default_tenant_slug', $1, false)`, [tenant.slug || '']);

        let cursorId: string | null = null;
        let tenantScanned = 0;

        while (true) {
          const selectColumns = table.columns.map((col) => `"${col}"`).join(', ');
          const paginationClause = cursorId ? 'AND id::text > $3' : '';
          const params = cursorId
            ? [tenantId, BATCH_SIZE, cursorId]
            : [tenantId, BATCH_SIZE];
          const rows = await queryRunner.query(
            `SELECT id::text AS id, ${selectColumns}
             FROM "${table.table}"
             WHERE tenant_id = $1
               ${paginationClause}
             ORDER BY id::text ASC
             LIMIT $2`,
            params,
          ) as Array<Record<string, string | null>>;

          if (rows.length === 0) break;

          for (const row of rows) {
            tenantScanned += 1;
            tableScanned += 1;
            const updates: Array<{ column: string; value: string }> = [];

            for (const column of table.columns) {
              const rawValue = row[column];
              if (rawValue == null) continue;
              const content = String(rawValue);
              if (!content.trim()) continue;
              if (!isHtmlContent(content)) continue;

              const converted = htmlToMarkdown(content);
              if (converted !== content) {
                updates.push({ column, value: converted });
              }
            }

            if (updates.length > 0) {
              const setClauses = updates
                .map((update, idx) => `"${update.column}" = $${idx + 1}`)
                .join(', ');
              const idParam = updates.length + 1;
              const tenantParam = updates.length + 2;
              const updateParams = [
                ...updates.map((update) => update.value),
                row.id,
                tenantId,
              ];
              await queryRunner.query(
                `UPDATE "${table.table}"
                 SET ${setClauses}
                 WHERE id = $${idParam}
                   AND tenant_id = $${tenantParam}`,
                updateParams,
              );
              tableUpdated += 1;
            }
          }

          cursorId = String(rows[rows.length - 1].id);
        }

        if (tenantScanned > 0) {
          tenantWithDataCount += 1;
        }
      }

      // Keep logs in migration output for rollout verification.
      // eslint-disable-next-line no-console
      console.log(
        `[migration:1833000000000] ${table.table}: scanned=${tableScanned}, updated=${tableUpdated}, tenantsWithData=${tenantWithDataCount}`,
      );
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Irreversible by design: HTML formatting information is intentionally dropped.
  }
}
