import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequireLevel } from '../auth/require-level.decorator';
import { MasterDataOperationsService } from './master-data-operations.service';

@UseGuards(JwtAuthGuard)
@Controller('master-data-operations')
export class MasterDataOperationsController {
  constructor(private readonly svc: MasterDataOperationsService) {}

  @Post('copy')
  @UseGuards(PermissionGuard)
  @RequireLevel('budget_ops', 'admin')
  async copy(@Body() body: any, @Req() req: any) {
    const manager = req?.queryRunner?.manager;
    const userId = req?.user?.sub ?? null;
    const includeCompanies = String(body?.includeCompanies ?? 'false').toLowerCase() === 'true';
    const includeDepartments = String(body?.includeDepartments ?? 'false').toLowerCase() === 'true';
    const dryRun = String(body?.dryRun ?? 'true').toLowerCase() === 'true';
    const metrics = Array.isArray(body?.companyMetrics)
      ? body.companyMetrics.map((m: any) => String(m))
      : [];

    return this.svc.copyMasterData({
      sourceYear: Number(body?.sourceYear),
      destinationYear: Number(body?.destinationYear),
      includeCompanies,
      includeDepartments,
      companyMetrics: metrics,
      dryRun,
      userId,
    }, { manager });
  }
}
