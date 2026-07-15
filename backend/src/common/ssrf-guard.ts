import { BadRequestException } from '@nestjs/common';
import { lookup } from 'dns/promises';
import { BlockList, isIP } from 'net';
import { Features } from '../config/features';

// Single source of truth for the outbound-target SSRF guard. Blocks private /
// internal / link-local ranges so a tenant-supplied URL cannot reach internal
// services (RFC1918, loopback, cloud metadata, CGNAT, IPv6 ULA/link-local).
const DISALLOWED_ADDRESS_BLOCKLIST = new BlockList();
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('0.0.0.0', 8, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('10.0.0.0', 8, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('100.64.0.0', 10, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('127.0.0.0', 8, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('169.254.0.0', 16, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('172.16.0.0', 12, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('192.0.0.0', 24, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('192.0.2.0', 24, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('192.168.0.0', 16, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('198.18.0.0', 15, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('198.51.100.0', 24, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('203.0.113.0', 24, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('224.0.0.0', 4, 'ipv4');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('::', 128, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('::1', 128, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('fc00::', 7, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('fe80::', 10, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('ff00::', 8, 'ipv6');
DISALLOWED_ADDRESS_BLOCKLIST.addSubnet('2001:db8::', 32, 'ipv6');

export type LookupFn = (
  hostname: string,
  options: { all: true; verbatim: true },
) => Promise<Array<{ address: string }>>;

export type PublicHttpTargetOptions = {
  // Default: enforce in multi-tenant cloud, skip in single-tenant / on-prem where
  // private RFC1918 / localhost / internal-DNS targets (GLPI, Ollama, PRTG) are legitimate.
  enforcePrivateBlock?: boolean;
  lookupFn?: LookupFn; // test seam; defaults to the real DNS resolver
};

function shouldEnforce(opts?: PublicHttpTargetOptions): boolean {
  return opts?.enforcePrivateBlock ?? !Features.SINGLE_TENANT;
}

function stripBrackets(host: string): string {
  // Node's URL.hostname wraps IPv6 literals in brackets, e.g. "[::1]".
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (!family) return false;
  return DISALLOWED_ADDRESS_BLOCKLIST.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

function parseHttpUrl(target: string | URL): URL {
  let parsed: URL;
  if (target instanceof URL) {
    parsed = target;
  } else {
    const normalized = String(target || '').trim();
    if (!normalized) throw new BadRequestException('A URL is required.');
    try {
      parsed = new URL(normalized);
    } catch {
      throw new BadRequestException('Value must be a valid HTTP(S) URL.');
    }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Only http:// or https:// URLs are supported.');
  }
  if (parsed.username || parsed.password) {
    throw new BadRequestException('URLs must not include embedded credentials.');
  }
  return parsed;
}

function assertHostLiteral(hostname: string): void {
  const raw = String(hostname || '').trim().toLowerCase();
  if (!raw) throw new BadRequestException('Invalid target host.');
  const host = stripBrackets(raw); // unbracket so isIP()/BlockList detect IPv6 literals
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new BadRequestException('Private or internal hosts are not allowed.');
  }
  if (isBlockedAddress(host)) {
    throw new BadRequestException('Private or internal hosts are not allowed.');
  }
}

// Sync guard for config-save time: parse + protocol + credentials always; literal-IP /
// localhost blocklist when enforcing. No DNS (won't reject bare DNS names or fail on
// transient resolution). Returns the parsed URL.
export function assertPublicHttpUrl(target: string | URL, opts?: PublicHttpTargetOptions): URL {
  const url = parseHttpUrl(target);
  if (shouldEnforce(opts)) assertHostLiteral(url.hostname);
  return url;
}

// Full guard for immediately before an outbound fetch: sync checks + DNS resolution of
// every A/AAAA record against the blocklist.
export async function assertPublicHttpTarget(
  target: string | URL,
  opts?: PublicHttpTargetOptions,
): Promise<URL> {
  const url = parseHttpUrl(target);
  if (!shouldEnforce(opts)) return url;
  assertHostLiteral(url.hostname);
  const lookupFn = opts?.lookupFn ?? (lookup as unknown as LookupFn);
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookupFn(stripBrackets(url.hostname), { all: true, verbatim: true });
  } catch {
    throw new BadRequestException('Unable to resolve target host.');
  }
  if (!addresses.length) throw new BadRequestException('Unable to resolve target host.');
  if (addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new BadRequestException('Private or internal hosts are not allowed.');
  }
  return url;
}
