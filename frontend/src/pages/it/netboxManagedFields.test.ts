import { describe, expect, it } from 'vitest';
import { netboxFieldLock } from './netboxManagedFields';

const link = (over: Record<string, unknown> = {}) => ({
  state: 'linked' as const,
  managed_fields: null as string[] | null,
  ...over,
});

describe('netboxFieldLock', () => {
  it('locks nothing when the asset has no Netbox record', () => {
    const owns = netboxFieldLock(null);
    expect(owns('name')).toBe(false);
    expect(owns('hostname')).toBe(false);
  });

  it('locks nothing when the record is not linked', () => {
    const owns = netboxFieldLock(link({ state: 'missing' }));
    expect(owns('name')).toBe(false);
  });

  it('locks every field when the list is not known yet', () => {
    for (const record of [link(), link({ managed_fields: undefined })]) {
      const owns = netboxFieldLock(record as never);
      expect(owns('name')).toBe(true);
      expect(owns('domain')).toBe(true);
      expect(owns('fqdn')).toBe(true);
      expect(owns('rack_unit')).toBe(true);
    }
  });

  it('leaves a field Netbox does not provide editable', () => {
    const owns = netboxFieldLock(link({
      managed_fields: ['name', 'kind', 'location_id', 'hostname', 'status'],
    }));
    expect(owns('domain')).toBe(false);
    expect(owns('operating_system')).toBe(false);
    expect(owns('ip_addresses')).toBe(false);
    expect(owns('serial_number')).toBe(false);
    expect(owns('name')).toBe(true);
    expect(owns('hostname')).toBe(true);
    // The FQDN is computed, so it follows the host name and the domain.
    expect(owns('fqdn')).toBe(true);
  });

  it('leaves the computed FQDN editable when neither part is managed', () => {
    const owns = netboxFieldLock(link({ managed_fields: ['name', 'kind', 'location_id'] }));
    expect(owns('fqdn')).toBe(false);
  });

  it('locks a hardware field Netbox fills', () => {
    const owns = netboxFieldLock(link({ managed_fields: ['serial_number'] }));
    expect(owns('serial_number')).toBe(true);
    expect(owns('model')).toBe(false);
  });
});
