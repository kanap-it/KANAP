import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './account.entity';
import { Company } from '../companies/company.entity';
import { ChartOfAccounts } from './chart-of-accounts.entity';
import { AccountsService } from './accounts.service';
import { AccountsDeleteService } from './accounts-delete.service';
import { AccountsController } from './accounts.controller';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { ChartOfAccountsController } from './chart-of-accounts.controller';
import { ChartOfAccountsDeleteService } from './chart-of-accounts-delete.service';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { forwardRef } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [TypeOrmModule.forFeature([Account, Company, ChartOfAccounts]), AuditModule, PermissionsModule, forwardRef(() => UsersModule), CommonModule],
  providers: [AccountsService, AccountsDeleteService, ChartOfAccountsService, ChartOfAccountsDeleteService],
  controllers: [AccountsController, ChartOfAccountsController],
  exports: [ChartOfAccountsService],
})
export class AccountsModule {}
