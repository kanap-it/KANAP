import { Module, forwardRef } from '@nestjs/common';
import { TenantsModule } from '../../tenants/tenants.module';
import { StorageModule } from '../../common/storage/storage.module';
import { PermissionsModule } from '../../permissions/permissions.module';
import { UsersModule } from '../../users/users.module';
import { AdminBrandingController } from './admin-branding.controller';

@Module({
  imports: [TenantsModule, StorageModule, PermissionsModule, forwardRef(() => UsersModule)],
  controllers: [AdminBrandingController],
})
export class AdminBrandingModule {}
