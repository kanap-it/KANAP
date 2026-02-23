import { Global, Module } from '@nestjs/common';
import { AdminOpsController } from './admin-ops.controller';
import { OpsMetricsStore } from './ops-metrics.store';
import { DbMetricsService } from './db-metrics.service';

@Global() // Global so main.ts can resolve OpsMetricsStore for the middleware
@Module({
  controllers: [AdminOpsController],
  providers: [OpsMetricsStore, DbMetricsService],
  exports: [OpsMetricsStore],
})
export class AdminOpsModule {}
