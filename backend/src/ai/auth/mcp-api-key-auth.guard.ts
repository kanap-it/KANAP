import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AiApiKeysService } from '../ai-api-keys.service';
import { TenantsService } from '../../tenants/tenants.service';

@Injectable()
export class McpApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeys: AiApiKeysService,
    private readonly tenants: TenantsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req: any = context.switchToHttp().getRequest();
    const rawKey = this.extractRawKey(req);
    if (!rawKey) {
      throw new UnauthorizedException('Missing MCP API key');
    }

    const authentication = await this.apiKeys.authenticatePresentedKey(rawKey, {
      tenantId: req?.tenant?.id ? String(req.tenant.id) : undefined,
    });
    const { apiKey, user } = authentication;

    if (req?.tenant?.id && req.tenant.id !== apiKey.tenant_id) {
      throw new UnauthorizedException('MCP API key tenant mismatch');
    }

    if (!req?.tenant?.id) {
      const tenant = await this.tenants.findById(apiKey.tenant_id);
      if (!tenant) {
        throw new UnauthorizedException('Tenant not found');
      }
      req.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      };
    }

    req.user = {
      sub: user?.id ?? apiKey.user_id,
      email: user?.email ?? null,
      authType: 'mcp',
      aiApiKeyId: apiKey.id,
    };
    req.aiApiKey = this.apiKeys.toView(apiKey);

    return true;
  }

  private extractRawKey(req: any): string | null {
    const authHeader = String(req?.headers?.authorization ?? '').trim();
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim();
      return token || null;
    }

    const apiKeyHeader = String(req?.headers?.['x-api-key'] ?? '').trim();
    return apiKeyHeader || null;
  }
}
