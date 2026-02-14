import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsCategory } from './analytics-category.entity';
import { AnalyticsCategoriesService } from './analytics-categories.service';
import { AnalyticsCategoriesController } from './analytics-categories.controller';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AnalyticsCategory]),
    AuditModule,
    PermissionsModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [AnalyticsCategoriesController],
  providers: [AnalyticsCategoriesService],
  exports: [AnalyticsCategoriesService],
})
export class AnalyticsModule {}
