import { describe, expect, it } from 'vitest';
import { NETBOX_ATTENTION_STATUSES, isNetboxAttentionStatus } from './netbox';

/**
 * This predicate is the single decision behind the asset workspace's
 * "Netbox status: …" segment, so the cases it must get right are pinned here.
 */
describe('isNetboxAttentionStatus', () => {
  it('flags the three statuses the owner asked to surface', () => {
    expect(isNetboxAttentionStatus('offline')).toBe(true);
    expect(isNetboxAttentionStatus('failed')).toBe(true);
    expect(isNetboxAttentionStatus('paused')).toBe(true);
    expect(NETBOX_ATTENTION_STATUSES).toEqual(['offline', 'failed', 'paused']);
  });

  it('stays quiet for every other Netbox status', () => {
    for (const status of ['active', 'planned', 'staged', 'inventory', 'decommissioning']) {
      expect(isNetboxAttentionStatus(status)).toBe(false);
    }
  });

  it('stays quiet when an older backend omits the field', () => {
    expect(isNetboxAttentionStatus(null)).toBe(false);
    expect(isNetboxAttentionStatus(undefined)).toBe(false);
    expect(isNetboxAttentionStatus('')).toBe(false);
  });
});
