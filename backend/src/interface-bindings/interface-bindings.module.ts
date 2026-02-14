import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InterfaceBinding } from './interface-binding.entity';
import { InterfaceBindingsService } from './interface-bindings.service';
import { InterfaceBindingsController } from './interface-bindings.controller';
import { InterfaceEntity } from '../interfaces/interface.entity';
import { InterfaceLeg } from '../interfaces/interface-leg.entity';
import { InterfaceMiddlewareApplication } from '../interfaces/interface-middleware-application.entity';
import { AppInstance } from '../app-instances/app-instance.entity';
import { Application } from '../applications/application.entity';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { ItOpsSettingsModule } from '../it-ops-settings/it-ops-settings.module';
import { InterfaceConnectionLink } from '../interface-connection-links/interface-connection-link.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([InterfaceBinding, InterfaceEntity, InterfaceLeg, InterfaceMiddlewareApplication, AppInstance, Application, InterfaceConnectionLink]),
    AuditModule,
    PermissionsModule,
    forwardRef(() => UsersModule),
    ItOpsSettingsModule,
  ],
  providers: [InterfaceBindingsService],
  controllers: [InterfaceBindingsController],
})
export class InterfaceBindingsModule {}
