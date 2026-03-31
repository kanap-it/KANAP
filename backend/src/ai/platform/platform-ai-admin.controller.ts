import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { Tenant, TenantRequest } from '../../common/decorators';
import { MultiTenantOnlyGuard } from '../../common/feature-gates';
import {
  PROVIDER_TEST_MAX_RETRIES,
  PROVIDER_TEST_MAX_TOKENS,
  PROVIDER_TEST_TIMEOUT_MS,
} from '../provider-test.constants';
import { AiProviderRegistry } from '../providers/ai-provider-registry.service';
import { AiProviderTestResult, AiStreamEvent } from '../providers/ai-provider.types';
import { TestPlatformAiConfigDto } from './dto/test-platform-ai-config.dto';
import { UpdatePlatformAiConfigDto } from './dto/update-platform-ai-config.dto';
import { UpdatePlatformAiPlanLimitsDto } from './dto/update-platform-ai-plan-limits.dto';
import { AiBuiltinUsageService } from './ai-builtin-usage.service';
import { PlatformAiConfigService } from './platform-ai-config.service';

@UseGuards(MultiTenantOnlyGuard, JwtAuthGuard, PlatformAdminGuard)
@Controller('admin/ai')
export class PlatformAiAdminController {
  constructor(
    private readonly platformAiConfig: PlatformAiConfigService,
    private readonly usageService: AiBuiltinUsageService,
    private readonly providerRegistry: AiProviderRegistry,
  ) {}

  @Get('config')
  async getConfig() {
    const [config, planLimits, usage] = await Promise.all([
      this.platformAiConfig.getConfig().catch(() => null),
      this.platformAiConfig.getPlanLimits(),
      this.usageService.getUsageForAllTenants(),
    ]);

    return {
      config,
      available_providers: this.providerRegistry.list(),
      plan_limits: planLimits.map((item) => ({
        plan_name: item.plan_name,
        monthly_message_limit: item.monthly_message_limit,
        updated_at: item.updated_at.toISOString(),
      })),
      usage,
    };
  }

  @Patch('config')
  async updateConfig(@Body() body: UpdatePlatformAiConfigDto, @Tenant() ctx: TenantRequest) {
    const config = await this.platformAiConfig.updateConfig(body, ctx.userId || null, { manager: ctx.manager });
    return { config };
  }

  @Post('config/test')
  async testConfig(@Body() body: TestPlatformAiConfigDto): Promise<AiProviderTestResult> {
    const existing = await this.platformAiConfig.getRuntimeConfig().catch(() => null);
    const provider = body.provider ?? existing?.provider ?? null;
    const model = body.model ?? existing?.model ?? null;
    const endpointUrl = body.endpoint_url ?? existing?.endpoint_url ?? null;
    const apiKey = body.api_key ?? existing?.apiKey ?? null;

    const validationErrors = this.providerRegistry.validate({
      llm_provider: provider,
      llm_model: model,
      llm_endpoint_url: endpointUrl,
      has_llm_api_key: !!apiKey,
    });
    if (validationErrors.length > 0) {
      return {
        ok: false,
        provider,
        model,
        latency_ms: null,
        message: 'Provider settings are incomplete.',
        validation_errors: validationErrors,
      };
    }

    const adapter = this.providerRegistry.get(provider);
    if (!adapter) {
      throw new BadRequestException('Unsupported AI provider.');
    }

    const startedAt = Date.now();
    try {
      const stream = adapter.createStream({
        model: model!,
        apiKey,
        endpointUrl,
        systemPrompt: 'Respond with a single word: ok.',
        messages: [{ role: 'user', content: 'Reply with ok.' }],
        tools: [],
        maxTokens: PROVIDER_TEST_MAX_TOKENS,
        timeoutMs: PROVIDER_TEST_TIMEOUT_MS,
        maxRetries: PROVIDER_TEST_MAX_RETRIES,
      });

      const iterator = stream[Symbol.asyncIterator]();
      const first = await iterator.next();
      if (!first.done && (first.value as AiStreamEvent | undefined)?.type === 'error') {
        return {
          ok: false,
          provider,
          model,
          latency_ms: Date.now() - startedAt,
          message: (first.value as { message?: string }).message || 'Provider test failed.',
          validation_errors: [],
        };
      }

      return {
        ok: true,
        provider,
        model,
        latency_ms: Date.now() - startedAt,
        message: 'Provider test succeeded.',
        validation_errors: [],
      };
    } catch (error) {
      return {
        ok: false,
        provider,
        model,
        latency_ms: Date.now() - startedAt,
        message: error instanceof Error && error.message.trim() ? error.message : 'Provider test failed.',
        validation_errors: [],
      };
    }
  }

  @Put('plan-limits')
  async updatePlanLimits(@Body() body: UpdatePlatformAiPlanLimitsDto, @Tenant() ctx: TenantRequest) {
    const planLimits = await this.platformAiConfig.updatePlanLimits(body.items, ctx.userId || null, { manager: ctx.manager });
    return {
      plan_limits: planLimits.map((item) => ({
        plan_name: item.plan_name,
        monthly_message_limit: item.monthly_message_limit,
        updated_at: item.updated_at.toISOString(),
      })),
    };
  }

  @Get('usage')
  async getUsage() {
    return {
      items: await this.usageService.getUsageForAllTenants(),
    };
  }
}
