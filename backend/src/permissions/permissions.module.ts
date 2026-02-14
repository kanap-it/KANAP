import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPageRole } from './user-page-role.entity';
import { PermissionsService } from './permissions.service';
import { UsersModule } from '../users/users.module';
import { PermissionGuard } from '../auth/permission.guard';
import { RolePermission } from './role-permission.entity';
import { StripeConfigService } from '../billing/stripe/stripe.config';

@Module({
  imports: [TypeOrmModule.forFeature([UserPageRole, RolePermission]), forwardRef(() => UsersModule)],
  providers: [PermissionsService, PermissionGuard, StripeConfigService],
  exports: [PermissionsService, PermissionGuard, StripeConfigService, TypeOrmModule],
})
export class PermissionsModule {}
