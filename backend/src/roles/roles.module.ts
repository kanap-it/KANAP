import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './role.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { RolePermission } from '../permissions/role-permission.entity';
import { UsersModule } from '../users/users.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission, User]), forwardRef(() => UsersModule), PermissionsModule],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
