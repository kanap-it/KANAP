import type { AssetExternalLink } from '../../api/endpoints/assets';

/**
 * Asset and hardware fields Netbox can own on a linked asset. A field outside
 * this list is never locked, whatever the record says.
 */
export const NETBOX_LOCKABLE_ASSET_FIELDS = [
  'name', 'kind', 'location_id', 'status', 'hostname', 'domain', 'fqdn',
  'operating_system', 'ip_addresses',
] as const;

export type NetboxLockableField =
  | (typeof NETBOX_LOCKABLE_ASSET_FIELDS)[number]
  | 'serial_number' | 'manufacturer' | 'model' | 'rack_location' | 'rack_unit';

/**
 * Tells, field by field, whether Netbox owns the value on this asset.
 *
 * Netbox has no domain notion, often no platform and sometimes no primary
 * address. A field it says nothing about is left to the administrator: the
 * synchronisation never writes an empty value, so what they type there is
 * never overwritten. If Netbox starts providing the value, the next run adds
 * the field to the record and it locks again.
 *
 * `managed_fields` is absent on a record written before the list existed, or
 * not synchronised since: the whole list is locked, exactly as before.
 * `fqdn` is computed from the host name and the domain, so it follows them.
 */
export function netboxFieldLock(
  link: Pick<AssetExternalLink, 'state' | 'managed_fields'> | null | undefined,
): (field: NetboxLockableField) => boolean {
  if (!link || link.state !== 'linked') return () => false;
  const managed = link.managed_fields;
  if (!managed) return () => true;
  const set = new Set(managed);
  return (field) => (field === 'fqdn'
    ? set.has('hostname') || set.has('domain')
    : set.has(field));
}
