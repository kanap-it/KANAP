import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators';
import { AuditLogsService } from './audit-logs.service';

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly svc: AuditLogsService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  @Get()
  list(@Query() query: any, @Tenant() ctx: TenantRequest) {
    return this.svc.list(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  @Get('filter-values')
  listFilterValues(@Query() query: any, @Tenant() ctx: TenantRequest) {
    return this.svc.listFilterValues(query, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('users', 'admin')
  @Get(':id')
  getById(@Param('id') id: string, @Tenant() ctx: TenantRequest) {
    return this.svc.getById(id, { manager: ctx.manager });
  }
}
