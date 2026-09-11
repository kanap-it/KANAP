import {
  Body,
  Controller,
  Delete,
  Get,
  UnauthorizedException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireAnyLevel, RequireLevel } from '../auth/require-level.decorator';
import { EntityManager } from 'typeorm';
import { resolveToUuid } from '../common/resolve-item-id';
import { TeamMemberConfigService } from './team-member-config.service';

const PORTFOLIO_READER_REQUIREMENTS = [
  { resource: 'tasks', level: 'reader' as const },
  { resource: 'portfolio_requests', level: 'reader' as const },
  { resource: 'portfolio_projects', level: 'reader' as const },
  { resource: 'portfolio_planning', level: 'reader' as const },
  { resource: 'portfolio_reports', level: 'reader' as const },
  { resource: 'portfolio_settings', level: 'reader' as const },
];

@UseGuards(JwtAuthGuard)
@Controller('portfolio/team-members')
export class TeamMemberConfigController {
  constructor(private readonly svc: TeamMemberConfigService) {}

  /** `:id` routes accept the row UUID or the CTR-N business reference. */
  private resolveId(idOrRef: string, req: any): Promise<string> {
    return resolveToUuid(idOrRef, 'contributor', req?.queryRunner?.manager as EntityManager);
  }

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
  @RequireAnyLevel(PORTFOLIO_READER_REQUIREMENTS)
  @Get('me')
  getMe(@Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    const userId = req?.user?.id ?? req?.user?.sub;
    if (!userId) throw new UnauthorizedException('User context is required');
    return this.svc.getMe(userId, tenantId, { manager: req?.queryRunner?.manager });
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
  async getTimeStats(@Param('id') idOrRef: string, @Req() req: any) {
    const id = await this.resolveId(idOrRef, req);
    return this.svc.getTimeStats(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'reader')
  @Get(':id/time-entries')
  async listTimeEntries(@Param('id') idOrRef: string, @Req() req: any) {
    const id = await this.resolveId(idOrRef, req);
    return this.svc.listTimeEntries(id, { manager: req?.queryRunner?.manager });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'reader')
  @Get(':id')
  async get(@Param('id') idOrRef: string, @Req() req: any) {
    const id = await this.resolveId(idOrRef, req);
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
  @RequireAnyLevel(PORTFOLIO_READER_REQUIREMENTS)
  @Patch('me')
  updateMe(@Body() body: any, @Req() req: any) {
    const tenantId = req?.tenant?.id ?? '';
    const userId = req?.user?.id ?? req?.user?.sub ?? null;
    if (!userId) throw new UnauthorizedException('User context is required');
    const safeBody = {
      areas_of_expertise: body?.areas_of_expertise,
      skills: body?.skills,
      project_availability: body?.project_availability,
      notes: body?.notes,
      default_source_id: body?.default_source_id,
      default_category_id: body?.default_category_id,
      default_stream_id: body?.default_stream_id,
      default_company_id: body?.default_company_id,
    };

    return this.svc.upsertMe(userId, safeBody, tenantId, userId, {
      manager: req?.queryRunner?.manager,
    });
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_settings', 'member')
  @Patch(':id')
  async update(@Param('id') idOrRef: string, @Body() body: any, @Req() req: any) {
    const id = await this.resolveId(idOrRef, req);
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
  async delete(@Param('id') idOrRef: string, @Req() req: any) {
    const id = await this.resolveId(idOrRef, req);
    const userId = req?.user?.id ?? null;
    return this.svc.delete(id, userId, { manager: req?.queryRunner?.manager });
  }
}
