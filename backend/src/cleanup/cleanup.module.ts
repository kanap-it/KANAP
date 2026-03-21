import { Module } from '@nestjs/common';
import { StorageModule } from '../common/storage/storage.module';
import { OrphanedAttachmentCleanupService } from './orphaned-attachment-cleanup.service';

@Module({
  imports: [StorageModule],
  providers: [OrphanedAttachmentCleanupService],
})
export class CleanupModule {}
