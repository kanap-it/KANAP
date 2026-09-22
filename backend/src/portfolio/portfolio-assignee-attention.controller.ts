import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { AssigneeAttentionResponse } from './dto/assignee-attention.dto';
import { parseCsvIds } from './services/portfolio-report-filters';
import { PortfolioAssigneeAttentionService } from './services/portfolio-assignee-attention.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/reports')
export class PortfolioAssigneeAttentionController {
  constructor(private readonly svc: PortfolioAssigneeAttentionService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('attention-by-assignee')
  getAttentionByAssignee(@Query() query: any, @Tenant() ctx: TenantRequest): Promise<AssigneeAttentionResponse> {
    return this.svc.getReport(
      ctx.tenantId,
      {
        staleDays: query?.staleDays,
        timeZone: String(query?.tz || '').trim() || undefined,
        projectIds: parseCsvIds(query?.projectIds),
        teamIds: parseCsvIds(query?.teamIds),
      },
      { manager: ctx.manager },
    );
  }
}
