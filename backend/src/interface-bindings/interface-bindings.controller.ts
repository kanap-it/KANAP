import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { InterfaceBindingsService } from './interface-bindings.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class InterfaceBindingsController {
  constructor(private readonly svc: InterfaceBindingsService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('interfaces/:interfaceId/bindings')
  list(@Param('interfaceId') interfaceId: string, @Req() req: any) {
    return this.svc.list(interfaceId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post('interfaces/:interfaceId/bindings')
  create(@Param('interfaceId') interfaceId: string, @Body() body: any, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.create(interfaceId, body, tenantId ?? '', req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Patch('interface-bindings/:bindingId')
  update(@Param('bindingId') bindingId: string, @Body() body: any, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.update(bindingId, body, tenantId ?? '', req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete('interface-bindings/:bindingId')
  delete(@Param('bindingId') bindingId: string, @Req() req: any) {
    return this.svc.delete(bindingId, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('interface-bindings/:bindingId/connection-links')
  listConnectionLinks(@Param('bindingId') bindingId: string, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.listConnectionLinks(bindingId, tenantId ?? '', { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post('interface-bindings/:bindingId/connection-links')
  createConnectionLink(@Param('bindingId') bindingId: string, @Body() body: any, @Req() req: any) {
    const tenantId: string | undefined = req?.tenant?.id;
    return this.svc.createConnectionLink(
      bindingId,
      body,
      tenantId ?? '',
      req.user?.sub ?? null,
      { manager: req?.queryRunner?.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete('interface-bindings/:bindingId/connection-links/:linkId')
  deleteConnectionLink(
    @Param('bindingId') bindingId: string,
    @Param('linkId') linkId: string,
    @Req() req: any,
  ) {
    return this.svc.deleteConnectionLink(bindingId, linkId, req.user?.sub ?? null, {
      manager: req?.queryRunner?.manager,
    });
  }
}
