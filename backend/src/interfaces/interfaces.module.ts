import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterfaceEntity } from './interface.entity';
import { InterfaceLeg } from './interface-leg.entity';
import { InterfaceMiddlewareApplication } from './interface-middleware-application.entity';
import { InterfaceOwner } from './interface-owner.entity';
import { InterfaceCompany } from './interface-company.entity';
import { InterfaceDependency } from './interface-dependency.entity';
import { InterfaceKeyIdentifier } from './interface-key-identifier.entity';
import { InterfaceLink } from './interface-link.entity';
import { InterfaceAttachment } from './interface-attachment.entity';
import { InterfaceDataResidency } from './interface-data-residency.entity';
import { InterfacesController } from './interfaces.controller';
import { InterfaceBinding } from '../interface-bindings/interface-binding.entity';
import { Application } from '../applications/application.entity';
import { AppInstance } from '../app-instances/app-instance.entity';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { ItOpsSettingsModule } from '../it-ops-settings/it-ops-settings.module';
import { StorageModule } from '../common/storage/storage.module';

// Decomposed services
import {
  InterfacesService,
  InterfacesListService,
  InterfacesCrudService,
  InterfaceBindingsManagementService,
  InterfaceSyncService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InterfaceEntity,
      InterfaceLeg,
      InterfaceMiddlewareApplication,
      InterfaceOwner,
      InterfaceCompany,
      InterfaceDependency,
      InterfaceKeyIdentifier,
      InterfaceLink,
      InterfaceAttachment,
      InterfaceDataResidency,
      InterfaceBinding,
      Application,
      AppInstance,
    ]),
    AuditModule,
    PermissionsModule,
    forwardRef(() => UsersModule),
    ItOpsSettingsModule,
    StorageModule,
  ],
  providers: [
    // Decomposed services (order matters for DI)
    InterfacesListService,
    InterfacesCrudService,
    InterfaceBindingsManagementService,
    InterfaceSyncService,
    // Main facade service
    InterfacesService,
  ],
  controllers: [InterfacesController],
  exports: [InterfacesService],
})
export class InterfacesModule {}
