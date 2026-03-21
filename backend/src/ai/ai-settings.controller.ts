import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { Features } from '../config/features';
import { AiPolicyService } from './ai-policy.service';
import { AiSettingsService } from './ai-settings.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';
import { AiExecutionContext } from './ai.types';

@Controller('ai/settings')
@UseGuards(JwtAuthGuard)
@SkipTenantTransaction()
export class AiSettingsController {
  constructor(
    private readonly tenantExecutor: AiTenantExecutionService,
    private readonly policy: AiPolicyService,
    private readonly settingsService: AiSettingsService,
    private readonly providerRegistry: AiProviderRegistry,
  ) {}

  private buildContext(req: any): AiExecutionContext {
    return {
      tenantId: String(req?.tenant?.id || ''),
      userId: String(req?.user?.sub || ''),
      isPlatformHost: req?.isPlatformHost === true,
      surface: 'chat',
      authMethod: 'jwt',
      requestId: req?.id ?? null,
      aiApiKeyId: null,
    };
  }

  @Get()
  async getSettings(@Req() req: any) {
    const context = this.buildContext(req);
    return this.tenantExecutor.run(
      context.tenantId,
      async (manager) => {
        await this.policy.assertSettingsAccess(context, manager);
        const settings = await this.settingsService.get(context.tenantId, { manager });
        return {
          instance_features: {
            ai_chat: Features.AI_CHAT_ENABLED,
            ai_mcp: Features.AI_MCP_ENABLED,
            ai_settings: Features.AI_SETTINGS_ENABLED,
          },
          settings: this.settingsService.toView(settings),
          available_providers: this.providerRegistry.list(),
        };
      },
    );
  }

  @Patch()
  async updateSettings(
    @Body() body: UpdateAiSettingsDto,
    @Req() req: any,
  ) {
    const context = this.buildContext(req);
    return this.tenantExecutor.run(
      context.tenantId,
      async (manager) => {
        await this.policy.assertSettingsAccess(context, manager);
        const settings = await this.settingsService.update(context.tenantId, body, { manager });
        return {
          settings: this.settingsService.toView(settings),
        };
      },
      { transaction: true },
    );
  }
}
