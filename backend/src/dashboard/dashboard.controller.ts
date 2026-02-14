import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardDataService } from './dashboard-data.service';
import { UpdateDashboardConfigDto } from './dto/update-dashboard-config.dto';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly svc: DashboardService,
    private readonly dataSvc: DashboardDataService,
  ) {}

  // ==================== CONFIG ENDPOINTS ====================
  // These use JwtAuthGuard only - user's own data

  /**
   * Get user's dashboard configuration (or default if none exists)
   */
  @Get('config')
  async getConfig(@Tenant() ctx: TenantRequest) {
    return this.svc.getConfig(ctx.userId!, { manager: ctx.manager });
  }

  /**
   * Save user's dashboard configuration
   */
  @Put('config')
  async saveConfig(
    @Tenant() ctx: TenantRequest,
    @Body() dto: UpdateDashboardConfigDto,
  ) {
    return this.svc.saveConfig(ctx.userId!, dto, { manager: ctx.manager });
  }

  /**
   * Reset user's dashboard configuration to defaults
   */
  @Post('config/reset')
  async resetConfig(@Tenant() ctx: TenantRequest) {
    return this.svc.resetConfig(ctx.userId!, { manager: ctx.manager });
  }

  // ==================== TILE DATA ENDPOINTS ====================
  // These require specific permissions based on the data they access

  /**
   * Get projects where the current user is a lead or sponsor
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get('my-leadership-projects')
  async getMyLeadershipProjects(
    @Query('limit') limit: string = '5',
    @Tenant() ctx: TenantRequest,
  ) {
    return this.dataSvc.getMyLeadershipProjects(
      ctx.userId!,
      parseInt(limit, 10) || 5,
      { manager: ctx.manager },
    );
  }

  /**
   * Get projects where the current user is a team member (but not lead/sponsor)
   * Includes count of tasks assigned to the user
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get('my-contribution-projects')
  async getMyContributionProjects(
    @Query('limit') limit: string = '5',
    @Tenant() ctx: TenantRequest,
  ) {
    return this.dataSvc.getMyContributionProjects(
      ctx.userId!,
      parseInt(limit, 10) || 5,
      { manager: ctx.manager },
    );
  }

  /**
   * Get time summary for the current user over the specified number of days
   * Includes time from both task time entries and direct project time entries
   */
  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'reader')
  @Get('time-summary')
  async getTimeSummary(
    @Query('days') days: string = '7',
    @Tenant() ctx: TenantRequest,
  ) {
    return this.dataSvc.getTimeSummary(
      ctx.userId!,
      parseInt(days, 10) || 7,
      { manager: ctx.manager },
    );
  }
}
