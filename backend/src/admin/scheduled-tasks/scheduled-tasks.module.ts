import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledTask } from './scheduled-task.entity';
import { ScheduledTaskRun } from './scheduled-task-run.entity';
import { UserRole } from '../../users/user-role.entity';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { ScheduledTasksController } from './scheduled-tasks.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ScheduledTask, ScheduledTaskRun, UserRole])],
  providers: [ScheduledTasksService],
  controllers: [ScheduledTasksController],
  exports: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
