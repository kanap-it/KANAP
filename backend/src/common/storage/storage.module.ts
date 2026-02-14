import { Module } from '@nestjs/common';
import { S3StorageService } from './s3-storage.service';
import { StorageService } from './storage.service';

@Module({
  providers: [
    {
      provide: StorageService,
      useFactory: () => {
        const backend = (process.env.FILES_STORAGE || 's3').toLowerCase();
        // For now, default to S3 (Hetzner). Local fallback could be added if needed.
        switch (backend) {
          case 's3':
          default:
            return new S3StorageService();
        }
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}

