import * as assert from 'node:assert/strict';
import { NetboxCatalogs, mapNetboxObject, normalizeNetboxDevice } from '../netbox-mapper';
import { ExistingAsset, buildMatcherIndex, matchNetboxObject } from '../netbox-matcher';
import { primaryNotice } from '../netbox-notice';
import { diffNetboxMapping, planNetboxSync } from '../netbox-planner';
import { NetboxObject } from '../netbox.types';

// How a Netbox object name becomes a KANAP host name and, sometimes, a domain.
//
// The production incident this spec pins down: a team naming its devices
// `DL3.ROBOT-15MS.IE2000` (building, machine, model) ended up with 250 assets
// whose host name was `dl3` and 250 notices about a domain nobody ever had.
// A dot no longer introduces a domain; only a DNS suffix the tenant actually
// holds does.

const BASE_URL = 'https://netbox.example.test';

const CATALOGS: NetboxCatalogs = {
  assetKinds: [{ code: 'physical_server', label: 'Physical server' }],
  assetProviders: [{ code: 'other', label: 'Other' }],
  operatingSystems: [],
  lifecycleStates: [{ code: 'active', label: 'Active' }],
  ipAddressTypes: [{ code: 'host', label: 'Host' }],
  domains: [
    { code: 'example', label: 'Example', dns_suffix: 'example.com' },
    { code: 'corp', label: 'Corp', dns_suffix: 'corp.example.com' },
    // Written with its leading dot, as an administrator may well type it.
    { code: 'lab', label: 'Lab', dns_suffix: '.lab.internal' },
    // No DNS suffix at all: these must never split a name.
    { code: 'workgroup', label: 'Workgroup', dns_suffix: null },
    { code: 'n-a', label: 'Not applicable', dns_suffix: '' },
  ],
  subnets: [],
  locations: [{ id: 'loc-paris', name: 'Paris DC', provider: null }],
};

const MAP_OPTIONS = {
  roleMap: { server: 'physical_server' },
  siteMap: { paris: 'loc-paris' },
  defaultEnvironment: 'prod',
  catalogs: CATALOGS,
  locations: null,
};

function device(overrides: Record<string, unknown> = {}): NetboxObject {
  return normalizeNetboxDevice({
    id: 1,
    name: 'srv01',
    serial: null,
    role: { slug: 'server', name: 'Server' },
    site: { slug: 'paris', name: 'Paris DC' },
    status: { value: 'active', label: 'Active' },
    ...overrides,
  }, BASE_URL);
}

/** The host name, the domain and the notice codes one Netbox name produces. */
function mapName(name: string) {
  const mapped = mapNetboxObject(device({ name }), MAP_OPTIONS);
  return {
    hostname: mapped.asset?.hostname ?? null,
    domain: mapped.asset?.domain ?? null,
    codes: mapped.warnings.map((notice) => notice.code),
  };
}

// --- splitting a name ------------------------------------------------------

{
  // No dot at all: the name is the host name.
  assert.deepEqual(mapName('srv01'), { hostname: 'srv01', domain: null, codes: [] });

  // Uppercase is normalised, here and everywhere below.
  assert.deepEqual(mapName('SRV01'), { hostname: 'srv01', domain: null, codes: [] });
}

{
  // Dots, but the end is no suffix the tenant holds: the whole name is the
  // host name, the domain is left alone and NOTHING is reported. This is the
  // production case.
  assert.deepEqual(
    mapName('DL3.ROBOT-15MS.IE2000'),
    { hostname: 'dl3.robot-15ms.ie2000', domain: null, codes: [] },
  );
  assert.deepEqual(
    mapName('srv01.unknown.lan'),
    { hostname: 'srv01.unknown.lan', domain: null, codes: [] },
  );
}

{
  // A known suffix does split, and names the domain.
  assert.deepEqual(mapName('srv01.example.com'), { hostname: 'srv01', domain: 'example', codes: [] });

  // Longest suffix wins: `corp.example.com` beats `example.com`.
  assert.deepEqual(mapName('srv01.corp.example.com'), { hostname: 'srv01', domain: 'corp', codes: [] });

  // A suffix stored with its leading dot matches all the same.
  assert.deepEqual(mapName('srv01.lab.internal'), { hostname: 'srv01', domain: 'lab', codes: [] });

  // What is left of the suffix may itself carry dots.
  assert.deepEqual(
    mapName('dl3.robot-15ms.example.com'),
    { hostname: 'dl3.robot-15ms', domain: 'example', codes: [] },
  );
}

{
  // The name IS the suffix: no host name left, so it is not a split.
  assert.deepEqual(mapName('example.com'), { hostname: 'example.com', domain: null, codes: [] });

  // The suffix must end the name on a dot boundary: `xcorp.example.com` is not
  // in `corp.example.com`, and `example.company` is not in `example.com`.
  assert.deepEqual(
    mapName('srv01.xcorp.example.com'),
    { hostname: 'srv01.xcorp', domain: 'example', codes: [] },
  );
  assert.deepEqual(mapName('srv01.example.company'), {
    hostname: 'srv01.example.company',
    domain: null,
    codes: [],
  });
}

{
  // Catalog entries with no DNS suffix never match anything.
  assert.deepEqual(mapName('srv01.workgroup'), { hostname: 'srv01.workgroup', domain: null, codes: [] });
  assert.deepEqual(mapName('srv01.n-a'), { hostname: 'srv01.n-a', domain: null, codes: [] });
}

{
  // A name that cannot be a host name still creates the asset, without one.
  assert.deepEqual(
    mapName('Switch #3 (spare)'),
    { hostname: null, domain: null, codes: ['hostname_invalid'] },
  );
  // Same when only one label is broken: the whole name is the host name, so
  // the whole name has to be valid.
  assert.deepEqual(
    mapName('dl3..ie2000'),
    { hostname: null, domain: null, codes: ['hostname_invalid'] },
  );
  // The domain is still resolved when the rest is unusable; `createBody` and
  // `updateBody` only ever send a domain together with a host name.
  const underscored = mapName('bad_name.example.com');
  assert.equal(underscored.hostname, null);
  assert.equal(underscored.domain, 'example');
  assert.deepEqual(underscored.codes, ['hostname_invalid']);
}

// --- self-healing the assets an earlier build cut at the first dot ----------

function asset(overrides: Partial<ExistingAsset> = {}): ExistingAsset {
  return {
    id: 'asset-1',
    name: 'DL3.ROBOT-15MS.IE2000',
    asset_reference: 'AST-1',
    status: 'active',
    kind: 'physical_server',
    location_id: 'loc-paris',
    sub_location_id: null,
    hostname: 'dl3',
    domain: null,
    fqdn: 'dl3',
    operating_system: null,
    ip_addresses: null,
    serial_number: null,
    manufacturer: null,
    model: null,
    rack_location: null,
    rack_unit: null,
    ...overrides,
  };
}

{
  // The next run over the same object is an ordinary host name change. The
  // asset service recomputes the FQDN whenever the host name is patched.
  const mapping = mapNetboxObject(device({ name: 'DL3.ROBOT-15MS.IE2000' }), MAP_OPTIONS);
  const diffs = diffNetboxMapping(mapping, asset(), CATALOGS);
  assert.deepEqual(
    diffs.find((diff) => diff.field === 'hostname'),
    { field: 'hostname', before: 'dl3', after: 'dl3.robot-15ms.ie2000' },
  );
  // The name itself did not change, and no domain is invented.
  assert.deepEqual(diffs.map((diff) => diff.field), ['hostname']);

  // Once healed, the second run has nothing left to do.
  const healed = diffNetboxMapping(
    mapping,
    asset({ hostname: 'dl3.robot-15ms.ie2000', fqdn: 'dl3.robot-15ms.ie2000' }),
    CATALOGS,
  );
  assert.deepEqual(healed, []);
}

// --- matching --------------------------------------------------------------

{
  // (a) The Netbox FQDN against an asset that keeps its domain separately:
  // the asset's own FQDN is the exact key, so it is the same machine.
  const existing = asset({
    id: 'asset-srv01',
    name: 'srv01',
    hostname: 'srv01',
    domain: 'corp',
    fqdn: 'srv01.corp.example.com',
  });
  const match = matchNetboxObject(
    mapNetboxObject(device({ name: 'SRV01.CORP.EXAMPLE.COM' }), MAP_OPTIONS),
    null,
    buildMatcherIndex([existing]),
  );
  assert.equal(match.matchedBy, 'fqdn');
  assert.equal(match.assetId, 'asset-srv01');
}

{
  // (b) An unknown suffix: KANAP now writes `srv01.unknown.lan` as the host
  // name. The first label still finds the asset a person created as `srv01`,
  // so nothing is duplicated, but a resemblance never links on its own: the
  // asset is OFFERED, and a person says whether it is the same equipment.
  const existing = asset({ id: 'asset-srv01', name: 'srv01', hostname: 'srv01', domain: null, fqdn: 'srv01' });
  const match = matchNetboxObject(
    mapNetboxObject(device({ name: 'srv01.unknown.lan' }), MAP_OPTIONS),
    null,
    buildMatcherIndex([existing]),
  );
  assert.equal(match.assetId, null);
  assert.equal(match.matchedBy, null);
  assert.deepEqual(match.candidateAssetIds, ['asset-srv01']);
  assert.equal(match.suggestedByName, 'srv01');
}

{
  // A later level that identifies the object for sure still wins over a
  // resemblance found earlier: the host level only knows `srv01`, the name
  // level holds the whole name.
  const existing = [
    asset({ id: 'asset-short', name: 'srv01', hostname: 'srv01', domain: null, fqdn: 'srv01' }),
    asset({ id: 'asset-full', name: 'srv01.unknown.lan', hostname: null, domain: null, fqdn: null }),
  ];
  const match = matchNetboxObject(
    mapNetboxObject(device({ name: 'srv01.unknown.lan' }), MAP_OPTIONS),
    null,
    buildMatcherIndex(existing),
  );
  assert.equal(match.matchedBy, 'name');
  assert.equal(match.assetId, 'asset-full');
}

{
  // The fleet that shares a first label. An exact host name identifies its own
  // asset; it must not be drowned by the 250 others behind the label `dl3`.
  const fleet = [
    asset({ id: 'a1', name: 'DL3.ROBOT-15MS.IE2000', hostname: 'dl3.robot-15ms.ie2000', fqdn: 'dl3.robot-15ms.ie2000' }),
    asset({ id: 'a2', name: 'DL3.ROBOT-16MS.IE2000', hostname: 'dl3.robot-16ms.ie2000', fqdn: 'dl3.robot-16ms.ie2000' }),
    asset({ id: 'a3', name: 'DL3.PRESS-02.IE2000', hostname: 'dl3.press-02.ie2000', fqdn: 'dl3.press-02.ie2000' }),
  ];
  const index = buildMatcherIndex(fleet);
  const match = matchNetboxObject(
    mapNetboxObject(device({ name: 'DL3.ROBOT-16MS.IE2000' }), MAP_OPTIONS),
    null,
    index,
  );
  assert.equal(match.matchedBy, 'fqdn');
  assert.equal(match.assetId, 'a2');

  // A new machine of the same fleet matches none of them: it is offered, and
  // is NOT auto-linked to an unrelated asset that merely starts with `dl3`.
  const fresh = matchNetboxObject(
    mapNetboxObject(device({ id: 9, name: 'DL3.PRESS-07.IE2000' }), MAP_OPTIONS),
    null,
    index,
  );
  assert.equal(fresh.assetId, null);
  assert.deepEqual(fresh.candidateAssetIds.sort(), ['a1', 'a2', 'a3']);
  assert.equal(fresh.suggestedByName, 'dl3');
}

{
  // Assets an earlier build left with the host name `dl3`, before any run has
  // healed them. They all share that label, so the host level says nothing.
  const stale = [
    asset({ id: 'a1', name: 'DL3.ROBOT-15MS.IE2000', hostname: 'dl3', fqdn: 'dl3' }),
    asset({ id: 'a2', name: 'DL3.ROBOT-16MS.IE2000', hostname: 'dl3', fqdn: 'dl3' }),
  ];
  const index = buildMatcherIndex(stale);

  // The asset NAME is still the whole Netbox name, and that is an exact hit:
  // the object finds its own asset and heals its host name.
  const own = matchNetboxObject(
    mapNetboxObject(device({ name: 'DL3.ROBOT-16MS.IE2000' }), MAP_OPTIONS),
    null,
    index,
  );
  assert.equal(own.matchedBy, 'name');
  assert.equal(own.assetId, 'a2');

  // A machine none of them is: only the label `dl3` is shared, so both are
  // offered and nothing is written.
  const other = matchNetboxObject(
    mapNetboxObject(device({ id: 9, name: 'DL3.PRESS-07.IE2000' }), MAP_OPTIONS),
    null,
    index,
  );
  assert.equal(other.assetId, null);
  assert.deepEqual(other.candidateAssetIds.sort(), ['a1', 'a2']);
  assert.equal(other.suggestedByName, 'dl3');
}

{
  // The case that must never write by itself: ONE asset a person owns, named
  // after the building. The device is not that machine, and nothing says it
  // is, so the asset is offered and its name, type and location are left
  // exactly as they are.
  const lone = [asset({ id: 'building', name: 'dl3', hostname: 'dl3', fqdn: 'dl3' })];
  const match = matchNetboxObject(
    mapNetboxObject(device({ id: 9, name: 'DL3.PRESS-07.IE2000' }), MAP_OPTIONS),
    null,
    buildMatcherIndex(lone),
  );
  assert.equal(match.assetId, null);
  assert.equal(match.matchedBy, null);
  assert.deepEqual(match.candidateAssetIds, ['building']);
  assert.equal(match.suggestedByName, 'dl3');
}

{
  // A link an earlier run recorded still wins over everything: that is how the
  // 250 assets are healed rather than questioned.
  const linked = matchNetboxObject(
    mapNetboxObject(device({ name: 'DL3.ROBOT-15MS.IE2000' }), MAP_OPTIONS),
    'asset-1',
    buildMatcherIndex([asset()]),
  );
  assert.equal(linked.matchedBy, 'link');
  assert.equal(linked.assetId, 'asset-1');
}

// --- what a run does with such a row ---------------------------------------

{
  // The whole plan, the way the hourly run sees it: the object waits for a
  // person, and the run has nothing to write for it. The apply step reads
  // `writes` for everything it touches and records an 'ambiguous' row without
  // writing, so an automatic run cannot overwrite the asset either.
  const lone = asset({ id: 'building', name: 'dl3', hostname: 'dl3', fqdn: 'dl3' });
  const object = device({ id: 9, name: 'DL3.PRESS-07.IE2000' });
  const plan = planNetboxSync({
    mappings: [mapNetboxObject(object, MAP_OPTIONS)],
    links: [],
    assets: [lone],
    catalogs: CATALOGS,
    fetchOk: true,
    totalObjects: 1,
    subLocations: [],
    locationIndex: null,
    siteMap: MAP_OPTIONS.siteMap,
  });
  const planned = plan.rows[0];
  assert.equal(planned.action, 'ambiguous');
  assert.equal(planned.asset, null);
  assert.deepEqual(planned.candidates.map((candidate) => candidate.id), ['building']);
  assert.equal(primaryNotice(planned.warnings)?.code, 'similar_name_candidates');
  assert.equal(plan.counts.ambiguous, 1);
  assert.equal(plan.counts.create, 0);
  assert.equal(plan.counts.update, 0);
  assert.equal(plan.writes.size, 0, 'an automatic run has nothing to write for this object');
}

console.log('netbox hostname/domain rule: ok');
