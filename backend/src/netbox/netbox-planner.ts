import { AssetExternalLinkState } from './asset-external-link.entity';
import {
  CatalogOption,
  MappedAssetFields,
  MappedHardwareFields,
  NetboxCatalogs,
  NetboxMapping,
} from './netbox-mapper';
import { NetboxNotice, netboxNotice } from './netbox-notice';
import {
  ExistingAsset,
  NetboxMatchedBy,
  buildMatcherIndex,
  matchNetboxObject,
} from './netbox-matcher';
import { NetboxObjectType } from './netbox.types';

// Pure planner: mapped objects + the tenant's assets and existing links in,
// one decision per Netbox object out. It diffs against the CURRENT asset
// values rather than a stored hash, so a field someone edited by hand in KANAP
// is put back in line at the next run instead of being silently skipped.

export type NetboxPlanAction = 'create' | 'update' | 'unchanged' | 'ambiguous' | 'skipped';
export type NetboxSkipCause = 'unmapped_role' | 'unmapped_site' | 'unnamed' | 'ignored';

/** What a person settled in the preview for one object; it overrides the cascade. */
export type NetboxDecisionAction = 'link' | 'create' | 'ignore';
export type NetboxDecision = {
  external_type: NetboxObjectType;
  external_id: string;
  action: NetboxDecisionAction;
  /** The asset to link to; only read for 'link'. */
  asset_id?: string;
};

export type NetboxAssetRef = { id: string; name: string; asset_reference: string | null };

export type NetboxFieldDiff = { field: string; before: string | null; after: string | null };

export type NetboxPlanRow = {
  external_type: NetboxObjectType;
  external_id: string;
  external_name: string | null;
  external_url: string;
  /** The raw status Netbox reports; KANAP's lifecycle does not follow it. */
  external_status: string | null;
  action: NetboxPlanAction;
  asset: NetboxAssetRef | null;
  matched_by: NetboxMatchedBy | null;
  candidates: NetboxAssetRef[];
  diffs: NetboxFieldDiff[];
  skip_reason: NetboxSkipCause | null;
  warnings: NetboxNotice[];
  /** The decision that shaped this row, when a person made one. */
  decision: NetboxDecisionAction | null;
};

export type NetboxSyncCounts = {
  create: number;
  update: number;
  unchanged: number;
  ambiguous: number;
  skipped: number;
  missing: number;
  error: number;
};

export type ExistingLink = {
  id: string;
  external_type: string;
  external_id: string;
  asset_id: string | null;
  state: AssetExternalLinkState;
};

export type NetboxPlan = {
  rows: NetboxPlanRow[];
  /** Links whose Netbox object was not seen this run; empty when the guard trips. */
  missing: ExistingLink[];
  counts: NetboxSyncCounts;
  /** Per-row map from the plan row to what the apply step has to write. */
  writes: Map<string, NetboxPlanWrite>;
};

export type NetboxPlanWrite = {
  asset: MappedAssetFields;
  hardware: MappedHardwareFields;
  assetId: string | null;
};

export function externalKey(type: string, id: string): string {
  return `${type}:${id}`;
}

/**
 * Assets a Netbox object owns, as a map from asset id to the object that owns
 * it. Only a live link owns one: a record already flagged as gone, or whose
 * object is absent from the fetch we are planning against, does not. That is
 * what lets a device deleted and recreated in Netbox — it comes back under a
 * new id — be picked up again by its host name instead of turning into a
 * duplicate asset.
 */
export function claimedAssets(links: ExistingLink[], seenKeys: Set<string> | null): Map<string, string> {
  const owners = new Map<string, string>();
  for (const link of links) {
    if (link.state !== 'linked' || !link.asset_id) continue;
    const key = externalKey(link.external_type, link.external_id);
    if (seenKeys != null && !seenKeys.has(key)) continue;
    owners.set(link.asset_id, key);
  }
  return owners;
}

function emptyCounts(): NetboxSyncCounts {
  return { create: 0, update: 0, unchanged: 0, ambiguous: 0, skipped: 0, missing: 0, error: 0 };
}

function optionLabel(code: string | null | undefined, options: CatalogOption[]): string | null {
  if (!code) return null;
  return options.find((option) => option.code === code)?.label || code;
}

function assetRef(asset: ExistingAsset | undefined): NetboxAssetRef | null {
  return asset ? { id: asset.id, name: asset.name, asset_reference: asset.asset_reference } : null;
}

function sameText(left: string | null, right: string | null): boolean {
  return String(left ?? '').trim().toLowerCase() === String(right ?? '').trim().toLowerCase();
}

/**
 * Whether a Netbox name is a real rename of the asset name. A difference in
 * case is not one, and neither is the DNS suffix: KANAP names assets by their
 * short name and keeps the domain in its own field, so "par-esx-01" and
 * "par-esx-01.fromage.lan" are the same machine, not a rename.
 */
function isRename(currentName: string, netboxName: string): boolean {
  const current = currentName.trim().toLowerCase();
  const next = netboxName.trim().toLowerCase();
  if (current === next) return false;
  const shorten = (value: string) => (value.indexOf('.') > 0 ? value.slice(0, value.indexOf('.')) : value);
  return shorten(current) !== shorten(next);
}

function firstIp(asset: ExistingAsset): string | null {
  const entries = Array.isArray(asset.ip_addresses) ? asset.ip_addresses : [];
  return entries.length > 0 ? entries[0].ip : null;
}

/**
 * Field-by-field difference between what Netbox reports and what the asset
 * currently holds. An empty Netbox value produces no difference: it must never
 * blank a KANAP value. A name that differs only in case is not a rename.
 */
export function diffNetboxMapping(
  mapping: NetboxMapping,
  asset: ExistingAsset,
  catalogs: NetboxCatalogs,
): NetboxFieldDiff[] {
  const mapped = mapping.asset;
  const hardware = mapping.hardware;
  if (!mapped || !hardware) return [];

  const diffs: NetboxFieldDiff[] = [];
  const add = (field: string, changed: boolean, before: string | null, after: string | null) => {
    if (changed) diffs.push({ field, before, after });
  };

  add('name', isRename(asset.name, mapped.name), asset.name, mapped.name);
  add('kind', asset.kind !== mapped.kind,
    optionLabel(asset.kind, catalogs.assetKinds), optionLabel(mapped.kind, catalogs.assetKinds));

  const beforeLocation = catalogs.locations.find((entry) => entry.id === asset.location_id)?.name ?? null;
  const afterLocation = catalogs.locations.find((entry) => entry.id === mapped.location_id)?.name ?? null;
  add('location', asset.location_id !== mapped.location_id, beforeLocation, afterLocation);

  if (mapped.status) {
    add('status', asset.status !== mapped.status,
      optionLabel(asset.status, catalogs.lifecycleStates), optionLabel(mapped.status, catalogs.lifecycleStates));
  }
  if (mapped.hostname) {
    add('hostname', !sameText(asset.hostname, mapped.hostname), asset.hostname, mapped.hostname);
  }
  if (mapped.domain) {
    add('domain', asset.domain !== mapped.domain,
      optionLabel(asset.domain, catalogs.domains), optionLabel(mapped.domain, catalogs.domains));
  }
  if (mapped.operating_system) {
    add('operating_system', asset.operating_system !== mapped.operating_system,
      optionLabel(asset.operating_system, catalogs.operatingSystems),
      optionLabel(mapped.operating_system, catalogs.operatingSystems));
  }
  if (mapped.ip_addresses && mapped.ip_addresses.length > 0) {
    const wanted = mapped.ip_addresses[0].ip;
    const held = (asset.ip_addresses ?? []).some((entry) => entry.ip === wanted);
    add('primary_ip', !held, firstIp(asset), wanted);
  }

  for (const [field, value] of Object.entries({
    serial_number: hardware.serial_number,
    manufacturer: hardware.manufacturer,
    model: hardware.model,
    rack_location: hardware.rack_location,
    rack_unit: hardware.rack_unit,
  })) {
    if (!value) continue;
    const before = (asset as unknown as Record<string, string | null>)[field] ?? null;
    add(field, !sameText(before, value), before, value);
  }

  return diffs;
}

/**
 * Plans a whole run. `fetchOk` and `totalObjects` drive the "missing" guard:
 * a failed fetch, or a Netbox that returned nothing at all, must never make
 * the whole inventory look like it disappeared.
 */
export function planNetboxSync(input: {
  mappings: NetboxMapping[];
  links: ExistingLink[];
  assets: ExistingAsset[];
  catalogs: NetboxCatalogs;
  fetchOk: boolean;
  totalObjects: number;
  /** Choices made in the preview. An object out of scope ignores its own. */
  decisions?: NetboxDecision[];
}): NetboxPlan {
  const { mappings, links, assets, catalogs } = input;
  const decisionsByKey = new Map(
    (input.decisions ?? []).map((decision) => [externalKey(decision.external_type, decision.external_id), decision]),
  );
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const linksByKey = new Map(links.map((link) => [externalKey(link.external_type, link.external_id), link]));
  const seen = new Set(mappings.map((mapping) => externalKey(mapping.object.type, mapping.object.id)));
  const missingGuardApplies = input.fetchOk && input.totalObjects > 0;

  // An asset another Netbox object already owns is off the table: it is kept
  // out of the index entirely, so the cascade can neither match it nor offer
  // it as a candidate. The object that owns it still reaches it directly,
  // through its own link. When the fetch is trustworthy, a record whose object
  // Netbox no longer lists releases its asset in the same breath as it becomes
  // "missing", so a recreated object can take it over in this very run.
  const owners = claimedAssets(links, missingGuardApplies ? seen : null);
  const index = buildMatcherIndex(assets.filter((asset) => !owners.has(asset.id)));

  // Pass one decides, pass two writes the rows: a decision can still be turned
  // into an ambiguity by another object landing on the same asset.
  type Decision = {
    key: string;
    mapping: NetboxMapping;
    base: NetboxPlanRow;
    skip: NetboxSkipCause | null;
    match: ReturnType<typeof matchNetboxObject> | null;
    /** A chosen asset that turned out to belong to another object. */
    heldElsewhere?: boolean;
  };

  const decisions: Decision[] = [];

  for (const mapping of mappings) {
    const key = externalKey(mapping.object.type, mapping.object.id);
    const link = linksByKey.get(key) ?? null;

    const base: NetboxPlanRow = {
      external_type: mapping.object.type,
      external_id: mapping.object.id,
      external_name: mapping.object.name,
      external_url: mapping.object.url,
      external_status: mapping.object.status,
      action: 'skipped',
      asset: null,
      matched_by: null,
      candidates: [],
      diffs: [],
      skip_reason: null,
      warnings: mapping.warnings,
      decision: null,
    };

    // Scope comes first: a decision cannot pull in an object the role and site
    // matches leave out, there would be nothing to build the asset from.
    if (mapping.skipReason) {
      decisions.push({ key, mapping, base, skip: mapping.skipReason, match: null });
      continue;
    }
    const decided = decisionsByKey.get(key) ?? null;
    if (decided?.action === 'ignore') {
      decisions.push({ key, mapping, base: { ...base, decision: 'ignore' }, skip: 'ignored', match: null });
      continue;
    }
    if (decided?.action === 'create') {
      decisions.push({
        key, mapping, base: { ...base, decision: 'create' }, skip: null,
        match: { assetId: null, matchedBy: null, candidateAssetIds: [] },
      });
      continue;
    }
    if (decided?.action === 'link' && decided.asset_id && assetsById.has(decided.asset_id)) {
      // The preview refuses a link to an asset another object holds. A run
      // that still meets one (the link appeared in between) asks again rather
      // than giving the asset a second owner.
      const heldBy = owners.get(decided.asset_id);
      const free = heldBy === undefined || heldBy === key;
      decisions.push({
        key, mapping, base: { ...base, decision: 'link' }, skip: null,
        match: free
          ? { assetId: decided.asset_id, matchedBy: 'manual', candidateAssetIds: [] }
          : { assetId: null, matchedBy: null, candidateAssetIds: [decided.asset_id] },
        heldElsewhere: !free,
      });
      continue;
    }
    if (link?.state === 'ignored') {
      decisions.push({ key, mapping, base, skip: 'ignored', match: null });
      continue;
    }

    // One predicate decides whether a record still binds its object to its
    // asset: the asset must exist, and no OTHER object's live record may own
    // it. A record that was flagged missing or failed, whose asset has since
    // been taken over by another Netbox object, therefore goes back through
    // the cascade — and since an owned asset is out of the index, it comes out
    // as a create or an ambiguity rather than as a second owner.
    const owner = link?.asset_id ? owners.get(link.asset_id) : undefined;
    const boundAssetId = link?.asset_id
      && assetsById.has(link.asset_id)
      && (owner === undefined || owner === key)
      ? link.asset_id
      : null;
    decisions.push({ key, mapping, base, skip: null, match: matchNetboxObject(mapping, boundAssetId, index) });
  }

  // Two Netbox objects reaching the same asset: neither wins, both go to a
  // person with that asset as the candidate. Link matches are counted too, so
  // that two stored records pointing at one asset cannot both be written.
  const contested = new Set<string>();
  const reachedBy = new Map<string, number>();
  for (const decision of decisions) {
    const assetId = decision.match?.assetId;
    if (!assetId) continue;
    const count = (reachedBy.get(assetId) ?? 0) + 1;
    reachedBy.set(assetId, count);
    if (count > 1) contested.add(assetId);
  }

  const rows: NetboxPlanRow[] = [];
  const writes = new Map<string, NetboxPlanWrite>();
  const counts = emptyCounts();

  for (const { key, mapping, base, skip, match, heldElsewhere } of decisions) {
    if (skip || !match) {
      rows.push({ ...base, skip_reason: skip });
      counts.skipped += 1;
      continue;
    }

    const contestedAsset = match.assetId && contested.has(match.assetId) ? match.assetId : null;
    // An address suggestion pointing at an asset another object of this run
    // reaches on firmer ground is not worth a question: that asset is taken.
    const candidateIds = contestedAsset
      ? [contestedAsset]
      : match.suggestedByIp
        ? match.candidateAssetIds.filter((id) => !reachedBy.has(id))
        : match.candidateAssetIds;
    if (candidateIds.length > 0) {
      rows.push({
        ...base,
        action: 'ambiguous',
        candidates: candidateIds
          .map((id) => assetRef(assetsById.get(id)))
          .filter((ref): ref is NetboxAssetRef => ref != null),
        warnings: [
          ...base.warnings,
          contestedAsset || heldElsewhere
            ? netboxNotice('contested_asset')
            : match.suggestedByIp
              ? netboxNotice('ip_match_candidates', { value: match.suggestedByIp })
              : netboxNotice('ambiguous_candidates'),
        ],
      });
      counts.ambiguous += 1;
      continue;
    }

    const write: NetboxPlanWrite = {
      asset: mapping.asset as MappedAssetFields,
      hardware: mapping.hardware as MappedHardwareFields,
      assetId: match.assetId,
    };
    writes.set(key, write);

    if (!match.assetId) {
      rows.push({ ...base, action: 'create' });
      counts.create += 1;
      continue;
    }

    const asset = assetsById.get(match.assetId);
    const diffs = asset ? diffNetboxMapping(mapping, asset, catalogs) : [];
    const action: NetboxPlanAction = diffs.length > 0 ? 'update' : 'unchanged';
    rows.push({ ...base, action, asset: assetRef(asset), matched_by: match.matchedBy, diffs });
    counts[action] += 1;
  }

  // Objects a previous run linked and Netbox no longer lists. Never computed
  // when the fetch failed or came back empty: that is an outage, not a
  // decommissioning.
  const missing = missingGuardApplies
    ? links.filter((link) =>
      link.state === 'linked'
      && !seen.has(externalKey(link.external_type, link.external_id)))
    : [];
  counts.missing = missing.length;

  return { rows, missing, counts, writes };
}
