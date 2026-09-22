import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { SteeringSummaryResponse } from './dto/steering-summary.dto';
import { PortfolioSteeringSummaryService } from './services/portfolio-steering-summary.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/reports')
export class PortfolioSteeringSummaryController {
  constructor(private readonly svc: PortfolioSteeringSummaryService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('steering-summary')
  getSteeringSummary(@Query() query: any, @Tenant() ctx: TenantRequest): Promise<SteeringSummaryResponse> {
    return this.svc.getSummary(
      ctx.tenantId,
      { days: query?.days, timeZone: String(query?.tz || '').trim() || undefined },
      { manager: ctx.manager },
    );
  }
}
