import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './location.entity';
import { LocationUserContact } from './location-user-contact.entity';
import { LocationContactLink } from './location-contact.entity';
import { LocationLink } from './location-link.entity';
import { LocationSubItem } from './location-sub-item.entity';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ItOpsSettingsModule } from '../it-ops-settings/it-ops-settings.module';
import { Asset } from '../assets/asset.entity';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { ExternalContact } from '../contacts/external-contact.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Location,
      LocationUserContact,
      LocationContactLink,
      LocationLink,
      LocationSubItem,
      Asset,
      Company,
      User,
      ExternalContact,
    ]),
    AuditModule,
    PermissionsModule,
    ItOpsSettingsModule,
    forwardRef(() => UsersModule),
  ],
  providers: [LocationsService],
  controllers: [LocationsController],
})
export class LocationsModule {}
