import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Location } from '../locations/location.entity';
import { ItOpsSettingsService } from './it-ops-settings.service';
import { ItOpsSettingsController } from './it-ops-settings.controller';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Location]), PermissionsModule, forwardRef(() => UsersModule)],
  controllers: [ItOpsSettingsController],
  providers: [ItOpsSettingsService],
  exports: [ItOpsSettingsService],
})
export class ItOpsSettingsModule {}
