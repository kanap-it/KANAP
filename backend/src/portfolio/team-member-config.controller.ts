import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { TeamMemberConfigService } from './team-member-config.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/team-members')
export class TeamMemberConfigController {
  constructor(private readonly svc: TeamMemberConfigService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'reader')
  @Get()
  list(@Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.svc.list(tenantId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('tasks', 'reader')
  @Get('by-user/:userId')
  getByUser(@Param('userId') userId: string, @Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.svc.getByUserId(userId, tenantId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'reader')
  @Get('time-stats')
  getAllTimeStats(@Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    return this.svc.getAllTimeStats(tenantId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'reader')
  @Get(':id/time-stats')
  getTimeStats(@Param('id') id: string, @Req() req: any) {
    return this.svc.getTimeStats(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'reader')
  @Get(':id/time-entries')
  listTimeEntries(@Param('id') id: string, @Req() req: any) {
    return this.svc.listTimeEntries(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'reader')
  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.svc.get(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'member')
  @Post()
  create(@Body() body: any, @Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    const userId = req?.user?.id ?? null;
    return this.svc.create(body, tenantId, userId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'member')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const userId = req?.user?.id ?? null;
    return this.svc.update(id, body, userId, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'member')
  @Post('by-user/:userId')
  upsertByUser(@Param('userId') targetUserId: string, @Body() body: any, @Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    const userId = req?.user?.id ?? null;
    return this.svc.upsertByUser(targetUserId, body, tenantId, userId, {
      manager: req?.queryRunner?.manager,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'admin')
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.id ?? null;
    return this.svc.delete(id, userId, { manager: req?.queryRunner?.manager });
  }
}
