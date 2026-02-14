import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/company.entity';
import { CompanyMetric } from '../companies/company-metric.entity';
import { Department } from '../departments/department.entity';
import { DepartmentMetric } from '../departments/department-metric.entity';
import { MasterDataOperationsController } from './master-data-operations.controller';
import { MasterDataOperationsService } from './master-data-operations.service';
import { CompaniesModule } from '../companies/companies.module';
import { DepartmentsModule } from '../departments/departments.module';
import { FreezeModule } from '../freeze/freeze.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, CompanyMetric, Department, DepartmentMetric]),
    CompaniesModule,
    DepartmentsModule,
    FreezeModule,
    PermissionsModule,
    UsersModule,
  ],
  controllers: [MasterDataOperationsController],
  providers: [MasterDataOperationsService],
})
export class MasterDataOperationsModule {}
