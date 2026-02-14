import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConnectionsController } from './connections.controller';
import { Connection } from './connection.entity';
import { ConnectionServer } from './connection-server.entity';
import { ConnectionProtocol } from './connection-protocol.entity';
import { ConnectionLeg } from './connection-leg.entity';
import { AuditModule } from '../audit/audit.module';
import { ItOpsSettingsModule } from '../it-ops-settings/it-ops-settings.module';
import { AssetsModule } from '../assets/assets.module';
import { Asset } from '../assets/asset.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { InterfaceConnectionLink } from '../interface-connection-links/interface-connection-link.entity';

// Decomposed services
import {
  ConnectionsService,
  ConnectionsListService,
  ConnectionsCrudService,
  ConnectionsLegsService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Connection,
      ConnectionServer,
      ConnectionProtocol,
      ConnectionLeg,
      Asset,
      InterfaceConnectionLink,
    ]),
    AuditModule,
    ItOpsSettingsModule,
    AssetsModule,
    PermissionsModule,
    UsersModule,
  ],
  controllers: [ConnectionsController],
  providers: [
    // Decomposed services (order matters for DI)
    ConnectionsListService,
    ConnectionsCrudService,
    ConnectionsLegsService,
    // Main facade service
    ConnectionsService,
  ],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
