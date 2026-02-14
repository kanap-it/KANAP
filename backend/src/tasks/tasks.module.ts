import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TaskTimeEntry } from './task-time-entry.entity';
import { TaskAttachment } from './task-attachment.entity';
import { TasksUnifiedService } from './tasks-unified.service';
import { TasksDeleteService } from './tasks-delete.service';
import { TaskTimeEntriesService } from './task-time-entries.service';
import { TaskActivitiesService } from './task-activities.service';
import { TaskAttachmentsService } from './task-attachments.service';
import { TasksCsvService } from './tasks-csv.service';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../common/storage/storage.module';
import { CsvModule } from '../common/csv';
import { PortfolioProjectPhase } from '../portfolio/portfolio-project-phase.entity';
import { PortfolioActivity } from '../portfolio/portfolio-activity.entity';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { UsersModule } from '../users/users.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskTimeEntry, TaskAttachment, PortfolioProjectPhase, PortfolioActivity]),
    forwardRef(() => AuditModule),
    forwardRef(() => PortfolioModule),
    forwardRef(() => UsersModule),
    PermissionsModule,
    StorageModule,
    CsvModule,
    NotificationsModule,
  ],
  // Note: TasksController is in spend module to avoid route conflicts
  controllers: [],
  providers: [TasksUnifiedService, TasksDeleteService, TaskTimeEntriesService, TaskActivitiesService, TaskAttachmentsService, TasksCsvService],
  exports: [TypeOrmModule, TasksUnifiedService, TasksDeleteService, TaskTimeEntriesService, TaskActivitiesService, TaskAttachmentsService, TasksCsvService],
})
export class TasksModule {}
