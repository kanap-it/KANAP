import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { RoadmapApplyInput, RoadmapGenerateInput } from './dto/roadmap.dto';
import { PortfolioRoadmapService } from './services/portfolio-roadmap.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class PortfolioRoadmapController {
  constructor(private readonly roadmapService: PortfolioRoadmapService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Post('reports/roadmap/generate')
  generateRoadmap(
    @Body() body: RoadmapGenerateInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.roadmapService.generateRoadmap(
      ctx.tenantId,
      body,
      { manager: ctx.manager },
    );
  }

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_projects', 'contributor')
  @Post('projects/planning/roadmap/apply')
  applyRoadmapDates(
    @Body() body: RoadmapApplyInput,
    @Tenant() ctx: TenantRequest,
  ) {
    return this.roadmapService.applyDates(
      ctx.tenantId,
      body,
      ctx.userId || null,
      { manager: ctx.manager },
    );
  }
}
