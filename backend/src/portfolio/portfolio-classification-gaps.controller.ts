import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { Tenant, TenantRequest } from '../common/decorators/tenant.decorator';
import { ClassificationGapsResponse } from './dto/classification-gaps.dto';
import { PortfolioClassificationGapsService } from './services/portfolio-classification-gaps.service';

@UseGuards(JwtAuthGuard)
@Controller('portfolio/reports')
export class PortfolioClassificationGapsController {
  constructor(private readonly svc: PortfolioClassificationGapsService) {}

  @UseGuards(PermissionGuard)
  @RequireLevel('portfolio_reports', 'reader')
  @Get('classification-gaps')
  getClassificationGaps(@Tenant() ctx: TenantRequest): Promise<ClassificationGapsResponse> {
    return this.svc.getGaps(ctx.tenantId, { manager: ctx.manager });
  }
}
