import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { KnowledgeService } from './knowledge.service';

@UseGuards(JwtAuthGuard)
@Controller('knowledge-libraries')
export class DocumentLibrariesController {
  constructor(private readonly docs: KnowledgeService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'reader')
  @Get()
  list(@Tenant() ctx: TenantRequest) {
    return this.docs.listLibraries({ manager: ctx.manager, userId: ctx.userId || null });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'reader')
  @Get(':id')
  get(@Param('id') id: string, @Tenant() ctx: TenantRequest) {
    return this.docs.getLibrary(id, { manager: ctx.manager, userId: ctx.userId || null });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'member')
  @Post()
  create(@Body() body: any, @Tenant() ctx: TenantRequest) {
    return this.docs.createLibrary(body, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'admin')
  @Patch('reorder')
  reorder(@Body() body: { ids: string[] } | any, @Tenant() ctx: TenantRequest) {
    const ids = Array.isArray(body) ? body : body?.ids ?? [];
    return this.docs.reorderLibraries(ids, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'reader')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Tenant() ctx: TenantRequest) {
    return this.docs.updateLibrary(id, body, ctx.userId || null, { manager: ctx.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('knowledge', 'reader')
  @Delete(':id')
  remove(@Param('id') id: string, @Tenant() ctx: TenantRequest) {
    return this.docs.deleteLibrary(id, ctx.userId || null, { manager: ctx.manager });
  }
}
