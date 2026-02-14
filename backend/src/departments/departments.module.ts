import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './department.entity';
import { DepartmentsService } from './departments.service';
import { DepartmentsDeleteService } from './departments-delete.service';
import { DepartmentsController } from './departments.controller';
import { Company } from '../companies/company.entity';
import { AuditModule } from '../audit/audit.module';
import { DepartmentMetric } from './department-metric.entity';
import { DepartmentMetricsService } from './department-metrics.service';
import { DepartmentMetricsController } from './department-metrics.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { forwardRef } from '@nestjs/common';
import { FreezeModule } from '../freeze/freeze.module';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Company, DepartmentMetric]), AuditModule, PermissionsModule, forwardRef(() => UsersModule), FreezeModule],
  providers: [DepartmentsService, DepartmentsDeleteService, DepartmentMetricsService],
  controllers: [DepartmentsController, DepartmentMetricsController],
  exports: [DepartmentMetricsService],
})
export class DepartmentsModule {}
