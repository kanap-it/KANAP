import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserRole } from './user-role.entity';
import { Company } from '../companies/company.entity';
import { Department } from '../departments/department.entity';
import { UsersService } from './users.service';
import { UsersDeleteService } from './users-delete.service';
import { UsersController } from './users.controller';
import { AuditModule } from '../audit/audit.module';
import { RolesModule } from '../roles/roles.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { BillingModule } from '../billing/billing.module';
import { EmailModule } from '../email/email.module';
import { Role } from '../roles/role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRole, Company, Department, Role]), AuditModule, RolesModule, forwardRef(() => BillingModule), forwardRef(() => PermissionsModule), EmailModule],
  providers: [UsersService, UsersDeleteService],
  controllers: [UsersController],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
