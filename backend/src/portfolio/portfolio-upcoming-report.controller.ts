import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { UpcomingReportResponse } from './dto/upcoming-report.dto';
import { parseCsvIds } from './services/portfolio-report-filters';
import { PortfolioUpcomingReportService } from './services/portfolio-upcoming-report.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/reports')
export class PortfolioUpcomingReportController {
  constructor(private readonly svc: PortfolioUpcomingReportService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('upcoming')
  getUpcoming(@Query() query: any, @Tenant() ctx: TenantRequest): Promise<UpcomingReportResponse> {
    return this.svc.getReport(
      ctx.tenantId,
      {
        taskDays: query?.taskDays,
        projectDays: query?.projectDays,
        requestDays: query?.requestDays,
        timeZone: String(query?.tz || '').trim() || undefined,
        projectIds: parseCsvIds(query?.projectIds),
        teamIds: parseCsvIds(query?.teamIds),
      },
      { manager: ctx.manager },
    );
  }
}
