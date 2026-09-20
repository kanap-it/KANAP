/**
 * The single definition of what a KANAP asset host name may look like.
 *
 * A host name is one or more RFC 1123 labels separated by single dots. Real
 * inventories carry device names such as `DL3.ROBOT-15MS.IE2000`, where the
 * dots are part of the name and not a DNS domain, so a dotted value has to be
 * accepted. A plain single-label name such as `srv01` stays valid.
 *
 * Both the asset services and the Netbox mapper use this predicate, so there
 * is one rule and not two.
 */

/** One RFC 1123 label: letters, digits and hyphens, never starting or ending with a hyphen. */
const HOSTNAME_LABEL_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;

/** Longest a whole host name may be. */
export const HOSTNAME_MAX_LENGTH = 253;

/** Longest one label (one dot-separated part) may be. */
export const HOSTNAME_LABEL_MAX_LENGTH = 63;

export function isValidHostname(value: string): boolean {
  if (value.length === 0 || value.length > HOSTNAME_MAX_LENGTH) return false;
  const labels = value.split('.');
  return labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= HOSTNAME_LABEL_MAX_LENGTH &&
      HOSTNAME_LABEL_RE.test(label),
  );
}
