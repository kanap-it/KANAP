import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { ConnectionsService } from './services';

@UseGuards(JwtAuthGuard)
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly svc: ConnectionsService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'reader')
  @Get()
  list(@Query() query: any, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.list(tenantId ?? '', query, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'reader')
  @Get('map')
  map(@Req() req: any, @Query() query: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.map(tenantId ?? '', query, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'reader')
  @Get('by-server/:serverId')
  listByServer(@Param('serverId') serverId: string, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.listByServer(serverId, tenantId ?? '', { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'reader')
  @Get(':id/interface-links')
  listInterfaceLinks(@Param('id') id: string, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.listInterfaceLinks(id, tenantId ?? '', { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'reader')
  @Get(':id/legs')
  listLegs(@Param('id') id: string, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.listLegs(id, tenantId ?? '', { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'member')
  @Put(':id/legs')
  replaceLegs(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.replaceLegs(id, tenantId ?? '', body, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'reader')
  @Get(':id')
  get(@Param('id') id: string, @Req() req: any, @Query('include') include?: string | string[]) {
    const tenantId: string | undefined = req?.tenant?.id;
    const includeList = Array.isArray(include)
      ? include.map((v) => String(v || '')).join(',')
      : String(include || '');
    const includeLegs = includeList
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .includes('legs');
    return this.svc.get(id, tenantId ?? '', { manager: req?.queryRunner?.manager, includeLegs });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'member')
  @Post()
  create(@Body() body: any, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.create(body, tenantId ?? '', req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'member')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.update(id, body, tenantId ?? '', req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'admin')
  @Delete('bulk')
  bulkDelete(@Body() body: { ids: string[] }, @Req() req: any) {
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    return this.svc.bulkDelete(ids, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('infrastructure', 'member')
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.svc.delete(id, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }
}
