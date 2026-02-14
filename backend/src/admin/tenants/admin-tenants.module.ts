import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../../tenants/tenant.entity';
import { TrialSignup } from '../../public/trial-signup.entity';
import { AdminTenantsController } from './admin-tenants.controller';
import { AdminTenantsService } from './admin-tenants.service';
import { TenantStatsService } from './tenant-stats.service';
import { BillingModule } from '../../billing/billing.module';
import { AuditModule } from '../../audit/audit.module';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { StorageModule } from '../../common/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TrialSignup]), BillingModule, AuditModule, StorageModule],
  controllers: [AdminTenantsController],
  providers: [AdminTenantsService, TenantStatsService, PlatformAdminGuard],
})
export class AdminTenantsModule {}
