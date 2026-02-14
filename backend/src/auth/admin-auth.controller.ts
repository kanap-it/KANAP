import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionGuard } from './permission.guard';
import { RequireLevel } from './require-level.decorator';
import { TenantsService } from '../tenants/tenants.service';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly tenants: TenantsService) {}

  @Get('settings')
  @RequireLevel('users', 'admin')
  async getSettings(@Req() req: any) {
    if (req?.isPlatformHost) {
      throw new BadRequestException('SSO is not available on the platform admin host');
    }
    const tenantMeta = req?.tenant;
    if (!tenantMeta?.id) {
      throw new BadRequestException('TENANT_REQUIRED');
    }
    const tenant = await this.tenants.findById(tenantMeta.id);
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }
    return {
      sso_provider: tenant.sso_provider ?? 'none',
      entra_tenant_id: tenant.entra_tenant_id ?? null,
      sso_enabled: !!tenant.sso_enabled,
      entra_metadata: tenant.entra_metadata ?? null,
    };
  }

  @Post('disconnect')
  @RequireLevel('users', 'admin')
  async disconnect(@Req() req: any, @Body() _body: any) {
    if (req?.isPlatformHost) {
      throw new BadRequestException('SSO is not available on the platform admin host');
    }
    const tenantMeta = req?.tenant;
    if (!tenantMeta?.id) {
      throw new BadRequestException('TENANT_REQUIRED');
    }

    const tenant = await this.tenants.findById(tenantMeta.id);
    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    await this.tenants.updateTenant(tenant.id, {
      sso_provider: 'none' as any,
      sso_enabled: false as any,
      entra_tenant_id: null as any,
      entra_metadata: null as any,
    });

    return { ok: true };
  }
}
