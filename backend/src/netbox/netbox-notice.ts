// Every message the Netbox pages show about a record or a planned change is a
// structured notice, not a sentence: the UI runs in four languages and
// translates by code. `text` carries the English wording so an unknown code
// still reads properly, and this file is the only place that wording lives.
//
// Connection-level strings (the test result, a run's error, the preview's own
// message, HTTP error bodies) stay plain English, like the PRTG and GLPI
// cards.

export type NetboxNoticeCode =
  // --- decisions waiting for a person ---
  | 'ambiguous_candidates'
  | 'contested_asset'
  | 'missing_from_netbox'
  | 'reevaluate_next_sync'
  // --- values KANAP could not take over ---
  | 'os_not_in_catalog'
  | 'os_ambiguous'
  | 'domain_not_in_catalog'
  | 'hostname_invalid'
  | 'status_not_mapped'
  | 'lifecycle_not_in_catalog'
  | 'ipv6_skipped'
  | 'ip_conflict_skipped'
  | 'subnet_not_in_catalog'
  | 'no_ip_address_type'
  // --- run-level trouble ---
  | 'fetch_incomplete'
  | 'save_failed'
  | 'validation_failed';

export type NetboxNotice = {
  code: NetboxNoticeCode;
  params: Record<string, string>;
  /** English wording, rebuilt from the code; the UI falls back to it. */
  text: string;
};

const TEXTS: Record<NetboxNoticeCode, (params: Record<string, string>) => string> = {
  ambiguous_candidates: () =>
    'Several assets could be this object. Choose one, or create a new asset.',
  contested_asset: () =>
    'Two Netbox objects match this asset. Choose which one it is.',
  missing_from_netbox: () =>
    'This object is no longer in Netbox. Decide whether the asset should be retired.',
  reevaluate_next_sync: () =>
    'This object will be evaluated again at the next synchronisation.',
  os_not_in_catalog: (p) =>
    `The operating system "${p.value}" is not in the IT settings, so it was left unchanged.`,
  os_ambiguous: (p) =>
    `The operating system "${p.value}" matches more than one entry in the IT settings, so it was left unchanged.`,
  domain_not_in_catalog: (p) =>
    `The domain "${p.value}" is not in the IT settings, so it was left unchanged.`,
  hostname_invalid: (p) =>
    `"${p.value}" cannot be used as a host name, so the host name was left unchanged.`,
  status_not_mapped: (p) =>
    `The Netbox status "${p.value}" has no equivalent in KANAP, so the status was left unchanged.`,
  lifecycle_not_in_catalog: (p) =>
    `The lifecycle "${p.value}" is not in the IT settings, so the status was left unchanged.`,
  ipv6_skipped: () =>
    'The primary address is IPv6, which KANAP does not record yet, so it was left out.',
  ip_conflict_skipped: (p) =>
    `The address ${p.value} is already used by another asset, so it was left out.`,
  subnet_not_in_catalog: (p) =>
    `The subnet of ${p.value} is not in the IT settings, so the address was imported without one.`,
  no_ip_address_type: () =>
    'No IP address type is set up in the IT settings, so the address was not imported.',
  fetch_incomplete: () =>
    'Netbox returned more pages than KANAP reads in one run, so the objects beyond them were not looked at.',
  save_failed: () =>
    'KANAP could not save this object. The technical details are in the server log.',
  validation_failed: (p) =>
    `KANAP refused to save this object: ${p.detail}`,
};

const CODES = new Set(Object.keys(TEXTS));

/** Builds a notice, English wording included. */
export function netboxNotice(code: NetboxNoticeCode, params: Record<string, string> = {}): NetboxNotice {
  return { code, params, text: TEXTS[code](params) };
}

/**
 * Rebuilds a notice from what the database holds. An unknown code (a record
 * written by a newer build) degrades to a neutral sentence rather than an
 * empty message.
 */
export function netboxNoticeFromStore(
  code: unknown,
  params: unknown,
): NetboxNotice | null {
  const normalized = typeof code === 'string' ? code.trim() : '';
  if (!normalized) return null;
  const safeParams: Record<string, string> = {};
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      if (value != null) safeParams[key] = String(value);
    }
  }
  if (!CODES.has(normalized)) {
    return { code: normalized as NetboxNoticeCode, params: safeParams, text: 'This object needs attention.' };
  }
  return netboxNotice(normalized as NetboxNoticeCode, safeParams);
}
