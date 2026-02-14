import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppInstance } from './app-instance.entity';
import { AppInstancesService } from './app-instances.service';
import { AppInstancesController } from './app-instances.controller';
import { Application } from '../applications/application.entity';
import { InterfaceBinding } from '../interface-bindings/interface-binding.entity';
import { AppAssetAssignment } from '../app-asset-assignments/app-asset-assignment.entity';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { ItOpsSettingsModule } from '../it-ops-settings/it-ops-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppInstance, Application, InterfaceBinding, AppAssetAssignment]),
    AuditModule,
    ItOpsSettingsModule,
    PermissionsModule,
    forwardRef(() => UsersModule),
  ],
  providers: [AppInstancesService],
  controllers: [AppInstancesController],
  exports: [AppInstancesService],
})
export class AppInstancesModule {}
