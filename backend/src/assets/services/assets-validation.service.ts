import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ItOpsSettingsService } from '../../it-ops-settings/it-ops-settings.service';

/**
 * Service for validating asset fields against IT Ops settings.
 */
@Injectable()
export class AssetsValidationService {
  constructor(private readonly itOpsSettings: ItOpsSettingsService) {}

  normalizeNullable(value: unknown): string | null {
    if (value == null) return null;
    const text = String(value).trim();
    return text.length === 0 ? null : text;
  }

  async resolveKind(
    value: unknown,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const code = String(value || '').trim().toLowerCase();
    if (!code) {
      throw new BadRequestException('kind is required');
    }
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.serverKinds || []).map((o) => o.code));
    if (!allowed.has(code)) {
      throw new BadRequestException(`Invalid kind "${value}"`);
    }
    return code;
  }

  async resolveProvider(
    value: unknown,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<string> {
    const code = String(value || '').trim().toLowerCase();
    if (!code) {
      throw new BadRequestException('provider is required');
    }
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.serverProviders || []).map((o) => o.code));
    if (!allowed.has(code)) {
      throw new BadRequestException(`Invalid provider "${value}"`);
    }
    return code;
  }

  async resolveOperatingSystem(
    value: unknown,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<string | null> {
    const normalized = this.normalizeNullable(value);
    if (!normalized) return null;
    const code = normalized.toLowerCase();
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set((settings.operatingSystems || []).map((o) => o.code));
    if (!allowed.has(code)) {
      throw new BadRequestException(`Invalid operating system "${value}"`);
    }
    return code;
  }

  async resolveDomain(
    value: unknown,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<string | null> {
    const normalized = this.normalizeNullable(value);
    if (!normalized) return null;
    const code = normalized.toLowerCase();
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = new Set(((settings as any).domains || []).map((d: any) => d.code));
    if (!allowed.has(code)) {
      throw new BadRequestException(`Invalid domain "${value}"`);
    }
    return code;
  }

  validateHostname(value: string | null): boolean {
    if (!value) return true;
    const hostname = value.trim();
    if (hostname.length === 0) return true;
    if (hostname.length > 63) return false;
    const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
    return pattern.test(hostname);
  }

  async computeFqdn(
    hostname: string | null,
    domainCode: string | null,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<string | null> {
    if (!hostname || !hostname.trim()) return null;
    const cleanHostname = hostname.trim().toLowerCase();

    if (!domainCode || domainCode === 'workgroup' || domainCode === 'n-a') {
      return cleanHostname;
    }

    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const domain = ((settings as any).domains || []).find((d: any) => d.code === domainCode);

    if (!domain || !domain.dns_suffix) {
      return cleanHostname;
    }

    return `${cleanHostname}.${domain.dns_suffix}`;
  }

  normalizeAliases(value: unknown): string[] | null {
    if (!value) return null;
    if (!Array.isArray(value)) return null;
    const aliases = value
      .map((v) => String(v || '').trim().toLowerCase())
      .filter((v) => v.length > 0);
    return aliases.length > 0 ? aliases : null;
  }

  ipBelongsToSubnet(ip: string, cidr: string): boolean {
    try {
      const [networkAddr, prefixStr] = cidr.split('/');
      const prefix = parseInt(prefixStr, 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

      const ipToInt = (addr: string): number => {
        const parts = addr.split('.').map(Number);
        if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
          return -1;
        }
        return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
      };

      const ipInt = ipToInt(ip);
      const networkInt = ipToInt(networkAddr);
      if (ipInt === -1 || networkInt === -1) return false;

      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      return ((ipInt >>> 0) & mask) === ((networkInt >>> 0) & mask);
    } catch {
      return false;
    }
  }

  async validateIpAddresses(
    value: unknown,
    tenantId: string,
    manager?: EntityManager,
  ): Promise<Array<{ type: string; ip: string; subnet_cidr: string | null }> | null> {
    if (value == null) return null;
    if (!Array.isArray(value)) return null;

    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowedTypes = new Set((settings.ipAddressTypes || []).map((t) => t.code));
    const allowedSubnets = new Set((settings.subnets || []).map((s) => s.cidr));

    const normalized: Array<{ type: string; ip: string; subnet_cidr: string | null }> = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const type = String((item as any).type || '').trim().toLowerCase();
      const ip = String((item as any).ip || '').trim();
      const subnet_cidr = (item as any).subnet_cidr ? String((item as any).subnet_cidr).trim() : null;

      if (!ip) continue;

      if (!type || !allowedTypes.has(type)) {
        throw new BadRequestException(`Invalid IP address type "${type}"`);
      }

      if (subnet_cidr && !allowedSubnets.has(subnet_cidr)) {
        throw new BadRequestException(`Invalid subnet "${subnet_cidr}"`);
      }

      if (subnet_cidr && !this.ipBelongsToSubnet(ip, subnet_cidr)) {
        throw new BadRequestException(
          `IP address "${ip}" does not belong to subnet "${subnet_cidr}"`,
        );
      }

      normalized.push({ type, ip, subnet_cidr: subnet_cidr || null });
    }

    return normalized.length > 0 ? normalized : null;
  }

  async normalizeLifecycleStatus(
    value: unknown,
    tenantId: string,
    manager?: EntityManager,
    fallback: string = 'active',
  ): Promise<string> {
    const settings = await this.itOpsSettings.getSettings(tenantId, { manager });
    const allowed = (settings.lifecycleStates || []).map((item) => item.code);
    const fallbackCode = this.pickLifecycleFallback(fallback, allowed);
    if (value === undefined || value === null || String(value).trim() === '') {
      return fallbackCode;
    }
    const normalized = String(value).trim().toLowerCase();
    if (!allowed.includes(normalized)) {
      throw new BadRequestException(`Invalid lifecycle "${value}"`);
    }
    return normalized;
  }

  private pickLifecycleFallback(candidate: string | undefined, allowed: string[]): string {
    const normalized = String(candidate || '').trim().toLowerCase();
    if (normalized && allowed.includes(normalized)) {
      return normalized;
    }
    if (allowed.includes('active')) {
      return 'active';
    }
    return allowed[0] || 'active';
  }
}
