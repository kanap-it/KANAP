import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { OpsMetricsStore } from './ops-metrics.store';
import { DbMetricsService } from './db-metrics.service';
import type { OpsSnapshotDto } from './dto/ops-snapshot.dto';

@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/ops')
export class AdminOpsController {
  constructor(
    private readonly metricsStore: OpsMetricsStore,
    private readonly dbMetrics: DbMetricsService,
  ) {}

  @Get('snapshot')
  async snapshot(): Promise<OpsSnapshotDto> {
    const [requestSnapshot, dbSnapshot] = await Promise.all([
      this.metricsStore.snapshot(),
      this.dbMetrics.snapshot(),
    ]);

    return {
      ...requestSnapshot,
      db: dbSnapshot,
      generatedAt: Date.now(),
    };
  }
}
