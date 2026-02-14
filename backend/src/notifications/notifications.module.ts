import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationPreferences } from './notification-preferences.entity';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationsService } from './notifications.service';
import { ScheduledNotificationsService } from './scheduled-notifications.service';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationPreferences]),
    EmailModule,
    StorageModule,
  ],
  controllers: [NotificationPreferencesController],
  providers: [
    NotificationPreferencesService,
    NotificationsService,
    ScheduledNotificationsService,
  ],
  exports: [NotificationPreferencesService, NotificationsService],
})
export class NotificationsModule {}
