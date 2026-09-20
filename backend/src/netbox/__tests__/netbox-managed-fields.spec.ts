import * as assert from 'node:assert/strict';
import { MappedAssetFields, MappedHardwareFields, managedFieldsOf } from '../netbox-mapper';
import { NetboxSyncService } from '../netbox-sync.service';

// A field is locked in the asset workspace only when Netbox provides the value
// for that object. Netbox has no domain notion, often no platform and
// sometimes no primary address: those fields stay the administrator's, and the
// synchronisation never writes an empty value over what they type.

const asset = (overrides: Partial<MappedAssetFields> = {}): MappedAssetFields => ({
  name: 'srv-01',
  kind: 'server',
  location_id: 'loc-1',
  provider: 'other',
  status: 'active',
  hostname: 'srv-01',
  domain: 'corp',
  operating_system: 'debian-12',
  ip_addresses: [{ type: 'host', ip: '10.1.2.3', subnet_cidr: null }],
  ...overrides,
});

const hardware = (overrides: Partial<MappedHardwareFields> = {}): MappedHardwareFields => ({
  serial_number: 'SN1',
  manufacturer: 'Dell',
  model: 'R640',
  rack_location: 'R12',
  rack_unit: '14',
  ...overrides,
});

// --- managedFieldsOf --------------------------------------------------------

// An object out of scope was never mapped, so it owns nothing at all.
assert.deepEqual(managedFieldsOf({ asset: null, hardware: null, subLocation: null }), []);

// Everything Netbox can give, sorted and stable.
assert.deepEqual(
  managedFieldsOf({
    asset: asset(),
    hardware: hardware(),
    subLocation: { externalId: '4', name: 'Building A', description: null, url: 'https://nb/loc/4/' },
  }),
  [
    'domain', 'hostname', 'ip_addresses', 'kind', 'location_id', 'manufacturer', 'model',
    'name', 'operating_system', 'rack_location', 'rack_unit', 'serial_number', 'status',
    'sub_location_id',
  ],
);

// No platform in Netbox: the operating system is left empty AND editable.
{
  const fields = managedFieldsOf({
    asset: asset({ operating_system: null }),
    hardware: hardware(),
    subLocation: null,
  });
  assert.equal(fields.includes('operating_system'), false);
  assert.equal(fields.includes('sub_location_id'), false);
  assert.equal(fields.includes('hostname'), true);
}

// No known DNS suffix: the domain stays editable, the host name does not.
{
  const fields = managedFieldsOf({ asset: asset({ domain: null }), hardware: hardware(), subLocation: null });
  assert.equal(fields.includes('domain'), false);
  assert.equal(fields.includes('hostname'), true);
}

// An invalid host name is not imported, and a domain without one is refused by
// the asset service, so neither is locked.
{
  const fields = managedFieldsOf({
    asset: asset({ hostname: null, domain: 'corp' }),
    hardware: hardware(),
    subLocation: null,
  });
  assert.equal(fields.includes('hostname'), false);
  assert.equal(fields.includes('domain'), false);
}

// No primary address, and a status Netbox does not map.
{
  const fields = managedFieldsOf({
    asset: asset({ ip_addresses: null, status: null }),
    hardware: hardware(),
    subLocation: null,
  });
  assert.equal(fields.includes('ip_addresses'), false);
  assert.equal(fields.includes('status'), false);
  // An empty list is no value either.
  const empty = managedFieldsOf({ asset: asset({ ip_addresses: [] }), hardware: hardware(), subLocation: null });
  assert.equal(empty.includes('ip_addresses'), false);
}

// A virtual machine carries no serial, manufacturer, model or rack.
{
  const fields = managedFieldsOf({
    asset: asset(),
    hardware: hardware({ serial_number: null, manufacturer: null, model: null, rack_location: null, rack_unit: null }),
    subLocation: null,
  });
  assert.deepEqual(fields, ['domain', 'hostname', 'ip_addresses', 'kind', 'location_id', 'name', 'operating_system', 'status']);
}

// Name, type and location make the object importable at all: always managed.
assert.deepEqual(
  managedFieldsOf({
    asset: {
      name: 'vm-7', kind: 'vm', location_id: 'loc-2', provider: 'other',
      status: null, hostname: null, domain: null, operating_system: null, ip_addresses: null,
    },
    hardware: { serial_number: null, manufacturer: null, model: null, rack_location: null, rack_unit: null },
    subLocation: null,
  }),
  ['kind', 'location_id', 'name'],
);

// --- the link row carries the list ------------------------------------------

async function main() {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const manager: any = {
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return [];
    },
  };
  const service: any = Object.create(NetboxSyncService.prototype);
  const row = {
    external_type: 'device',
    external_id: '12',
    external_name: 'srv-01',
    external_url: 'https://nb/dcim/devices/12/',
    external_status: 'active',
  };

  await service.upsertLink('tenant-1', row, {
    assetId: 'asset-1',
    state: 'linked',
    candidateAssetIds: [],
    notice: null,
    synced: true,
    managedFields: ['kind', 'location_id', 'name'],
  }, manager);

  assert.equal(queries.length, 1);
  const written = queries[0];
  assert.match(written.sql, /managed_fields = EXCLUDED\.managed_fields/);
  // Every statement stays inside its tenant.
  assert.equal(written.params[0], 'tenant-1');
  assert.match(written.sql, /tenant_id/);
  assert.deepEqual(written.params[12], ['kind', 'location_id', 'name']);

  // A record that is not linked owns nothing: the list is cleared.
  await service.upsertLink('tenant-1', row, {
    assetId: null,
    state: 'ambiguous',
    candidateAssetIds: [],
    notice: null,
    synced: false,
  }, manager);
  assert.equal(queries[1].params[12], null);
}

main().then(
  () => console.log('netbox managed fields: OK'),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
