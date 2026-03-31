import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../../audit/audit.module';
import { Subscription } from '../../billing/subscription.entity';
import { AiProviderSupportModule } from '../ai-provider-support.module';
import { AiBuiltinRateLimiter } from './ai-builtin-rate-limiter';
import { AiBuiltinUsage } from './ai-builtin-usage.entity';
import { AiBuiltinUsageService } from './ai-builtin-usage.service';
import { PlatformAiAdminController } from './platform-ai-admin.controller';
import { PlatformAiConfig } from './platform-ai-config.entity';
import { PlatformAiConfigService } from './platform-ai-config.service';
import { PlatformAiPlanLimit } from './platform-ai-plan-limit.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlatformAiConfig,
      PlatformAiPlanLimit,
      AiBuiltinUsage,
      Subscription,
    ]),
    AuditModule,
    AiProviderSupportModule,
  ],
  controllers: [PlatformAiAdminController],
  providers: [
    PlatformAiConfigService,
    AiBuiltinUsageService,
    AiBuiltinRateLimiter,
  ],
  exports: [
    PlatformAiConfigService,
    AiBuiltinUsageService,
    AiBuiltinRateLimiter,
  ],
})
export class PlatformAiModule {}
