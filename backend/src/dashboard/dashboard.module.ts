import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDashboardConfig } from './user-dashboard-config.entity';
import { DashboardService } from './dashboard.service';
import { DashboardDataService } from './dashboard-data.service';
import { DashboardController } from './dashboard.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDashboardConfig]),
    PermissionsModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardDataService],
  exports: [DashboardService, DashboardDataService],
})
export class DashboardModule {}
