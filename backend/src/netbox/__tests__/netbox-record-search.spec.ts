import * as assert from 'node:assert/strict';
import { NetboxSyncService, netboxRecordSearchNeedle } from '../netbox-sync.service';

// The records list is searchable, and the search must stay a search: the text
// a user types is bound as a parameter, its wildcards mean themselves, and the
// two queries of one page (count and rows) agree on what they are counting.

const TENANT = 'tenant-1';

type Call = { sql: string; params: unknown[] };

function harness() {
  const calls: Call[] = [];
  const manager: any = {
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return sql.includes('count(*)') ? [{ total: '0' }] : [];
    },
  };
  const service = new NetboxSyncService(
    null as any,
    null as any,
    null as any,
    { getSettings: async () => ({ serverKinds: [] }) } as any,
    null as any,
    null as any,
  );
  return { calls, manager, service };
}

// --- the needle ------------------------------------------------------------

function testNeedle() {
  assert.equal(netboxRecordSearchNeedle(undefined), null);
  assert.equal(netboxRecordSearchNeedle(''), null);
  assert.equal(netboxRecordSearchNeedle('   '), null);
  assert.equal(netboxRecordSearchNeedle(12), null);
  assert.equal(netboxRecordSearchNeedle('  par-esx  '), '%par-esx%');

  // `%`, `_` and `\` are escaped, so they match themselves instead of standing
  // for "anything": searching `par_` must not also return `par-esx-01`.
  assert.equal(netboxRecordSearchNeedle('par_'), '%par\\_%');
  assert.equal(netboxRecordSearchNeedle('100%'), '%100\\%%');
  assert.equal(netboxRecordSearchNeedle('a\\b'), '%a\\\\b%');

  // A very long needle is cut, not refused.
  assert.equal(netboxRecordSearchNeedle('x'.repeat(250)), `%${'x'.repeat(100)}%`);
}

// --- the queries -----------------------------------------------------------

async function testQueries() {
  {
    // No needle: neither query filters on a name, and the count stays a plain
    // count over the links table.
    const { calls, manager, service } = harness();
    await service.listRecords(manager, TENANT, { state: 'linked' });

    assert.equal(calls.length, 2);
    const [count, rows] = calls;
    assert.ok(!count.sql.includes('ILIKE'));
    assert.ok(!rows.sql.includes('ILIKE'));
    assert.ok(!count.sql.includes('LEFT JOIN assets'));
    assert.deepEqual(count.params, [TENANT, 'netbox', 'linked']);
  }

  {
    // With a needle both queries carry the same filter, on the same three
    // columns, and the count joins the assets table so it can read them.
    const { calls, manager, service } = harness();
    await service.listRecords(manager, TENANT, { state: 'linked', q: ' esx ', page: '2', limit: '25' });

    const [count, rows] = calls;
    assert.ok(count.sql.includes('LEFT JOIN assets'));
    for (const call of [count, rows]) {
      assert.ok(call.sql.includes('l.external_name ILIKE $4'));
      assert.ok(call.sql.includes('a.name ILIKE $4'));
      assert.ok(call.sql.includes('a.asset_reference ILIKE $4'));
      // Every query, and every join, stays inside the tenant.
      assert.ok(call.sql.includes('l.tenant_id = $1'));
      assert.ok(call.sql.includes('a.tenant_id = $1'));
      // The text is a parameter, never part of the statement.
      assert.ok(!call.sql.includes('esx'));
      assert.equal(call.params[3], '%esx%');
    }
    assert.deepEqual(count.params, [TENANT, 'netbox', 'linked', '%esx%']);
    // The page query adds only its own bounds after the shared filters.
    assert.deepEqual(rows.params, [TENANT, 'netbox', 'linked', '%esx%', 25, 25]);
  }

  {
    // A needle without a state filter shifts to the next free placeholder
    // instead of leaving a hole.
    const { calls, manager, service } = harness();
    await service.listRecords(manager, TENANT, { q: 'AST-9' });

    const [count, rows] = calls;
    assert.ok(count.sql.includes('l.external_name ILIKE $3'));
    assert.ok(rows.sql.includes('a.asset_reference ILIKE $3'));
    assert.deepEqual(count.params, [TENANT, 'netbox', '%AST-9%']);
    assert.deepEqual(rows.params, [TENANT, 'netbox', '%AST-9%', 50, 0]);
  }
}

// --- the asset type --------------------------------------------------------

async function testKindLabel() {
  {
    // The asset type shown in the list is the tenant's label, read once for
    // the whole page; a code the catalog does not hold falls back to itself.
    const { manager, service } = harness();
    let settingsReads = 0;
    manager.query = async (sql: string) => (
      sql.includes('count(*)')
        ? [{ total: '2' }]
        : [
          {
            id: 'rec-1', external_type: 'device', external_id: '11', external_name: 'par-sw-01',
            external_url: 'https://netbox.test/1/', state: 'linked', candidate_asset_ids: [],
            asset_id: 'asset-1', asset_name: 'PAR-SW-01', asset_reference: 'AST-4',
            asset_status: 'active', asset_kind: 'network_switch',
          },
          {
            id: 'rec-2', external_type: 'device', external_id: '12', external_name: 'par-pdu-01',
            external_url: 'https://netbox.test/2/', state: 'linked', candidate_asset_ids: [],
            asset_id: 'asset-2', asset_name: 'PAR-PDU-01', asset_reference: 'AST-5',
            asset_status: 'active', asset_kind: 'pdu',
          },
        ]
    );
    (service as any).itOpsSettings = {
      getSettings: async () => {
        settingsReads += 1;
        return { serverKinds: [{ code: 'network_switch', label: 'Network switch' }] };
      },
    };

    const result = await service.listRecords(manager, TENANT, { state: 'linked' });
    assert.equal(result.items[0].asset?.kind_label, 'Network switch');
    assert.equal(result.items[1].asset?.kind_label, 'pdu');
    assert.equal(settingsReads, 1);
  }

  {
    // No linked asset on the page: the catalog is not read at all.
    const { manager, service } = harness();
    let settingsReads = 0;
    (service as any).itOpsSettings = {
      getSettings: async () => { settingsReads += 1; return { serverKinds: [] }; },
    };
    manager.query = async (sql: string) => (
      sql.includes('count(*)')
        ? [{ total: '1' }]
        : [{
          id: 'rec-3', external_type: 'vm', external_id: '9', external_name: 'vm-01',
          external_url: 'https://netbox.test/9/', state: 'ambiguous', candidate_asset_ids: [],
          asset_id: null, asset_kind: null,
        }]
    );

    const result = await service.listRecords(manager, TENANT, { state: 'ambiguous' });
    assert.equal(result.items[0].asset, null);
    assert.equal(settingsReads, 0);
  }
}

async function main() {
  testNeedle();
  await testQueries();
  await testKindLabel();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
