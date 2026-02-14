import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppAssetAssignment } from './app-asset-assignment.entity';
import { AppAssetAssignmentsService } from './app-asset-assignments.service';
import { AppAssetAssignmentsController } from './app-asset-assignments.controller';
import { AppInstance } from '../app-instances/app-instance.entity';
import { Asset } from '../assets/asset.entity';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { ItOpsSettingsModule } from '../it-ops-settings/it-ops-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AppAssetAssignment, AppInstance, Asset]),
    AuditModule,
    PermissionsModule,
    forwardRef(() => UsersModule),
    ItOpsSettingsModule,
  ],
  providers: [AppAssetAssignmentsService],
  controllers: [AppAssetAssignmentsController],
})
export class AppAssetAssignmentsModule {}
