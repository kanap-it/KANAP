import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { TimeLoggedReportResponse } from './dto/time-logged-report.dto';
import { parseCsvIds } from './services/portfolio-report-filters';
import { PortfolioTimeLoggedReportService } from './services/portfolio-time-logged-report.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/reports')
export class PortfolioTimeLoggedReportController {
  constructor(private readonly svc: PortfolioTimeLoggedReportService) {}

  /** Days logged by month, team and person: counts only, never the notes of an entry. */
  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('time-logged')
  getTimeLogged(@Query() query: any, @Tenant() ctx: TenantRequest): Promise<TimeLoggedReportResponse> {
    return this.svc.getReport(
      ctx.tenantId,
      {
        months: query?.months,
        timeZone: String(query?.tz || '').trim() || undefined,
        projectIds: parseCsvIds(query?.projectIds),
        teamIds: parseCsvIds(query?.teamIds),
      },
      { manager: ctx.manager },
    );
  }
}
