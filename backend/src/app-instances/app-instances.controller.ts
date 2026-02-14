import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { AppInstancesService } from './app-instances.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class AppInstancesController {
  constructor(private readonly svc: AppInstancesService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'reader')
  @Get('applications/:applicationId/instances')
  list(@Param('applicationId') applicationId: string, @Req() req: any) {
    return this.svc.list(applicationId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Post('applications/:applicationId/instances')
  create(@Param('applicationId') applicationId: string, @Body() body: any, @Req() req: any) {
    return this.svc.create(applicationId, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Patch('app-instances/:instanceId')
  update(@Param('instanceId') instanceId: string, @Body() body: any, @Req() req: any) {
    return this.svc.update(instanceId, body, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('applications', 'member')
  @Delete('app-instances/:instanceId')
  delete(@Param('instanceId') instanceId: string, @Req() req: any) {
    return this.svc.delete(instanceId, req.user?.sub ?? null, { manager: req?.queryRunner?.manager });
  }
}
