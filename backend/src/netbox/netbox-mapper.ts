import { CatalogOptionLike, findCatalogOption } from '../it-ops-settings/catalog-resolve';
import { NetboxNotice, netboxNotice } from './netbox-notice';
import { NetboxLocation, NetboxLocationIndex, NetboxObject, NetboxObjectType } from './netbox.types';
import { isRecord } from '../common/object-guards';
import { isValidHostname } from '../assets/hostname.util';

// Pure normalisation and mapping: Netbox JSON in, a KANAP asset/hardware patch
// out. No database, no HTTP, so the whole matrix is unit-testable.
//
// Two rules apply everywhere below:
//  - an empty Netbox value NEVER blanks a KANAP value (the key is simply left
//    out of the patch);
//  - a value Netbox reports but KANAP has no catalog entry for is skipped with
//    a warning, never invented.

export type CatalogOption = CatalogOptionLike;
export type DomainCatalogOption = { code: string; label?: string | null; dns_suffix?: string | null };
export type SubnetCatalogOption = { cidr: string };
export type LocationOption = {
  id: string;
  name: string;
  /** The location's hosting provider code, when it has one. */
  provider?: string | null;
};

export type NetboxCatalogs = {
  assetKinds: CatalogOption[];
  /** Hosting providers an asset may carry. Netbox knows nothing about them. */
  assetProviders: CatalogOption[];
  operatingSystems: CatalogOption[];
  lifecycleStates: CatalogOption[];
  ipAddressTypes: CatalogOption[];
  domains: DomainCatalogOption[];
  subnets: SubnetCatalogOption[];
  locations: LocationOption[];
};

export type NetboxMapOptions = {
  /** Netbox role slug -> KANAP asset kind code. An unmapped role is out of scope. */
  roleMap: Record<string, string>;
  /** Netbox site slug -> KANAP location id. An unmapped site is out of scope. */
  siteMap: Record<string, string>;
  /**
   * Netbox platform slug -> KANAP operating system code. Unlike the two maps
   * above this is NOT an import filter: an unmatched platform leaves the
   * operating system alone, it never puts the object out of scope.
   */
  osMap?: Record<string, string>;
  /** Written once, when the asset is created; never rewritten afterwards. */
  defaultEnvironment: string;
  catalogs: NetboxCatalogs;
  /**
   * Every Netbox Location by id, or null when Netbox did not return them this
   * run. Null disables sub-location handling entirely rather than attaching
   * equipment to a guessed level.
   */
  locations: NetboxLocationIndex | null;
};

export type MappedIpAddress = { type: string; ip: string; subnet_cidr: string | null };

export type MappedAssetFields = {
  name: string;
  kind: string;
  location_id: string;
  provider: string | null;
  status: string | null;
  hostname: string | null;
  domain: string | null;
  operating_system: string | null;
  ip_addresses: MappedIpAddress[] | null;
};

export type MappedHardwareFields = {
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  rack_location: string | null;
  rack_unit: string | null;
};

export type NetboxSkipReason = 'unmapped_role' | 'unmapped_site' | 'unnamed';

/**
 * The Netbox Location a mapped object should end up in, once walked up to the
 * top level. It carries no KANAP id: the sub-location may not exist yet, and
 * creating it is the apply step's job, inside the row's own transaction.
 */
export type NetboxSubLocationTarget = {
  externalId: string;
  name: string;
  description: string | null;
  url: string;
};

export type NetboxMapping = {
  object: NetboxObject;
  skipReason: NetboxSkipReason | null;
  asset: MappedAssetFields | null;
  hardware: MappedHardwareFields | null;
  /** The top-level Location this object belongs in; null when there is none. */
  subLocation: NetboxSubLocationTarget | null;
  /** Display value per stable diff key, so the UI never shows a code or a UUID. */
  display: Record<string, string | null>;
  warnings: NetboxNotice[];
};

// Netbox statuses, mapped once and for all. KANAP never lands on 'retired'
// from a sync: retiring an asset stays a human decision.
const NETBOX_STATUS_MAP: Record<string, string> = {
  planned: 'proposed',
  staged: 'proposed',
  inventory: 'proposed',
  active: 'active',
  offline: 'active',
  failed: 'active',
  paused: 'active',
  decommissioning: 'deprecated',
};

/**
 * Netbox statuses that leave the KANAP lifecycle on Active but say something
 * an administrator wants to see on the asset.
 */
const NETBOX_ATTENTION_STATUSES = new Set(['offline', 'failed', 'paused']);

function textOrNull(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function nestedText(value: unknown, key: string): string | null {
  return isRecord(value) ? textOrNull(value[key]) : null;
}

/**
 * Resolves a Netbox label against a KANAP catalog using the shared policy
 * (code or name, aliases and translated labels, ambiguity refused). The shared
 * helper throws on an ambiguous value; the mapper must stay total, so an
 * ambiguity is reported as "no match" and the caller explains it.
 */
export function matchCatalogOption<T extends CatalogOptionLike>(
  value: unknown,
  options: T[],
): { option: T | null; ambiguous: boolean } {
  try {
    return { option: findCatalogOption(value, options), ambiguous: false };
  } catch {
    return { option: null, ambiguous: true };
  }
}

/**
 * Lower-cased, with every run of non-alphanumeric characters reduced to a
 * single space, so "Debian 12 (bookworm)" and "debian_12" compare on the same
 * footing.
 */
function normalizeOsText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** True when `text` is `prefix`, or `prefix` followed by a boundary. */
function startsWithOsPrefix(text: string, prefix: string): boolean {
  return text === prefix || text.startsWith(`${prefix} `);
}

/**
 * The KANAP operating system a Netbox platform should be pre-filled with. The
 * exact match comes first; failing that, the catalog entry whose name or code
 * starts with the platform name at a word boundary, so "Debian 12" suggests
 * "Debian 12 (bookworm)" while "Debian 1" suggests nothing. Only a single
 * candidate is ever suggested: two mean the choice is the administrator's.
 */
export function suggestOperatingSystem<T extends CatalogOptionLike>(
  platformName: unknown,
  options: T[],
): T | null {
  const { option } = matchCatalogOption(platformName, options);
  if (option) return option;
  const prefix = normalizeOsText(platformName);
  if (!prefix) return null;
  const candidates = new Map<string, T>();
  for (const candidate of options) {
    const texts = [normalizeOsText(candidate.label), normalizeOsText(candidate.code)];
    if (texts.some((text) => startsWithOsPrefix(text, prefix))) {
      candidates.set(candidate.code, candidate);
    }
  }
  return candidates.size === 1 ? [...candidates.values()][0] : null;
}

/**
 * The operating system, with the notice a value KANAP cannot place deserves.
 * A saved match on the platform slug decides first; a match pointing at a code
 * the catalog no longer holds falls through to the name comparison, exactly as
 * if it had never been saved.
 */
function resolveOperatingSystem<T extends CatalogOptionLike>(
  object: NetboxObject,
  osMap: Record<string, string>,
  options: T[],
  warnings: NetboxNotice[],
): T | null {
  const mappedCode = object.platformSlug ? osMap[object.platformSlug] : undefined;
  if (mappedCode) {
    const mapped = options.find((option) => option.code === mappedCode);
    if (mapped) return mapped;
  }
  const value = object.platformName ?? object.platformSlug ?? '';
  const { option, ambiguous } = matchCatalogOption(value, options);
  if (option) return option;
  warnings.push(netboxNotice(ambiguous ? 'os_ambiguous' : 'os_not_in_catalog', { value }));
  return null;
}

function optionLabel(code: string | null, options: CatalogOption[]): string | null {
  if (!code) return null;
  return options.find((option) => option.code === code)?.label || code;
}

function ipv4ToInt(address: string): number | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255 || !/^\d{1,3}$/.test(part)) return null;
    result = (result << 8) | octet;
  }
  return result >>> 0;
}

/** True when an IPv4 address falls inside a CIDR block. */
export function ipv4InCidr(ip: string, cidr: string): boolean {
  const [network, prefixRaw] = String(cidr || '').split('/');
  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  if (ipInt == null || networkInt == null) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

function netboxObjectUrl(baseUrl: string, type: NetboxObjectType, id: string): string {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  return type === 'device' ? `${base}/dcim/devices/${id}/` : `${base}/virtualization/virtual-machines/${id}/`;
}

/** Deep link to a Location, used for the sub-location's external URL. */
export function netboxLocationUrl(baseUrl: string, id: string): string {
  const base = String(baseUrl || '').trim().replace(/\/+$/, '');
  return `${base}/dcim/locations/${id}/`;
}

/**
 * Flattens one Netbox Location. Only what the walk up to the top level needs:
 * the parent link, the name shown in KANAP, the description and the deep link.
 * `_depth` is deliberately not read — the parent chain answers the same
 * question for every Netbox version that has locations at all.
 */
export function normalizeNetboxLocation(
  raw: Record<string, unknown>,
  baseUrl: string,
): NetboxLocation {
  const id = textOrNull(raw.id) ?? '';
  return {
    id,
    name: textOrNull(raw.name) ?? textOrNull(raw.slug) ?? '',
    description: textOrNull(raw.description),
    parentId: nestedText(raw.parent, 'id'),
    siteSlug: nestedText(raw.site, 'slug'),
    url: netboxLocationUrl(baseUrl, id),
  };
}

/** How deep a broken parent chain may go before we call it a cycle. */
const MAX_LOCATION_DEPTH = 64;

/**
 * Walks up from a Location to the top-level one under its site, which is the
 * only level KANAP models. KANAP does not try to place equipment precisely:
 * site plus building is enough, so a device parked in "Building A > Floor 1 >
 * Room 101" belongs to "Building A".
 *
 * Returns null when the id is unknown, when the chain is broken, or when it
 * loops. All three mean the same thing to the caller: no target, nothing
 * written.
 */
export function rootNetboxLocation(
  index: NetboxLocationIndex | null,
  locationId: string | null,
): NetboxLocation | null {
  if (!index || !locationId) return null;
  const visited = new Set<string>();
  let current = index.get(String(locationId)) ?? null;
  let depth = 0;
  while (current) {
    if (visited.has(current.id) || depth >= MAX_LOCATION_DEPTH) return null;
    visited.add(current.id);
    if (!current.parentId) return current;
    current = index.get(String(current.parentId)) ?? null;
    depth += 1;
  }
  // The chain left the index: a parent Netbox did not return.
  return null;
}

/**
 * Flattens a Netbox device record. Netbox 3.6 renamed `device_role` to `role`;
 * both are read so an older instance still works.
 */
export function normalizeNetboxDevice(raw: Record<string, unknown>, baseUrl: string): NetboxObject {
  const role = isRecord(raw.role) ? raw.role : raw.device_role;
  const deviceType = isRecord(raw.device_type) ? raw.device_type : null;
  const id = textOrNull(raw.id) ?? '';
  return {
    type: 'device',
    id,
    name: textOrNull(raw.name),
    serial: textOrNull(raw.serial),
    roleSlug: nestedText(role, 'slug'),
    roleName: nestedText(role, 'name'),
    siteSlug: nestedText(raw.site, 'slug'),
    siteName: nestedText(raw.site, 'name'),
    status: nestedText(raw.status, 'value') ?? textOrNull(raw.status),
    platformName: nestedText(raw.platform, 'name'),
    platformSlug: nestedText(raw.platform, 'slug'),
    manufacturer: deviceType ? nestedText(deviceType.manufacturer, 'name') : null,
    model: deviceType ? textOrNull(deviceType.model) : null,
    rack: nestedText(raw.rack, 'name'),
    position: textOrNull(raw.position),
    primaryIp: nestedText(raw.primary_ip4, 'address') ?? nestedText(raw.primary_ip, 'address'),
    url: netboxObjectUrl(baseUrl, 'device', id),
    locationId: nestedText(raw.location, 'id'),
  };
}

/**
 * Every virtual machine is matched through this single reserved key, whatever
 * role Netbox gives it: one decision covers the lot, and a VM with no role at
 * all (which Netbox allows, and most instances leave empty) is not left out.
 * A Netbox slug can never contain a colon, so nothing can collide with it.
 */
export const NETBOX_VIRTUAL_MACHINES_SLUG = 'kanap:virtual-machines';
export const NETBOX_VIRTUAL_MACHINES_NAME = 'Virtual machines';

/** The key an earlier build wrote; read as the one above so saved matches keep working. */
export const NETBOX_LEGACY_VM_ROLE_SLUG = 'kanap:vm-no-role';

/**
 * Flattens a Netbox virtual machine. The machine's own Netbox role is not used
 * for the asset type — every VM goes through the reserved key above — but the
 * site matters, and a VM often gets it from the cluster it runs on instead of
 * carrying one itself.
 */
export function normalizeNetboxVirtualMachine(raw: Record<string, unknown>, baseUrl: string): NetboxObject {
  const id = textOrNull(raw.id) ?? '';
  const cluster = isRecord(raw.cluster) ? raw.cluster : null;
  const clusterSite = cluster
    ? (isRecord(cluster.scope) ? cluster.scope : (isRecord(cluster.site) ? cluster.site : null))
    : null;
  const site = isRecord(raw.site) ? raw.site : clusterSite;
  return {
    type: 'vm',
    id,
    name: textOrNull(raw.name),
    serial: null,
    roleSlug: NETBOX_VIRTUAL_MACHINES_SLUG,
    roleName: NETBOX_VIRTUAL_MACHINES_NAME,
    siteSlug: nestedText(site, 'slug'),
    siteName: nestedText(site, 'name'),
    status: nestedText(raw.status, 'value') ?? textOrNull(raw.status),
    platformName: nestedText(raw.platform, 'name'),
    platformSlug: nestedText(raw.platform, 'slug'),
    manufacturer: null,
    model: null,
    rack: null,
    position: null,
    primaryIp: nestedText(raw.primary_ip4, 'address') ?? nestedText(raw.primary_ip, 'address'),
    url: netboxObjectUrl(baseUrl, 'vm', id),
    // A Netbox virtual machine carries no location of its own.
    locationId: null,
  };
}

/**
 * The hosting provider of a new asset. Netbox has no such notion, so it comes
 * from the location, exactly as the asset form does it: the location's own
 * provider when it is a real provider code, otherwise "other", otherwise the
 * first entry of the catalog. The location's HOSTING TYPE is deliberately not
 * used as a fallback — it is a different catalog ("on premise" is a hosting
 * type, never a provider), and the asset service refuses a value that is not a
 * provider code.
 */
function mapProvider(location: LocationOption, providers: CatalogOption[]): string | null {
  const fromLocation = location.provider
    ? matchCatalogOption(location.provider, providers).option
    : null;
  if (fromLocation) return fromLocation.code;
  return providers.find((option) => option.code === 'other')?.code ?? providers[0]?.code ?? null;
}

/** Splits a Netbox name into a hostname and, when the suffix is known, a domain. */
function mapHostname(
  name: string,
  domains: DomainCatalogOption[],
  warnings: NetboxNotice[],
): { hostname: string | null; domain: string | null } {
  const lowered = name.trim().toLowerCase();
  const dot = lowered.indexOf('.');
  const shortname = dot > 0 ? lowered.slice(0, dot) : lowered;
  const suffix = dot > 0 ? lowered.slice(dot + 1) : null;

  let domain: string | null = null;
  if (suffix) {
    const match = domains.find((option) => String(option.dns_suffix || '').trim().toLowerCase() === suffix);
    if (match) {
      domain = match.code;
    } else {
      warnings.push(netboxNotice('domain_not_in_catalog', { value: suffix }));
    }
  }
  if (!isValidHostname(shortname)) {
    warnings.push(netboxNotice('hostname_invalid', { value: name }));
    return { hostname: null, domain };
  }
  return { hostname: shortname, domain };
}

function mapPrimaryIp(
  primaryIp: string,
  catalogs: NetboxCatalogs,
  warnings: NetboxNotice[],
): MappedIpAddress[] | null {
  const address = primaryIp.split('/')[0].trim();
  if (!address) return null;
  if (address.includes(':')) {
    // The asset IP catalog is IPv4 only, so an IPv6 primary is left out — but
    // an administrator should know why the address they see in Netbox did not
    // come across.
    warnings.push(netboxNotice('ipv6_skipped'));
    return null;
  }
  const type = matchCatalogOption('host', catalogs.ipAddressTypes).option ?? catalogs.ipAddressTypes[0] ?? null;
  if (!type) {
    warnings.push(netboxNotice('no_ip_address_type'));
    return null;
  }
  const subnet = catalogs.subnets.find((option) => ipv4InCidr(address, option.cidr)) ?? null;
  return [{ type: type.code, ip: address, subnet_cidr: subnet ? subnet.cidr : null }];
}

/**
 * Turns one Netbox object into the KANAP fields it owns. Returns a skip reason
 * instead of a patch when the object is out of scope: the role/site mapping is
 * the import filter, and an object without a name cannot become an asset.
 */
export function mapNetboxObject(object: NetboxObject, options: NetboxMapOptions): NetboxMapping {
  const warnings: NetboxNotice[] = [];
  const { catalogs } = options;

  const skipped = (skipReason: NetboxSkipReason): NetboxMapping => ({
    object,
    skipReason,
    asset: null,
    hardware: null,
    subLocation: null,
    display: {},
    warnings,
  });

  const name = textOrNull(object.name);
  if (!name) {
    return skipped('unnamed');
  }
  const kindCode = object.roleSlug ? options.roleMap[object.roleSlug] : undefined;
  if (!kindCode || !catalogs.assetKinds.some((option) => option.code === kindCode)) {
    return skipped('unmapped_role');
  }
  const locationId = object.siteSlug ? options.siteMap[object.siteSlug] : undefined;
  const location = locationId ? catalogs.locations.find((entry) => entry.id === locationId) ?? null : null;
  if (!location) {
    return skipped('unmapped_site');
  }

  const { hostname, domain } = mapHostname(name, catalogs.domains, warnings);

  // Netbox says the machine is down; KANAP still calls the asset active, but
  // the record carries the fact so the workspace can show it.
  if (object.status && NETBOX_ATTENTION_STATUSES.has(object.status)) {
    warnings.push(netboxNotice('netbox_status_attention', { value: object.status }));
  }

  let status: string | null = null;
  const mappedStatus = object.status ? NETBOX_STATUS_MAP[object.status] ?? null : null;
  if (object.status && !mappedStatus) {
    warnings.push(netboxNotice('status_not_mapped', { value: object.status }));
  } else if (mappedStatus && !catalogs.lifecycleStates.some((option) => option.code === mappedStatus)) {
    warnings.push(netboxNotice('lifecycle_not_in_catalog', { value: mappedStatus }));
  } else {
    status = mappedStatus;
  }

  const operatingSystem = object.platformName || object.platformSlug
    ? resolveOperatingSystem(object, options.osMap ?? {}, catalogs.operatingSystems, warnings)?.code ?? null
    : null;

  const ipAddresses = object.primaryIp ? mapPrimaryIp(object.primaryIp, catalogs, warnings) : null;

  const asset: MappedAssetFields = {
    name,
    kind: kindCode,
    location_id: location.id,
    provider: mapProvider(location, catalogs.assetProviders),
    status,
    hostname,
    domain,
    operating_system: operatingSystem,
    ip_addresses: ipAddresses,
  };

  const hardware: MappedHardwareFields = {
    serial_number: object.serial,
    manufacturer: object.manufacturer,
    model: object.model,
    rack_location: object.rack,
    rack_unit: object.position,
  };

  // The only level KANAP keeps. A device parked deeper is attached to the
  // top-level location above it, which is why the walk happens here and not on
  // the raw `_depth`.
  const root = rootNetboxLocation(options.locations, object.locationId);
  // A Location without a name cannot become a sub-location, and must not cost
  // the equipment its import.
  const subLocation: NetboxSubLocationTarget | null = root && root.name
    ? {
      externalId: root.id,
      name: root.name,
      description: root.description,
      url: root.url,
    }
    : null;

  return {
    object,
    skipReason: null,
    asset,
    hardware,
    subLocation,
    display: {
      name,
      kind: optionLabel(kindCode, catalogs.assetKinds),
      location: location.name,
      status: optionLabel(status, catalogs.lifecycleStates),
      hostname,
      domain: optionLabel(domain, catalogs.domains),
      operating_system: optionLabel(operatingSystem, catalogs.operatingSystems),
      primary_ip: ipAddresses ? ipAddresses[0].ip : null,
      serial_number: hardware.serial_number,
      manufacturer: hardware.manufacturer,
      model: hardware.model,
      rack_location: hardware.rack_location,
      rack_unit: hardware.rack_unit,
    },
    warnings,
  };
}
