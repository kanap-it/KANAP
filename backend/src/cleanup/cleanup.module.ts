import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ScheduledTasksModule } from '../admin/scheduled-tasks/scheduled-tasks.module';
import { StorageModule } from '../common/storage/storage.module';
import { AiConversationRetentionService } from './ai-conversation-retention.service';
import { AiMutationPreviewExpirationService } from './ai-mutation-preview-expiration.service';
import { OrphanedAttachmentCleanupService } from './orphaned-attachment-cleanup.service';

@Module({
  imports: [StorageModule, ScheduledTasksModule, AiModule],
  providers: [
    OrphanedAttachmentCleanupService,
    AiConversationRetentionService,
    AiMutationPreviewExpirationService,
  ],
})
export class CleanupModule {}
