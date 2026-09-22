import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { FlowReportResponse } from './dto/flow-report.dto';
import { PortfolioFlowReportService } from './services/portfolio-flow-report.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/reports')
export class PortfolioFlowReportController {
  constructor(private readonly svc: PortfolioFlowReportService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('flow')
  getFlowReport(@Query() query: any, @Tenant() ctx: TenantRequest): Promise<FlowReportResponse> {
    return this.svc.getReport(
      ctx.tenantId,
      { weeks: query?.weeks, timeZone: String(query?.tz || '').trim() || undefined },
      { manager: ctx.manager },
    );
  }
}
