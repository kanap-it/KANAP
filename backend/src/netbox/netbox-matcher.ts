import { MappedIpAddress, NetboxMapping } from './netbox-mapper';

// Pure deduplication cascade. Netbox objects are matched to existing assets on
// an existing link first, then the serial number, then the host name / FQDN,
// then the name. The FIRST level that yields an exact hit decides: more than
// one asset there is an ambiguity, reported for a human to settle, never
// merged.
//
// Two weaker signals never link on their own; they only stop a blind creation
// and hand the assets they found to a person as candidates:
//  - the first DNS label of the name (the shortname <-> FQDN bridge the SRE
//    entity resolver uses), because a label shared by several machines is a
//    resemblance, not an identity;
//  - the primary IP address, which is reused, shared (clusters, VIPs) or stale
//    too often to let Netbox overwrite an asset on that basis alone.

export type ExistingAsset = {
  id: string;
  name: string;
  asset_reference: string | null;
  status: string;
  kind: string;
  location_id: string | null;
  sub_location_id: string | null;
  hostname: string | null;
  domain: string | null;
  fqdn: string | null;
  operating_system: string | null;
  ip_addresses: MappedIpAddress[] | null;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  rack_location: string | null;
  rack_unit: string | null;
};

export type NetboxMatchedBy = 'link' | 'serial' | 'fqdn' | 'name' | 'manual';

export type NetboxMatch = {
  assetId: string | null;
  matchedBy: NetboxMatchedBy | null;
  /** Populated only when the cascade stopped on several candidates. */
  candidateAssetIds: string[];
  /** Set when the candidates come from the IP address alone; holds that address. */
  suggestedByIp?: string;
  /** Set when the candidates only share the name's first label; holds that label. */
  suggestedByName?: string;
};

export type NetboxMatcherIndex = {
  bySerial: Map<string, string[]>;
  byHost: Map<string, string[]>;
  byName: Map<string, string[]>;
  byIp: Map<string, string[]>;
};

function normalize(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim().toLowerCase();
  return text || null;
}

/** First DNS label of a dotted name ("par-esx-01.fromage.lan" -> "par-esx-01"). */
function firstLabel(value: string): string | null {
  const dot = value.indexOf('.');
  return dot > 0 ? value.slice(0, dot) : null;
}

function push(index: Map<string, string[]>, key: string | null, assetId: string): void {
  if (!key) return;
  const existing = index.get(key);
  if (existing) {
    if (!existing.includes(assetId)) existing.push(assetId);
  } else {
    index.set(key, [assetId]);
  }
}

/**
 * Indexes the tenant's assets once per run. Both the host keys and the name
 * keys carry the full value and its first label, so a shortname asset is still
 * found from an FQDN in Netbox and the other way round — as a candidate, since
 * a first-label hit is only offered, never linked. The two are indexed
 * separately so
 * a match reports the field it really came from: an asset with no host name
 * that matches on its name is a name match, not an FQDN one.
 */
export function buildMatcherIndex(assets: ExistingAsset[]): NetboxMatcherIndex {
  const index: NetboxMatcherIndex = { bySerial: new Map(), byHost: new Map(), byName: new Map(), byIp: new Map() };
  for (const asset of assets) {
    push(index.bySerial, normalize(asset.serial_number), asset.id);
    for (const value of [asset.hostname, asset.fqdn]) {
      const normalized = normalize(value);
      if (!normalized) continue;
      push(index.byHost, normalized, asset.id);
      push(index.byHost, firstLabel(normalized), asset.id);
    }
    const name = normalize(asset.name);
    push(index.byName, name, asset.id);
    push(index.byName, name ? firstLabel(name) : null, asset.id);
    for (const entry of Array.isArray(asset.ip_addresses) ? asset.ip_addresses : []) {
      push(index.byIp, normalize(entry?.ip), asset.id);
    }
  }
  return index;
}

function lookup(index: Map<string, string[]>, keys: Array<string | null>): string[] {
  const found: string[] = [];
  for (const key of keys) {
    if (!key) continue;
    for (const assetId of index.get(key) ?? []) {
      if (!found.includes(assetId)) found.push(assetId);
    }
  }
  return found;
}

/**
 * Runs the cascade for one mapped object. `linkedAssetId` is the asset a
 * previous run already linked this Netbox object to, when it still exists.
 *
 * Inside the host and name levels, the whole value and its first label are not
 * equally strong. An asset whose host name IS the Netbox name is that machine.
 * A shared first label only says the two names start alike, and in an
 * inventory that names equipment `DL3.ROBOT-15MS.IE2000` that first label is a
 * building, not a machine: linking on it alone would let one asset named `dl3`
 * quietly absorb a device and have its name, type and location rewritten.
 *
 * So the whole value decides as before, and a hit that comes only from the
 * first label never links on its own: it is offered to a person, exactly like
 * an asset already holding the object's address.
 *
 * Two values count as the whole thing: the Netbox name, and the host name the
 * mapper derived from it. They differ only when the name ended with a DNS
 * suffix the tenant holds in its domain catalog, and cutting a suffix the
 * tenant itself declared is not a guess: "srv01.fromage.lan" IS the asset
 * "srv01" of the domain "fromage".
 */
export function matchNetboxObject(
  mapping: NetboxMapping,
  linkedAssetId: string | null,
  index: NetboxMatcherIndex,
): NetboxMatch {
  if (linkedAssetId) {
    return { assetId: linkedAssetId, matchedBy: 'link', candidateAssetIds: [] };
  }
  if (!mapping.asset) {
    return { assetId: null, matchedBy: null, candidateAssetIds: [] };
  }

  const name = normalize(mapping.object.name);
  const label = name ? firstLabel(name) : null;
  // The host name the mapper kept, when a declared DNS suffix was cut off it.
  const shortened = normalize(mapping.asset.hostname);
  const whole = shortened && shortened !== name ? [name, shortened] : [name];
  const levels: Array<{ matchedBy: NetboxMatchedBy; exact: string[]; similar: string[] }> = [
    { matchedBy: 'serial', exact: lookup(index.bySerial, [normalize(mapping.object.serial)]), similar: [] },
    { matchedBy: 'fqdn', exact: lookup(index.byHost, whole), similar: lookup(index.byHost, [label]) },
    { matchedBy: 'name', exact: lookup(index.byName, whole), similar: lookup(index.byName, [label]) },
  ];

  // The first level with an exact hit decides. A level that only has similar
  // names is remembered and used at the end, so a later level that identifies
  // the object for sure still wins over a resemblance found earlier.
  let similar: string[] | null = null;
  for (const level of levels) {
    if (level.exact.length === 1) {
      return { assetId: level.exact[0], matchedBy: level.matchedBy, candidateAssetIds: [] };
    }
    if (level.exact.length > 1) {
      return { assetId: null, matchedBy: null, candidateAssetIds: level.exact };
    }
    if (!similar && level.similar.length > 0) similar = level.similar;
  }

  if (similar && label) {
    return { assetId: null, matchedBy: null, candidateAssetIds: similar, suggestedByName: label };
  }

  // Nothing identifies the object. Before it is created, an asset already
  // holding its primary address is worth a person's look, even a single one.
  const ip = normalize(mapping.asset.ip_addresses?.[0]?.ip);
  const sameAddress = lookup(index.byIp, [ip]);
  if (ip && sameAddress.length > 0) {
    return { assetId: null, matchedBy: null, candidateAssetIds: sameAddress, suggestedByIp: ip };
  }
  return { assetId: null, matchedBy: null, candidateAssetIds: [] };
}
