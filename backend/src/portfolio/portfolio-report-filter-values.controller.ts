import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import {
  PortfolioReportFilterValuesService,
  ReportFilterValues,
} from './services/portfolio-report-filter-values.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/reports')
export class PortfolioReportFilterValuesController {
  constructor(private readonly svc: PortfolioReportFilterValuesService) {}

  /** The project and team options of the report filters, under the reports' permission. */
  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('filter-values')
  list(@Tenant() ctx: TenantRequest): Promise<ReportFilterValues> {
    return this.svc.list(ctx.tenantId, { manager: ctx.manager });
  }
}
