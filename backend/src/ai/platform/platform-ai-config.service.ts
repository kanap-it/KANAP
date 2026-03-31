import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { AiSecretCipherService } from '../ai-secret-cipher.service';
import { AiProviderRegistry } from '../providers/ai-provider-registry.service';
import { PlatformAiConfig } from './platform-ai-config.entity';
import { PlatformAiPlanLimit } from './platform-ai-plan-limit.entity';

export type PlatformAiConfigView = {
  id: string;
  provider: string;
  model: string;
  endpoint_url: string | null;
  rate_limit_tenant_per_minute: number;
  rate_limit_user_per_hour: number;
  updated_at: string;
  updated_by: string | null;
  has_api_key: boolean;
};

export type PlatformAiRuntimeConfig = PlatformAiConfigView & {
  apiKey: string;
};

export type UpdatePlatformAiConfigInput = {
  provider?: string | null;
  model?: string | null;
  api_key?: string | null;
  endpoint_url?: string | null;
  rate_limit_tenant_per_minute?: number | null;
  rate_limit_user_per_hour?: number | null;
};

export type UpdatePlatformAiPlanLimitInput = {
  plan_name: string;
  monthly_message_limit: number;
};

const CACHE_TTL_MS = 60_000;

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

@Injectable()
export class PlatformAiConfigService {
  private cache: { expiresAt: number; record: PlatformAiConfig | null } | null = null;

  constructor(
    private readonly dataSource: DataSource,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly cipher: AiSecretCipherService,
    private readonly audit: AuditService,
  ) {}

  private get configRepo() {
    return this.dataSource.getRepository(PlatformAiConfig);
  }

  private get planLimitRepo() {
    return this.dataSource.getRepository(PlatformAiPlanLimit);
  }

  private getConfigRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(PlatformAiConfig) : this.configRepo;
  }

  private getPlanLimitRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(PlatformAiPlanLimit) : this.planLimitRepo;
  }

  private async loadRecord(force = false, manager?: EntityManager): Promise<PlatformAiConfig | null> {
    const now = Date.now();
    if (!force && this.cache && this.cache.expiresAt > now) {
      return this.cache.record;
    }

    const record = await this.getConfigRepo(manager)
      .createQueryBuilder('config')
      .addSelect('config.api_key_encrypted')
      .where('config.singleton = true')
      .getOne();

    this.cache = {
      expiresAt: now + CACHE_TTL_MS,
      record,
    };
    return record;
  }

  private clearCache() {
    this.cache = null;
  }

  private toView(record: PlatformAiConfig): PlatformAiConfigView {
    return {
      id: record.id,
      provider: record.provider,
      model: record.model,
      endpoint_url: record.endpoint_url,
      rate_limit_tenant_per_minute: record.rate_limit_tenant_per_minute,
      rate_limit_user_per_hour: record.rate_limit_user_per_hour,
      updated_at: record.updated_at.toISOString(),
      updated_by: record.updated_by,
      has_api_key: !!record.api_key_encrypted,
    };
  }

  private validateRecord(record: Pick<PlatformAiConfig, 'provider' | 'model' | 'endpoint_url' | 'api_key_encrypted'>): string[] {
    return this.providerRegistry.validate({
      llm_provider: record.provider,
      llm_model: record.model,
      llm_endpoint_url: record.endpoint_url,
      has_llm_api_key: !!record.api_key_encrypted,
    });
  }

  async isConfigured(): Promise<boolean> {
    const record = await this.loadRecord();
    return !!record && this.validateRecord(record).length === 0;
  }

  async getConfig(): Promise<PlatformAiConfigView> {
    const record = await this.loadRecord();
    if (!record) {
      throw new NotFoundException('Built-in AI provider is not configured.');
    }
    return this.toView(record);
  }

  async getRuntimeConfig(): Promise<PlatformAiRuntimeConfig> {
    const record = await this.loadRecord();
    if (!record) {
      throw new NotFoundException('Built-in AI provider is not configured.');
    }
    const validationErrors = this.validateRecord(record);
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        code: 'BUILTIN_PROVIDER_NOT_READY',
        message: 'Built-in AI provider is not fully configured.',
        errors: validationErrors,
      });
    }
    return {
      ...this.toView(record),
      apiKey: this.cipher.decrypt(record.api_key_encrypted),
    };
  }

  async getPlanLimits(opts?: { manager?: EntityManager }): Promise<PlatformAiPlanLimit[]> {
    return this.getPlanLimitRepo(opts?.manager).find({
      order: { plan_name: 'ASC' },
    });
  }

  async updateConfig(
    input: UpdatePlatformAiConfigInput,
    userId?: string | null,
    opts?: { manager?: EntityManager },
  ): Promise<PlatformAiConfigView> {
    const manager = opts?.manager;
    const existing = await this.loadRecord(true, manager);
    const provider = normalizeNullableString(input.provider) ?? existing?.provider ?? null;
    const model = normalizeNullableString(input.model) ?? existing?.model ?? null;
    const endpointUrl = normalizeNullableString(input.endpoint_url) ?? existing?.endpoint_url ?? null;
    const apiKey = normalizeNullableString(input.api_key);
    const apiKeyEncrypted = apiKey
      ? this.cipher.encrypt(apiKey)
      : existing?.api_key_encrypted ?? null;
    const tenantLimit = input.rate_limit_tenant_per_minute ?? existing?.rate_limit_tenant_per_minute ?? 30;
    const userLimit = input.rate_limit_user_per_hour ?? existing?.rate_limit_user_per_hour ?? 60;

    if (!provider) throw new BadRequestException('provider is required.');
    if (!model) throw new BadRequestException('model is required.');
    if (!apiKeyEncrypted) throw new BadRequestException('api_key is required.');

    const validationErrors = this.providerRegistry.validate({
      llm_provider: provider,
      llm_model: model,
      llm_endpoint_url: endpointUrl,
      has_llm_api_key: true,
    });
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Built-in AI provider is not fully configured.',
        errors: validationErrors,
      });
    }

    const executor = manager ?? this.dataSource;
    const result = await executor.query(
      `
        INSERT INTO platform_ai_config (
          singleton,
          provider,
          model,
          api_key_encrypted,
          endpoint_url,
          rate_limit_tenant_per_minute,
          rate_limit_user_per_hour,
          updated_at,
          updated_by
        )
        VALUES (true, $1, $2, $3, $4, $5, $6, now(), $7)
        ON CONFLICT (singleton)
        DO UPDATE SET
          provider = EXCLUDED.provider,
          model = EXCLUDED.model,
          api_key_encrypted = EXCLUDED.api_key_encrypted,
          endpoint_url = EXCLUDED.endpoint_url,
          rate_limit_tenant_per_minute = EXCLUDED.rate_limit_tenant_per_minute,
          rate_limit_user_per_hour = EXCLUDED.rate_limit_user_per_hour,
          updated_at = now(),
          updated_by = EXCLUDED.updated_by
        RETURNING id
      `,
      [provider, model, apiKeyEncrypted, endpointUrl, tenantLimit, userLimit, userId ?? null],
    );

    this.clearCache();
    const saved = await this.loadRecord(true, manager);
    if (!saved) {
      throw new NotFoundException('Built-in AI provider was not saved.');
    }

    await this.audit.log(
      {
        table: 'platform_ai_config',
        recordId: result?.[0]?.id ?? saved.id,
        action: existing ? 'update' : 'create',
        before: existing ? this.toView(existing) : null,
        after: this.toView(saved),
        userId: userId ?? null,
      },
      { manager },
    );

    return this.toView(saved);
  }

  async updatePlanLimits(
    items: UpdatePlatformAiPlanLimitInput[],
    userId?: string | null,
    opts?: { manager?: EntityManager },
  ): Promise<PlatformAiPlanLimit[]> {
    const manager = opts?.manager;
    const before = await this.getPlanLimits({ manager });
    const executor = manager ?? this.dataSource;
    for (const item of items) {
      await executor.query(
        `
          INSERT INTO platform_ai_plan_limits (plan_name, monthly_message_limit, updated_at)
          VALUES ($1, $2, now())
          ON CONFLICT (plan_name)
          DO UPDATE SET
            monthly_message_limit = EXCLUDED.monthly_message_limit,
            updated_at = now()
        `,
        [item.plan_name, item.monthly_message_limit],
      );
    }

    const after = await this.getPlanLimits({ manager });
    await this.audit.log(
      {
        table: 'platform_ai_plan_limits',
        action: 'update',
        before: before.map((item) => ({
          plan_name: item.plan_name,
          monthly_message_limit: item.monthly_message_limit,
        })),
        after: after.map((item) => ({
          plan_name: item.plan_name,
          monthly_message_limit: item.monthly_message_limit,
        })),
        userId: userId ?? null,
      },
      { manager },
    );
    return after;
  }

  async getMonthlyLimitForPlan(planName: string | null | undefined): Promise<number | null> {
    if (!planName) return null;
    const row = await this.planLimitRepo.findOne({
      where: { plan_name: planName },
    });
    return row?.monthly_message_limit ?? null;
  }
}
