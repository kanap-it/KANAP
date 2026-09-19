import { MappedIpAddress, NetboxMapping } from './netbox-mapper';

// Pure deduplication cascade. Netbox objects are matched to existing assets on
// an existing link first, then the serial number, then the host name / FQDN
// (with the shortname <-> FQDN bridge the SRE entity resolver uses), then the
// name. The FIRST level that yields any candidate decides: more than one
// candidate there is an ambiguity, reported for a human to settle, never
// merged.

export type ExistingAsset = {
  id: string;
  name: string;
  asset_reference: string | null;
  status: string;
  kind: string;
  location_id: string | null;
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

export type NetboxMatchedBy = 'link' | 'serial' | 'fqdn' | 'name';

export type NetboxMatch = {
  assetId: string | null;
  matchedBy: NetboxMatchedBy | null;
  /** Populated only when the cascade stopped on several candidates. */
  candidateAssetIds: string[];
};

export type NetboxMatcherIndex = {
  bySerial: Map<string, string[]>;
  byHost: Map<string, string[]>;
  byName: Map<string, string[]>;
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
 * keys carry the full value and its first label, so a shortname asset matches
 * an FQDN in Netbox and the other way round. The two are indexed separately so
 * a match reports the field it really came from: an asset with no host name
 * that matches on its name is a name match, not an FQDN one.
 */
export function buildMatcherIndex(assets: ExistingAsset[]): NetboxMatcherIndex {
  const index: NetboxMatcherIndex = { bySerial: new Map(), byHost: new Map(), byName: new Map() };
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
  const levels: Array<{ matchedBy: NetboxMatchedBy; candidates: string[] }> = [
    { matchedBy: 'serial', candidates: lookup(index.bySerial, [normalize(mapping.object.serial)]) },
    { matchedBy: 'fqdn', candidates: lookup(index.byHost, [name, name ? firstLabel(name) : null]) },
    { matchedBy: 'name', candidates: lookup(index.byName, [name, name ? firstLabel(name) : null]) },
  ];

  for (const level of levels) {
    if (level.candidates.length === 1) {
      return { assetId: level.candidates[0], matchedBy: level.matchedBy, candidateAssetIds: [] };
    }
    if (level.candidates.length > 1) {
      return { assetId: null, matchedBy: null, candidateAssetIds: level.candidates };
    }
  }
  return { assetId: null, matchedBy: null, candidateAssetIds: [] };
}
