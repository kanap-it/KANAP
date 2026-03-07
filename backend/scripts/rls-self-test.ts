/*
 RLS Self-Test Script
 - Connects to DATABASE_URL
 - Creates two temporary tenants (within a transaction) and inserts sample rows under tenant A
 - Verifies cross-tenant reads are blocked and cross-tenant writes fail for key tables
 - Prints a summary and exits non-zero on failure
*/
import 'dotenv/config';
import { DataSource, QueryRunner } from 'typeorm';

type TestResult = { name: string; ok: boolean; info?: string };

const TABLES_TO_CHECK_RLS = [
  'users','companies','departments','suppliers','accounts',
  'spend_items','spend_versions','spend_amounts','spend_allocations','spend_tasks',
  'contracts','contract_tasks','contract_spend_items','contract_attachments','contract_links',
  'capex_items','capex_versions','capex_amounts',
  // Unified tasks table and currency rate snapshots
  'tasks','currency_rate_sets','item_sequences',
  // Knowledge
  'document_libraries','document_folders','document_types','documents','document_versions',
  'document_edit_locks','document_attachments','document_activities','document_contributors',
  'document_classifications','document_references','document_applications','document_assets',
  'document_projects','document_requests','document_tasks',
  'integrated_document_bindings','integrated_document_slot_settings',
  'roles','role_permissions','subscriptions',
  'audit_log','company_metrics','department_metrics','user_page_roles',
];

async function setTenant(r: QueryRunner, tenantId: string) {
  await r.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
}

async function hasRls(r: QueryRunner, table: string): Promise<boolean> {
  const rows = await r.query(
    `SELECT c.relrowsecurity AS rls
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = $1`,
    [table],
  );
  return !!rows?.[0]?.rls;
}

function randTag() { return Math.random().toString(36).slice(2, 8); }

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(2);
  }
  const ds = new DataSource({ type: 'postgres', url, ssl: false } as any);
  await ds.initialize();
  const r = ds.createQueryRunner();
  await r.connect();
  await r.startTransaction();
  const results: TestResult[] = [];
  try {
    // Create two tenants (temporary, transaction will roll back)
    const tag = `rls_${Date.now()}_${randTag()}`;
    const t1 = await r.query(`INSERT INTO tenants(slug, name) VALUES ($1, $2) RETURNING id`, [`${tag}_a`, `${tag} A`]);
    const t2 = await r.query(`INSERT INTO tenants(slug, name) VALUES ($1, $2) RETURNING id`, [`${tag}_b`, `${tag} B`]);
    const t1Id = t1[0].id as string; const t2Id = t2[0].id as string;

    // Check RLS enabled on key tables
    for (const t of TABLES_TO_CHECK_RLS) {
      const ok = await hasRls(r, t);
      results.push({ name: `RLS enabled: ${t}`, ok });
    }

    // Companies cross-tenant tests
    await setTenant(r, t1Id);
    const cIns = await r.query(
      `INSERT INTO companies(name, country_iso, city, status) VALUES ($1, $2, $3, 'enabled') RETURNING id`,
      [`TestCo ${tag}`, 'US', 'New York'],
    );
    const compId = cIns[0].id as string;
    const cSelf = await r.query(`SELECT 1 FROM companies WHERE id=$1`, [compId]);
    results.push({ name: 'companies: self-tenant read', ok: cSelf.length === 1 });
    await setTenant(r, t2Id);
    const cCross = await r.query(`SELECT 1 FROM companies WHERE id=$1`, [compId]);
    results.push({ name: 'companies: cross-tenant read blocked', ok: cCross.length === 0 });
    let cCrossWriteBlocked = false;
    await r.query('SAVEPOINT rls_company_cross_write');
    try {
      await r.query(
        `INSERT INTO companies(tenant_id, name, country_iso, city, status) VALUES ($1, $2, $3, $4, 'enabled')`,
        [t1Id, `X ${tag}`, 'US', 'Boston'],
      );
    } catch {
      cCrossWriteBlocked = true;
    } finally {
      await r.query('ROLLBACK TO SAVEPOINT rls_company_cross_write');
    }
    results.push({ name: 'companies: cross-tenant insert blocked', ok: cCrossWriteBlocked });

    // Spend items
    await setTenant(r, t1Id);
    const sIns = await r.query(`INSERT INTO spend_items(product_name, currency, effective_start, status) VALUES ($1,'EUR', '2025-01-01','enabled') RETURNING id`, [`S ${tag}`]);
    const sId = sIns[0].id as string;
    await setTenant(r, t2Id);
    const sCross = await r.query(`SELECT 1 FROM spend_items WHERE id=$1`, [sId]);
    results.push({ name: 'spend_items: cross-tenant read blocked', ok: sCross.length === 0 });

    // Contracts
    await setTenant(r, t1Id);
    // Need a supplier and company to satisfy FKs
    const sup = await r.query(`INSERT INTO suppliers(name, status) VALUES ($1,'enabled') RETURNING id`, [`SUP ${tag}`]);
    const comp = await r.query(
      `INSERT INTO companies(name, country_iso, city, status) VALUES ($1, $2, $3, 'enabled') RETURNING id`,
      [`CO2 ${tag}`, 'US', 'Chicago'],
    );
    const con = await r.query(`INSERT INTO contracts(name, company_id, supplier_id, start_date) VALUES ($1,$2,$3,'2025-01-01') RETURNING id`, [`CON ${tag}`, comp[0].id, sup[0].id]);
    const conId = con[0].id as string;
    await setTenant(r, t2Id);
    const conCross = await r.query(`SELECT 1 FROM contracts WHERE id=$1`, [conId]);
    results.push({ name: 'contracts: cross-tenant read blocked', ok: conCross.length === 0 });

    // RBAC: roles cross-tenant isolation
    await setTenant(r, t1Id);
    const role = await r.query(`INSERT INTO roles(role_name, role_description) VALUES ($1,$2) RETURNING id`, [`RLS_${tag}`, 'Test role']);
    const roleId = role[0].id as string;
    await setTenant(r, t2Id);
    const roleCross = await r.query(`SELECT 1 FROM roles WHERE id=$1`, [roleId]);
    results.push({ name: 'roles: cross-tenant read blocked', ok: roleCross.length === 0 });

    // CAPEX
    await setTenant(r, t1Id);
    const capex = await r.query(`INSERT INTO capex_items(description, ppe_type, investment_type, priority, currency, effective_start, status) VALUES ($1,'hardware','replacement','medium','EUR','2025-01-01','enabled') RETURNING id`, [`CAPEX ${tag}`]);
    const capexId = capex[0].id as string;
    await setTenant(r, t2Id);
    const capexCross = await r.query(`SELECT 1 FROM capex_items WHERE id=$1`, [capexId]);
    results.push({ name: 'capex_items: cross-tenant read blocked', ok: capexCross.length === 0 });

    // Knowledge
    await setTenant(r, t1Id);
    const library = await r.query(
      `INSERT INTO document_libraries(name, slug, is_system, display_order)
       VALUES ($1, $2, false, 0)
       RETURNING id`,
      [`Knowledge ${tag}`, `knowledge-${tag}`],
    );
    const libraryId = library[0].id as string;
    const doc = await r.query(
      `INSERT INTO documents(item_number, title, content_markdown, content_plain, library_id)
       VALUES (999001, $1, 'Body', 'Body', $2)
       RETURNING id`,
      [`DOC ${tag}`, libraryId],
    );
    const docId = doc[0].id as string;
    await r.query(
      `INSERT INTO item_sequences(tenant_id, entity_type, next_val)
       VALUES ($1, 'document', 42)
       ON CONFLICT (tenant_id, entity_type)
       DO UPDATE SET next_val = EXCLUDED.next_val`,
      [t1Id],
    );

    await setTenant(r, t2Id);
    const libraryCross = await r.query(`SELECT 1 FROM document_libraries WHERE id=$1`, [libraryId]);
    results.push({ name: 'document_libraries: cross-tenant read blocked', ok: libraryCross.length === 0 });
    const docCross = await r.query(`SELECT 1 FROM documents WHERE id=$1`, [docId]);
    results.push({ name: 'documents: cross-tenant read blocked', ok: docCross.length === 0 });
    const sequenceCross = await r.query(
      `SELECT 1 FROM item_sequences WHERE tenant_id=$1 AND entity_type='document'`,
      [t1Id],
    );
    results.push({ name: 'item_sequences(document): cross-tenant read blocked', ok: sequenceCross.length === 0 });
    let libraryCrossWriteBlocked = false;
    await r.query('SAVEPOINT rls_document_library_cross_write');
    try {
      await r.query(
        `INSERT INTO document_libraries(tenant_id, name, slug, is_system, display_order)
         VALUES ($1, $2, $3, false, 1)`,
        [t1Id, `Cross ${tag}`, `cross-${tag}`],
      );
    } catch {
      libraryCrossWriteBlocked = true;
    } finally {
      await r.query('ROLLBACK TO SAVEPOINT rls_document_library_cross_write');
    }
    results.push({ name: 'document_libraries: cross-tenant insert blocked', ok: libraryCrossWriteBlocked });

    // Audit write should succeed via request manager; here we just check table has RLS enabled already.

    // Summary
    const failed = results.filter((r) => !r.ok);
    for (const r0 of results) {
      console.log(`${r0.ok ? 'PASS' : 'FAIL'} - ${r0.name}${r0.info ? ` (${r0.info})` : ''}`);
    }
    if (failed.length > 0) {
      throw new Error(`${failed.length} RLS checks failed.`);
    }

    await r.rollbackTransaction(); // rollback test data
  } catch (e) {
    try { await r.rollbackTransaction(); } catch {}
    console.error('RLS self-test failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    try { await r.release(); } catch {}
    try { await ds.destroy(); } catch {}
  }
}

main();
