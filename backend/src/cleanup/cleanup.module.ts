import { Module } from '@nestjs/common';
import { ScheduledTasksModule } from '../admin/scheduled-tasks/scheduled-tasks.module';
import { StorageModule } from '../common/storage/storage.module';
import { AiConversationRetentionService } from './ai-conversation-retention.service';
import { OrphanedAttachmentCleanupService } from './orphaned-attachment-cleanup.service';

@Module({
  imports: [StorageModule, ScheduledTasksModule],
  providers: [OrphanedAttachmentCleanupService, AiConversationRetentionService],
})
export class CleanupModule {}
