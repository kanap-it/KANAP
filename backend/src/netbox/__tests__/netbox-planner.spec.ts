import * as assert from 'node:assert/strict';
import {
  NETBOX_VIRTUAL_MACHINES_NAME,
  NETBOX_VIRTUAL_MACHINES_SLUG,
  NetboxCatalogs,
  mapNetboxObject,
  normalizeNetboxDevice,
  normalizeNetboxVirtualMachine,
} from '../netbox-mapper';
import { ExistingAsset, buildMatcherIndex, matchNetboxObject } from '../netbox-matcher';
import { ExistingLink, NetboxPlanRow, planNetboxSync } from '../netbox-planner';
import { NetboxObject } from '../netbox.types';

// Unit spec for the pure half of the Netbox sync: normalisation, mapping,
// the deduplication cascade and the planner, over the matrix from the plan.
// No database and no HTTP, so it runs standalone under ts-node like the other
// __tests__ specs.

const BASE_URL = 'https://netbox.example.test';

const CATALOGS: NetboxCatalogs = {
  assetKinds: [
    { code: 'physical_server', label: 'Physical server' },
    { code: 'virtual_server', label: 'Virtual server' },
  ],
  // The defaults a tenant gets: no 'on_prem' entry, which is exactly the case
  // that used to make every creation fail.
  assetProviders: [
    { code: 'aws', label: 'AWS' },
    { code: 'azure', label: 'Azure' },
    { code: 'gcp', label: 'GCP' },
    { code: 'other', label: 'Other' },
  ],
  operatingSystems: [
    { code: 'vmware_esxi_8', label: 'VMware ESXi 8' },
    { code: 'debian_12', label: 'Debian 12' },
  ],
  lifecycleStates: [
    { code: 'proposed', label: 'Proposed' },
    { code: 'active', label: 'Active' },
    { code: 'deprecated', label: 'Deprecated' },
    { code: 'retired', label: 'Retired' },
  ],
  ipAddressTypes: [
    { code: 'host', label: 'Host' },
    { code: 'management', label: 'Management' },
  ],
  domains: [
    { code: 'fromage', label: 'Fromage', dns_suffix: 'fromage.lan' },
  ],
  subnets: [{ cidr: '10.10.0.0/16' }],
  locations: [
    // A plain on-premise location with no provider of its own, and one with a
    // provider that is not in the catalog either: both must still produce a
    // provider the asset service accepts.
    { id: 'loc-paris', name: 'Paris DC', provider: null },
    { id: 'loc-lyon', name: 'Lyon Warehouse', provider: 'aws' },
  ],
};

const MAP_OPTIONS = {
  roleMap: { server: 'physical_server', [NETBOX_VIRTUAL_MACHINES_SLUG]: 'virtual_server' },
  siteMap: { paris: 'loc-paris', lyon: 'loc-lyon' },
  defaultEnvironment: 'prod',
  catalogs: CATALOGS,
};

function device(overrides: Record<string, unknown> = {}): NetboxObject {
  return normalizeNetboxDevice({
    id: 1,
    name: 'par-esx-01.fromage.lan',
    serial: 'SN-0001',
    role: { slug: 'server', name: 'Server' },
    site: { slug: 'paris', name: 'Paris DC' },
    status: { value: 'active', label: 'Active' },
    platform: { name: 'VMware ESXi 8' },
    device_type: { model: 'PowerEdge R750', manufacturer: { name: 'Dell' } },
    rack: { name: 'R1' },
    position: 12,
    primary_ip4: { address: '10.10.1.5/24' },
    ...overrides,
  }, BASE_URL);
}

function asset(overrides: Partial<ExistingAsset> = {}): ExistingAsset {
  return {
    id: 'asset-1',
    name: 'par-esx-01',
    asset_reference: 'AST-4',
    status: 'active',
    kind: 'physical_server',
    location_id: 'loc-paris',
    hostname: 'par-esx-01',
    domain: 'fromage',
    fqdn: 'par-esx-01.fromage.lan',
    operating_system: 'vmware_esxi_8',
    ip_addresses: [{ type: 'host', ip: '10.10.1.5', subnet_cidr: '10.10.0.0/16' }],
    serial_number: 'SN-0001',
    manufacturer: 'Dell',
    model: 'PowerEdge R750',
    rack_location: 'R1',
    rack_unit: '12',
    ...overrides,
  };
}

function plan(input: {
  objects: NetboxObject[];
  assets?: ExistingAsset[];
  links?: ExistingLink[];
  fetchOk?: boolean;
}) {
  const mappings = input.objects.map((object) => mapNetboxObject(object, MAP_OPTIONS));
  return planNetboxSync({
    mappings,
    links: input.links ?? [],
    assets: input.assets ?? [],
    catalogs: CATALOGS,
    fetchOk: input.fetchOk ?? true,
    totalObjects: input.objects.length,
  });
}

function row(result: ReturnType<typeof plan>, externalId: string): NetboxPlanRow {
  const found = result.rows.find((entry) => entry.external_id === externalId);
  assert.ok(found, `no plan row for object ${externalId}`);
  return found;
}

// --- normalisation ---------------------------------------------------------

{
  const parsed = device();
  assert.equal(parsed.type, 'device');
  assert.equal(parsed.roleSlug, 'server');
  assert.equal(parsed.manufacturer, 'Dell');
  assert.equal(parsed.model, 'PowerEdge R750');
  assert.equal(parsed.position, '12');
  assert.equal(parsed.primaryIp, '10.10.1.5/24');
  assert.equal(parsed.url, `${BASE_URL}/dcim/devices/1/`);

  // Netbox below 3.6 still reports device_role.
  const legacy = normalizeNetboxDevice(
    { id: 9, name: 'old', device_role: { slug: 'server', name: 'Server' }, site: { slug: 'paris' } },
    BASE_URL,
  );
  assert.equal(legacy.roleSlug, 'server');

  // Every virtual machine goes through the one reserved key, whatever role
  // Netbox gives it.
  const vm = normalizeNetboxVirtualMachine({
    id: 50,
    name: 'par-app-01',
    role: { slug: 'some-netbox-role', name: 'Some Netbox role' },
    site: { slug: 'paris', name: 'Paris DC' },
    status: { value: 'active' },
    platform: { name: 'Debian 12' },
  }, BASE_URL);
  assert.equal(vm.type, 'vm');
  assert.equal(vm.roleSlug, NETBOX_VIRTUAL_MACHINES_SLUG);
  assert.equal(vm.roleName, NETBOX_VIRTUAL_MACHINES_NAME);
  assert.equal(vm.serial, null);
  assert.equal(vm.url, `${BASE_URL}/virtualization/virtual-machines/50/`);

  // A machine with no role at all lands on the same key, and the site often
  // comes from the cluster instead of the machine.
  const bare = normalizeNetboxVirtualMachine({
    id: 51,
    name: 'par-app-02',
    role: null,
    site: null,
    cluster: { name: 'Paris vSphere', scope: { slug: 'paris', name: 'Paris DC' } },
  }, BASE_URL);
  assert.equal(bare.roleSlug, NETBOX_VIRTUAL_MACHINES_SLUG);
  assert.equal(bare.siteSlug, 'paris');

  // Older payloads carry cluster.site rather than cluster.scope.
  const legacyCluster = normalizeNetboxVirtualMachine(
    { id: 52, name: 'par-app-03', cluster: { name: 'Paris vSphere', site: { slug: 'paris' } } },
    BASE_URL,
  );
  assert.equal(legacyCluster.siteSlug, 'paris');
}

{
  // Virtual machines are out of scope until the reserved key is matched to an
  // asset type, and then all of them are in scope at once.
  const bare = normalizeNetboxVirtualMachine(
    { id: 51, name: 'par-app-02', site: { slug: 'paris' }, status: { value: 'active' } },
    BASE_URL,
  );
  const unmapped = mapNetboxObject(bare, { ...MAP_OPTIONS, roleMap: { server: 'physical_server' } });
  assert.equal(unmapped.skipReason, 'unmapped_role');
  const mapped = mapNetboxObject(bare, MAP_OPTIONS);
  assert.equal(mapped.skipReason, null);
  assert.equal(mapped.asset?.kind, 'virtual_server');
}

// --- mapping ---------------------------------------------------------------

{
  const mapped = mapNetboxObject(device(), MAP_OPTIONS);
  assert.equal(mapped.skipReason, null);
  assert.equal(mapped.asset?.kind, 'physical_server');
  assert.equal(mapped.asset?.location_id, 'loc-paris');
  assert.equal(mapped.asset?.hostname, 'par-esx-01');
  assert.equal(mapped.asset?.domain, 'fromage');
  assert.equal(mapped.asset?.status, 'active');
  assert.equal(mapped.asset?.provider, 'other', 'a location with no provider falls back to the catalog default');
  assert.deepEqual(mapped.asset?.ip_addresses, [{ type: 'host', ip: '10.10.1.5', subnet_cidr: '10.10.0.0/16' }]);
  assert.equal(mapped.hardware?.serial_number, 'SN-0001');
  assert.deepEqual(mapped.warnings, []);
  // Display values are labels, never codes.
  assert.equal(mapped.display.kind, 'Physical server');
  assert.equal(mapped.display.location, 'Paris DC');
}

{
  // Statuses: decommissioning becomes deprecated, and nothing ever becomes retired.
  for (const [netbox, expected] of [
    ['planned', 'proposed'],
    ['staged', 'proposed'],
    ['inventory', 'proposed'],
    ['active', 'active'],
    ['offline', 'active'],
    ['failed', 'active'],
    ['paused', 'active'],
    ['decommissioning', 'deprecated'],
  ] as const) {
    const mapped = mapNetboxObject(device({ status: { value: netbox } }), MAP_OPTIONS);
    assert.equal(mapped.asset?.status, expected, `status ${netbox}`);
    assert.notEqual(mapped.asset?.status, 'retired');
  }
  const unknown = mapNetboxObject(device({ status: { value: 'mothballed' } }), MAP_OPTIONS);
  assert.equal(unknown.asset?.status, null);
  assert.deepEqual(unknown.warnings.map((notice) => notice.code), ['status_not_mapped']);
  assert.equal(unknown.warnings[0].params.value, 'mothballed');
  assert.match(unknown.warnings[0].text, /mothballed/, 'the English fallback still reads properly');
}

{
  // An operating system KANAP does not know is a warning, never an invention.
  const mapped = mapNetboxObject(device({ platform: { name: 'Plan 9' } }), MAP_OPTIONS);
  assert.equal(mapped.asset?.operating_system, null);
  assert.deepEqual(mapped.warnings.map((notice) => notice.code), ['os_not_in_catalog']);
  assert.equal(mapped.warnings[0].params.value, 'Plan 9');
}

{
  // A name that is not a valid host name still creates the asset, without one.
  const mapped = mapNetboxObject(device({ name: 'Switch #3 (spare)' }), MAP_OPTIONS);
  assert.equal(mapped.asset?.name, 'Switch #3 (spare)');
  assert.equal(mapped.asset?.hostname, null);
  assert.deepEqual(mapped.warnings.map((notice) => notice.code), ['hostname_invalid']);
}

{
  // An unknown DNS suffix leaves the domain alone.
  const mapped = mapNetboxObject(device({ name: 'par-esx-09.other.lan' }), MAP_OPTIONS);
  assert.equal(mapped.asset?.hostname, 'par-esx-09');
  assert.equal(mapped.asset?.domain, null);
  assert.deepEqual(mapped.warnings.map((notice) => notice.code), ['domain_not_in_catalog']);
  assert.equal(mapped.warnings[0].params.value, 'other.lan');
}

{
  // An address outside every known subnet is imported without one.
  const mapped = mapNetboxObject(device({ primary_ip4: { address: '192.0.2.7/24' } }), MAP_OPTIONS);
  assert.deepEqual(mapped.asset?.ip_addresses, [{ type: 'host', ip: '192.0.2.7', subnet_cidr: null }]);
  // IPv6 primaries are out of scope, and say so rather than vanishing.
  const ipv6 = mapNetboxObject(device({ primary_ip4: { address: '2001:db8::1/64' } }), MAP_OPTIONS);
  assert.equal(ipv6.asset?.ip_addresses, null);
  assert.deepEqual(ipv6.warnings.map((notice) => notice.code), ['ipv6_skipped']);
}

// --- the provider an asset is created with ---------------------------------

{
  // The regression that broke creation on every standard tenant: the provider
  // must be a code of the PROVIDER catalog, never a hosting type.
  const providerCodes = CATALOGS.assetProviders.map((option) => option.code);

  // No provider on the location: the catalog's "other" entry.
  assert.equal(mapNetboxObject(device(), MAP_OPTIONS).asset?.provider, 'other');

  // A location that does carry a real provider keeps it.
  const lyon = mapNetboxObject(device({ site: { slug: 'lyon' } }), MAP_OPTIONS);
  assert.equal(lyon.asset?.provider, 'aws');

  // A provider value the catalog does not know falls back too, never through.
  const stray = mapNetboxObject(device(), {
    ...MAP_OPTIONS,
    catalogs: { ...CATALOGS, locations: [{ id: 'loc-paris', name: 'Paris DC', provider: 'on_prem' }] },
  });
  assert.equal(stray.asset?.provider, 'other');

  // Whatever happens, the value is one the asset service will accept.
  for (const mapped of [mapNetboxObject(device(), MAP_OPTIONS), lyon, stray]) {
    assert.ok(providerCodes.includes(mapped.asset?.provider ?? ''), `provider ${mapped.asset?.provider}`);
  }

  // A catalog without "other" falls back to its first entry, as the form does.
  const noOther = mapNetboxObject(device(), {
    ...MAP_OPTIONS,
    catalogs: { ...CATALOGS, assetProviders: [{ code: 'azure', label: 'Azure' }] },
  });
  assert.equal(noOther.asset?.provider, 'azure');
}

{
  // The role and site maps are the import filter.
  assert.equal(mapNetboxObject(device({ role: { slug: 'pdu' } }), MAP_OPTIONS).skipReason, 'unmapped_role');
  assert.equal(mapNetboxObject(device({ site: { slug: 'lille' } }), MAP_OPTIONS).skipReason, 'unmapped_site');
  assert.equal(mapNetboxObject(device({ name: null }), MAP_OPTIONS).skipReason, 'unnamed');
}

// --- matching --------------------------------------------------------------

{
  const assets = [asset()];
  const index = buildMatcherIndex(assets);

  // Renamed in Netbox but the same serial.
  const renamed = mapNetboxObject(device({ name: 'par-esx-01-new', serial: 'SN-0001' }), MAP_OPTIONS);
  const bySerial = matchNetboxObject(renamed, null, index);
  assert.equal(bySerial.matchedBy, 'serial');
  assert.equal(bySerial.assetId, 'asset-1');

  // FQDN in Netbox, shortname in KANAP, different case: still the same host.
  const byHost = matchNetboxObject(
    mapNetboxObject(device({ name: 'PAR-ESX-01.FROMAGE.LAN', serial: null }), MAP_OPTIONS),
    null,
    index,
  );
  assert.equal(byHost.matchedBy, 'fqdn');
  assert.equal(byHost.assetId, 'asset-1');

  // An existing link always wins.
  const linked = matchNetboxObject(mapNetboxObject(device({ serial: 'other' }), MAP_OPTIONS), 'asset-1', index);
  assert.equal(linked.matchedBy, 'link');

  // Nothing matches: a new asset.
  const fresh = matchNetboxObject(
    mapNetboxObject(device({ id: 2, name: 'par-web-99', serial: 'SN-9999' }), MAP_OPTIONS),
    null,
    index,
  );
  assert.equal(fresh.assetId, null);
  assert.deepEqual(fresh.candidateAssetIds, []);
}

{
  // Two assets share the serial: ambiguous, never merged.
  const assets = [asset(), asset({ id: 'asset-2', name: 'par-esx-01-bis', hostname: null, fqdn: null })];
  const ambiguous = matchNetboxObject(
    mapNetboxObject(device({ name: 'something-else' }), MAP_OPTIONS),
    null,
    buildMatcherIndex(assets),
  );
  assert.equal(ambiguous.assetId, null);
  assert.deepEqual(ambiguous.candidateAssetIds.sort(), ['asset-1', 'asset-2']);
}

// --- planning --------------------------------------------------------------

{
  // Everything already in step: no write at all, which is what a second run
  // has to produce.
  const result = plan({ objects: [device()], assets: [asset()] });
  assert.equal(row(result, '1').action, 'unchanged');
  assert.deepEqual(row(result, '1').diffs, []);
  assert.equal(result.counts.unchanged, 1);
}

{
  // A name that differs only in case is not a rename.
  const result = plan({ objects: [device({ name: 'PAR-ESX-01.fromage.lan' })], assets: [asset({ name: 'par-esx-01' })] });
  assert.equal(row(result, '1').action, 'unchanged');
}

{
  // A real rename is one: matched on the serial, the new name is applied.
  const result = plan({ objects: [device({ name: 'par-esx-42.fromage.lan' })], assets: [asset()] });
  const renamed = row(result, '1');
  assert.equal(renamed.action, 'update');
  assert.equal(renamed.matched_by, 'serial');
  assert.deepEqual(
    renamed.diffs.find((diff) => diff.field === 'name'),
    { field: 'name', before: 'par-esx-01', after: 'par-esx-42.fromage.lan' },
  );
}

{
  // Divergent fields produce display-value differences.
  const result = plan({
    objects: [device({ status: { value: 'decommissioning' }, platform: { name: 'Debian 12' }, site: { slug: 'lyon', name: 'Lyon Warehouse' } })],
    assets: [asset()],
  });
  const updated = row(result, '1');
  assert.equal(updated.action, 'update');
  assert.equal(updated.matched_by, 'serial');
  const diffs = Object.fromEntries(updated.diffs.map((diff) => [diff.field, diff]));
  assert.deepEqual(diffs.status, { field: 'status', before: 'Active', after: 'Deprecated' });
  assert.deepEqual(diffs.operating_system, { field: 'operating_system', before: 'VMware ESXi 8', after: 'Debian 12' });
  assert.deepEqual(diffs.location, { field: 'location', before: 'Paris DC', after: 'Lyon Warehouse' });
}

{
  // Netbox knows nothing about these fields: they must not be blanked.
  const result = plan({
    objects: [device({ serial: null, platform: null, rack: null, position: null, primary_ip4: null, status: null })],
    assets: [asset({ serial_number: null })],
  });
  assert.deepEqual(row(result, '1').diffs, []);
}

{
  // Enrichment: the asset exists with no hardware record yet.
  const result = plan({ objects: [device()], assets: [asset({ serial_number: null, manufacturer: null, model: null, rack_location: null, rack_unit: null })] });
  const enriched = row(result, '1');
  assert.equal(enriched.action, 'update');
  assert.equal(enriched.matched_by, 'fqdn');
  assert.deepEqual(
    enriched.diffs.map((diff) => diff.field).sort(),
    ['manufacturer', 'model', 'rack_location', 'rack_unit', 'serial_number'],
  );
}

{
  // New device and new virtual machine.
  const vm = normalizeNetboxVirtualMachine({
    id: 50,
    name: 'par-app-01',
    site: { slug: 'paris' },
    status: { value: 'active' },
  }, BASE_URL);
  const result = plan({ objects: [device({ id: 7, name: 'par-web-07', serial: 'SN-0007' }), vm] });
  assert.equal(row(result, '7').action, 'create');
  assert.equal(row(result, '50').action, 'create');
  assert.equal(result.counts.create, 2);
  // Device 1 and VM 1 would not collide: the type is part of the identity.
  assert.equal(result.rows.filter((entry) => entry.external_type === 'vm').length, 1);
}

{
  // An object a person ignored stays out of the way.
  const links: ExistingLink[] = [
    { id: 'link-1', external_type: 'device', external_id: '1', asset_id: null, state: 'ignored' },
  ];
  const result = plan({ objects: [device()], assets: [asset()], links });
  assert.equal(row(result, '1').action, 'skipped');
  assert.equal(row(result, '1').skip_reason, 'ignored');
}

{
  // Ambiguity is reported with both candidates, and nothing is planned for it.
  const assets = [asset(), asset({ id: 'asset-2', name: 'par-esx-01-bis', hostname: null, fqdn: null, asset_reference: 'AST-5' })];
  const result = plan({ objects: [device({ name: 'brand-new-name' })], assets });
  const ambiguous = row(result, '1');
  assert.equal(ambiguous.action, 'ambiguous');
  assert.deepEqual(ambiguous.candidates.map((candidate) => candidate.asset_reference).sort(), ['AST-4', 'AST-5']);
  assert.equal(result.writes.has('device:1'), false);
}

// --- one asset, one Netbox object ------------------------------------------

{
  // Asset 1 belongs to device 1. Device 2 would match it on the host name, but
  // the asset is taken: device 2 becomes a new asset instead.
  const links: ExistingLink[] = [
    { id: 'link-1', external_type: 'device', external_id: '1', asset_id: 'asset-1', state: 'linked' },
  ];
  const result = plan({
    objects: [device(), device({ id: 2, name: 'par-esx-01.fromage.lan', serial: 'SN-0002' })],
    assets: [asset()],
    links,
  });
  assert.equal(row(result, '1').action, 'unchanged');
  assert.equal(row(result, '2').action, 'create');
  assert.equal(row(result, '2').asset, null);
  assert.equal(row(result, '2').candidates.length, 0, 'a claimed asset is not even offered as a candidate');
}

{
  // Two unlinked Netbox objects reach the same asset: neither is linked, both
  // go to a person with that asset as the candidate.
  const result = plan({
    objects: [
      device({ id: 1, name: 'par-esx-01', serial: null }),
      device({ id: 2, name: 'par-esx-01.fromage.lan', serial: null }),
    ],
    assets: [asset()],
  });
  for (const externalId of ['1', '2']) {
    const contested = row(result, externalId);
    assert.equal(contested.action, 'ambiguous', `object ${externalId}`);
    assert.deepEqual(contested.candidates.map((candidate) => candidate.asset_reference), ['AST-4']);
    assert.ok(
      contested.warnings.some((warning) => warning.code === 'contested_asset'),
      'the reason is carried as a translatable code',
    );
  }
  assert.equal(result.counts.ambiguous, 2);
  assert.equal(result.counts.create, 0);
  assert.equal(result.writes.size, 0, 'nothing is written for a contested asset');
}

{
  // A device deleted in Netbox and recreated comes back under a new id. The
  // old record is 'missing', which does NOT hold the asset, so the new object
  // picks it up on the host name.
  const links: ExistingLink[] = [
    { id: 'link-old', external_type: 'device', external_id: '1', asset_id: 'asset-1', state: 'missing' },
  ];
  const result = plan({
    objects: [device({ id: 77, name: 'par-esx-01.fromage.lan', serial: 'SN-0001' })],
    assets: [asset()],
    links,
  });
  const recreated = row(result, '77');
  assert.equal(recreated.action, 'unchanged');
  assert.equal(recreated.matched_by, 'serial');
  assert.equal(recreated.asset?.asset_reference, 'AST-4');
  // The old record is not listed as missing again: Netbox never showed it.
  assert.deepEqual(result.missing, []);
}

{
  // The reproduction: device 1's record is 'missing' on asset X, device 2's is
  // 'linked' on the same asset, and Netbox lists both. Device 1 must not be
  // written as a second owner — its stale record no longer binds it.
  const links: ExistingLink[] = [
    { id: 'link-1', external_type: 'device', external_id: '1', asset_id: 'asset-1', state: 'missing' },
    { id: 'link-2', external_type: 'device', external_id: '2', asset_id: 'asset-1', state: 'linked' },
  ];
  const result = plan({
    objects: [device({ id: 1, serial: null, name: 'par-esx-01.fromage.lan' }), device({ id: 2, serial: null, name: 'par-esx-01.fromage.lan' })],
    assets: [asset({ serial_number: null })],
    links,
  });
  assert.equal(row(result, '2').action, 'unchanged', 'the live record keeps its asset');
  assert.equal(row(result, '2').asset?.id, 'asset-1');
  const displaced = row(result, '1');
  assert.notEqual(displaced.action, 'unchanged');
  assert.notEqual(displaced.action, 'update');
  assert.equal(displaced.asset, null, 'the stale record must not bind to a taken asset');
  // Exactly one row ends up writing to that asset.
  const owners = [...result.writes.values()].filter((write) => write.assetId === 'asset-1');
  assert.equal(owners.length, 1);
}

{
  // Two stored records both claiming one asset (data an older build could
  // write): the plan heals it to a single owner instead of confirming both.
  const links: ExistingLink[] = [
    { id: 'link-1', external_type: 'device', external_id: '1', asset_id: 'asset-1', state: 'linked' },
    { id: 'link-2', external_type: 'device', external_id: '2', asset_id: 'asset-1', state: 'linked' },
  ];
  const result = plan({
    objects: [device({ id: 1, serial: null, name: 'one' }), device({ id: 2, serial: null, name: 'two' })],
    assets: [asset({ serial_number: null })],
    links,
  });
  const writers = [...result.writes.values()].filter((write) => write.assetId === 'asset-1');
  assert.equal(writers.length, 1, 'exactly one object may keep the asset');
}

{
  // Same story, but the deletion and the recreation land in ONE run: the old
  // record is still 'linked' and Netbox simply stops listing it. It becomes
  // missing and releases the asset in the same plan, so the new object takes
  // it over instead of creating a duplicate.
  const links: ExistingLink[] = [
    { id: 'link-old', external_type: 'device', external_id: '1', asset_id: 'asset-1', state: 'linked' },
  ];
  const result = plan({
    objects: [device({ id: 77, name: 'par-esx-01.fromage.lan', serial: 'SN-0001' })],
    assets: [asset()],
    links,
  });
  const recreated = row(result, '77');
  assert.equal(recreated.action, 'unchanged');
  assert.equal(recreated.asset?.asset_reference, 'AST-4');
  assert.deepEqual(result.missing.map((link) => link.id), ['link-old']);
  assert.equal(result.counts.create, 0, 'no duplicate asset');
}

{
  // The release only happens when the fetch can be trusted. A failed fetch
  // leaves every claim in place.
  const links: ExistingLink[] = [
    { id: 'link-old', external_type: 'device', external_id: '1', asset_id: 'asset-1', state: 'linked' },
  ];
  const result = planNetboxSync({
    mappings: [mapNetboxObject(device({ id: 77, name: 'par-esx-01.fromage.lan', serial: 'SN-0001' }), MAP_OPTIONS)],
    links,
    assets: [asset()],
    catalogs: CATALOGS,
    fetchOk: false,
    totalObjects: 1,
  });
  assert.equal(row(result, '77').action, 'create');
  assert.deepEqual(result.missing, []);
}

{
  // An error record still points at its asset and keeps retrying it rather
  // than creating a duplicate.
  const links: ExistingLink[] = [
    { id: 'link-err', external_type: 'device', external_id: '1', asset_id: 'asset-1', state: 'error' },
  ];
  const result = plan({ objects: [device()], assets: [asset()], links });
  assert.equal(row(result, '1').action, 'unchanged');
}

// --- matched_by names the field it came from -------------------------------

{
  // No host name on the asset: the name is what matched, so say so.
  const byName = plan({
    objects: [device({ serial: null })],
    assets: [asset({ hostname: null, fqdn: null, serial_number: null })],
  });
  assert.equal(row(byName, '1').matched_by, 'name');

  // With a host name, the host is what matched.
  const byHost = plan({
    objects: [device({ serial: null })],
    assets: [asset({ name: 'Old inventory label', serial_number: null })],
  });
  assert.equal(row(byHost, '1').matched_by, 'fqdn');
}

// --- the missing guard -----------------------------------------------------

{
  const links: ExistingLink[] = [
    { id: 'link-gone', external_type: 'device', external_id: '404', asset_id: 'asset-1', state: 'linked' },
  ];

  // Netbox no longer lists the object and did return other objects: missing.
  const seen = plan({ objects: [device()], assets: [asset()], links });
  assert.deepEqual(seen.missing.map((link) => link.id), ['link-gone']);
  assert.equal(seen.counts.missing, 1);

  // Netbox returned nothing at all: an outage, not a decommissioning.
  const empty = plan({ objects: [], assets: [asset()], links });
  assert.deepEqual(empty.missing, []);
  assert.equal(empty.counts.missing, 0);

  // The fetch failed: same rule.
  const failed = planNetboxSync({
    mappings: [mapNetboxObject(device(), MAP_OPTIONS)],
    links,
    assets: [asset()],
    catalogs: CATALOGS,
    fetchOk: false,
    totalObjects: 1,
  });
  assert.deepEqual(failed.missing, []);

  // An asset that never came from Netbox is not touched: it has no link row.
  const untouched = plan({ objects: [device()], assets: [asset(), asset({ id: 'aws-1', name: 'aws-rds-01', serial_number: null, hostname: null, fqdn: null })] });
  assert.equal(untouched.missing.length, 0);
}

console.log('netbox-planner.spec.ts OK');
