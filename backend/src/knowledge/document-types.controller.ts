import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { KnowledgeService } from './knowledge.service';

@UseGuards(JwtAuthGuard)
@Controller('knowledge-types')
export class DocumentTypesController {
  constructor(private readonly docs: KnowledgeService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'reader')
  @Get()
  list(@Tenant() ctx: TenantRequest) {
    return this.docs.listTypes({ manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'admin')
  @Post()
  create(@Body() body: any, @Tenant() ctx: TenantRequest) {
    return this.docs.createType(body, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Tenant() ctx: TenantRequest) {
    return this.docs.updateType(id, body, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'admin')
  @Delete(':id')
  remove(@Param('id') id: string, @Tenant() ctx: TenantRequest) {
    return this.docs.deleteType(id, { manager: ctx.manager });
  }
}
