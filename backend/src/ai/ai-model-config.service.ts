import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { assertPublicHttpUrl } from '../common/ssrf-guard';
import { AiModelConfig, AiModelProvider } from './ai-model-config.entity';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { AiSettings } from './ai-settings.entity';
import { AiAgentDefinition } from './control-plane/entities/ai-agent-definition.entity';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';

export type AiModelConfigUsage = {
  chat: boolean;
  agents: { id: string; name: string }[];
};

export type AiModelConfigView = {
  id: string;
  name: string;
  provider: string;
  model: string;
  endpoint_url: string | null;
  has_api_key: boolean;
  supports_vision: boolean;
  price_input_eur_per_mtok: number | null;
  price_output_eur_per_mtok: number | null;
  llm_timeout_ms: number | null;
  status: 'active' | 'archived';
  is_default: boolean;
  used_by: AiModelConfigUsage;
  validation_errors: string[];
  created_at: string;
  updated_at: string;
};

export type CreateAiModelConfigInput = {
  name: string;
  provider: string;
  model: string;
  endpoint_url?: string | null;
  api_key?: string | null;
  supports_vision?: boolean;
  price_input_eur_per_mtok?: number | null;
  price_output_eur_per_mtok?: number | null;
  llm_timeout_ms?: number | null;
  is_default?: boolean;
};

export type UpdateAiModelConfigInput = Partial<CreateAiModelConfigInput>;

const SUPPORTED_PROVIDERS: AiModelProvider[] = ['anthropic', 'openai', 'ollama', 'custom'];

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
}

function normalizePrice(value: number | null | undefined, fieldName: string): string | null {
  if (value == null) return null;
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(`${fieldName} must be a non-negative number.`);
  }
  return value.toFixed(4);
}

function parsePrice(value: string | null): number | null {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

@Injectable()
export class AiModelConfigService {
  constructor(
    @InjectRepository(AiModelConfig)
    private readonly repo: Repository<AiModelConfig>,
    private readonly providerRegistry: AiProviderRegistry,
    private readonly cipher: AiSecretCipherService,
    private readonly audit?: AuditService,
  ) {}

  private getRepo(manager?: EntityManager) {
    return (manager ?? this.repo.manager).getRepository(AiModelConfig);
  }

  async list(tenantId: string, manager?: EntityManager): Promise<AiModelConfigView[]> {
    const configs = await this.getRepo(manager)
      .createQueryBuilder('config')
      .addSelect('config.api_key_encrypted')
      .where('config.tenant_id = :tenantId', { tenantId })
      .orderBy('config.status', 'ASC')
      .addOrderBy('config.name', 'ASC')
      .getMany();
    const usage = await this.loadUsage(tenantId, configs.map((config) => config.id), manager);
    return configs.map((config) => this.toView(config, usage.get(config.id) ?? { chat: false, agents: [] }));
  }

  async getById(tenantId: string, id: string, manager?: EntityManager): Promise<AiModelConfig> {
    const config = await this.getRepo(manager)
      .createQueryBuilder('config')
      .addSelect('config.api_key_encrypted')
      .where('config.id = :id', { id })
      .andWhere('config.tenant_id = :tenantId', { tenantId })
      .getOne();
    if (!config) {
      throw new NotFoundException('AI model configuration not found.');
    }
    return config;
  }

  async create(
    tenantId: string,
    input: CreateAiModelConfigInput,
    opts?: { manager?: EntityManager; userId?: string | null; sourceRef?: string | null },
  ): Promise<AiModelConfigView> {
    const repo = this.getRepo(opts?.manager);
    const config = repo.create({
      tenant_id: tenantId,
      supports_vision: true,
      status: 'active',
      is_default: false,
    });
    this.applyInput(config, { supports_vision: true, ...input }, { isCreate: true });
    config.updated_by = opts?.userId ?? null;

    if (input.is_default === true) {
      await this.clearDefault(tenantId, opts?.manager);
      config.is_default = true;
    }

    const saved = await this.saveHandlingConflicts(repo, config);
    await this.logAudit('create', saved, null, opts);
    return this.toView(saved, { chat: false, agents: [] });
  }

  async update(
    tenantId: string,
    id: string,
    input: UpdateAiModelConfigInput,
    opts?: { manager?: EntityManager; userId?: string | null; sourceRef?: string | null },
  ): Promise<AiModelConfigView> {
    const repo = this.getRepo(opts?.manager);
    const config = await this.getById(tenantId, id, opts?.manager);
    if (config.status === 'archived') {
      throw new BadRequestException('An archived AI model configuration cannot be edited; restore it first.');
    }
    const before = this.toView(config, { chat: false, agents: [] });
    this.applyInput(config, input, { isCreate: false });
    config.updated_by = opts?.userId ?? null;
    config.updated_at = new Date();

    if (input.is_default === true && !config.is_default) {
      await this.clearDefault(tenantId, opts?.manager);
      config.is_default = true;
    } else if (input.is_default === false) {
      config.is_default = false;
    }

    const saved = await this.saveHandlingConflicts(repo, config);
    await this.logAudit('update', saved, before, opts);
    const usage = await this.loadUsage(tenantId, [saved.id], opts?.manager);
    return this.toView(saved, usage.get(saved.id) ?? { chat: false, agents: [] });
  }

  async archive(
    tenantId: string,
    id: string,
    opts?: { manager?: EntityManager; userId?: string | null; sourceRef?: string | null },
  ): Promise<AiModelConfigView> {
    const repo = this.getRepo(opts?.manager);
    const config = await this.getById(tenantId, id, opts?.manager);
    if (config.status === 'archived') {
      return this.toView(config, { chat: false, agents: [] });
    }
    const usage = (await this.loadUsage(tenantId, [id], opts?.manager)).get(id) ?? { chat: false, agents: [] };
    if (usage.chat || usage.agents.length > 0) {
      const consumers = [
        ...(usage.chat ? ['Plaid'] : []),
        ...usage.agents.map((agent) => agent.name),
      ];
      throw new ConflictException({
        message: 'This AI model is still assigned and cannot be archived.',
        used_by: consumers,
      });
    }
    const before = this.toView(config, usage);
    config.status = 'archived';
    config.is_default = false;
    config.updated_by = opts?.userId ?? null;
    config.updated_at = new Date();
    const saved = await repo.save(config);
    await this.logAudit('update', saved, before, opts);
    return this.toView(saved, { chat: false, agents: [] });
  }

  async restore(
    tenantId: string,
    id: string,
    opts?: { manager?: EntityManager; userId?: string | null; sourceRef?: string | null },
  ): Promise<AiModelConfigView> {
    const repo = this.getRepo(opts?.manager);
    const config = await this.getById(tenantId, id, opts?.manager);
    if (config.status === 'active') {
      const usage = await this.loadUsage(tenantId, [id], opts?.manager);
      return this.toView(config, usage.get(id) ?? { chat: false, agents: [] });
    }
    const before = this.toView(config, { chat: false, agents: [] });
    config.status = 'active';
    config.updated_by = opts?.userId ?? null;
    config.updated_at = new Date();
    const saved = await this.saveHandlingConflicts(repo, config);
    await this.logAudit('update', saved, before, opts);
    return this.toView(saved, { chat: false, agents: [] });
  }

  async setDefault(
    tenantId: string,
    id: string,
    opts?: { manager?: EntityManager; userId?: string | null; sourceRef?: string | null },
  ): Promise<AiModelConfigView> {
    const repo = this.getRepo(opts?.manager);
    const config = await this.getById(tenantId, id, opts?.manager);
    if (config.status === 'archived') {
      throw new BadRequestException('An archived AI model configuration cannot be the default.');
    }
    if (!config.is_default) {
      await this.clearDefault(tenantId, opts?.manager);
      config.is_default = true;
      config.updated_by = opts?.userId ?? null;
      config.updated_at = new Date();
      await repo.save(config);
      await this.logAudit('update', config, null, opts);
    }
    const usage = await this.loadUsage(tenantId, [id], opts?.manager);
    return this.toView(config, usage.get(id) ?? { chat: false, agents: [] });
  }

  async clearDefaultAssignment(
    tenantId: string,
    id: string,
    opts?: { manager?: EntityManager; userId?: string | null; sourceRef?: string | null },
  ): Promise<AiModelConfigView> {
    const repo = this.getRepo(opts?.manager);
    const config = await this.getById(tenantId, id, opts?.manager);
    if (config.is_default) {
      config.is_default = false;
      config.updated_by = opts?.userId ?? null;
      config.updated_at = new Date();
      await repo.save(config);
      await this.logAudit('update', config, null, opts);
    }
    const usage = await this.loadUsage(tenantId, [id], opts?.manager);
    return this.toView(config, usage.get(id) ?? { chat: false, agents: [] });
  }

  /** Consumers ("Used by") per config id: Plaid chat assignment + agent assignments. */
  async loadUsage(
    tenantId: string,
    configIds: string[],
    manager?: EntityManager,
  ): Promise<Map<string, AiModelConfigUsage>> {
    const usage = new Map<string, AiModelConfigUsage>();
    if (configIds.length === 0) {
      return usage;
    }
    const effectiveManager = manager ?? this.repo.manager;
    const settings = await effectiveManager.getRepository(AiSettings).findOne({
      where: { tenant_id: tenantId },
    });
    const agents = await effectiveManager
      .getRepository(AiAgentDefinition)
      .createQueryBuilder('agent')
      .select(['agent.id', 'agent.name', 'agent.llm_model_config_id'])
      .where('agent.tenant_id = :tenantId', { tenantId })
      .andWhere('agent.llm_model_config_id = ANY(:configIds)', { configIds })
      .getMany();
    for (const configId of configIds) {
      usage.set(configId, {
        chat: settings?.chat_model_config_id === configId,
        agents: agents
          .filter((agent) => agent.llm_model_config_id === configId)
          .map((agent) => ({ id: agent.id, name: agent.name })),
      });
    }
    return usage;
  }

  toView(config: AiModelConfig, usedBy: AiModelConfigUsage): AiModelConfigView {
    return {
      id: config.id,
      name: config.name,
      provider: config.provider,
      model: config.model,
      endpoint_url: config.endpoint_url,
      has_api_key: !!config.api_key_encrypted,
      supports_vision: config.supports_vision !== false,
      price_input_eur_per_mtok: parsePrice(config.price_input_eur_per_mtok),
      price_output_eur_per_mtok: parsePrice(config.price_output_eur_per_mtok),
      llm_timeout_ms: config.llm_timeout_ms ?? null,
      status: config.status,
      is_default: config.is_default,
      used_by: usedBy,
      validation_errors: this.providerRegistry.validate({
        llm_provider: config.provider,
        llm_model: config.model,
        llm_endpoint_url: config.endpoint_url,
        has_llm_api_key: !!config.api_key_encrypted,
      }),
      created_at: config.created_at.toISOString(),
      updated_at: config.updated_at.toISOString(),
    };
  }

  private applyInput(
    config: AiModelConfig,
    input: UpdateAiModelConfigInput,
    opts: { isCreate: boolean },
  ): void {
    if (opts.isCreate || Object.prototype.hasOwnProperty.call(input, 'name')) {
      const name = normalizeNullableString(input.name);
      if (!name) {
        throw new BadRequestException('name is required.');
      }
      if (name.length > 100) {
        throw new BadRequestException('name must not exceed 100 characters.');
      }
      config.name = name;
    }
    if (opts.isCreate || Object.prototype.hasOwnProperty.call(input, 'provider')) {
      const provider = normalizeNullableString(input.provider) as AiModelProvider | null;
      if (!provider || !SUPPORTED_PROVIDERS.includes(provider)) {
        throw new BadRequestException('Unsupported AI provider.');
      }
      if (!this.providerRegistry.get(provider)) {
        throw new BadRequestException('Unsupported AI provider.');
      }
      config.provider = provider;
    }
    if (opts.isCreate || Object.prototype.hasOwnProperty.call(input, 'model')) {
      const model = normalizeNullableString(input.model);
      if (!model) {
        throw new BadRequestException('model is required.');
      }
      if (model.length > 100) {
        throw new BadRequestException('model must not exceed 100 characters.');
      }
      config.model = model;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'endpoint_url')) {
      const normalized = normalizeNullableString(input.endpoint_url);
      if (normalized) {
        let parsed: URL;
        try {
          parsed = new URL(normalized);
        } catch {
          throw new BadRequestException('endpoint_url must be a valid HTTP(S) URL.');
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new BadRequestException('endpoint_url must use http:// or https://.');
        }
        assertPublicHttpUrl(normalized);
      }
      config.endpoint_url = normalized;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'api_key')) {
      const raw = normalizeNullableString(input.api_key);
      config.api_key_encrypted = raw ? this.cipher.encrypt(raw) : null;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'supports_vision')) {
      config.supports_vision = input.supports_vision !== false;
    }
    if (Object.prototype.hasOwnProperty.call(input, 'price_input_eur_per_mtok')) {
      config.price_input_eur_per_mtok = normalizePrice(input.price_input_eur_per_mtok, 'price_input_eur_per_mtok');
    }
    if (Object.prototype.hasOwnProperty.call(input, 'price_output_eur_per_mtok')) {
      config.price_output_eur_per_mtok = normalizePrice(input.price_output_eur_per_mtok, 'price_output_eur_per_mtok');
    }
    if (Object.prototype.hasOwnProperty.call(input, 'llm_timeout_ms')) {
      const value = input.llm_timeout_ms;
      if (value != null && (!Number.isInteger(value) || value <= 0)) {
        throw new BadRequestException('llm_timeout_ms must be a positive integer.');
      }
      config.llm_timeout_ms = value ?? null;
    }
  }

  private async clearDefault(tenantId: string, manager?: EntityManager): Promise<void> {
    await this.getRepo(manager)
      .createQueryBuilder()
      .update(AiModelConfig)
      .set({ is_default: false, updated_at: () => 'now()' })
      .where('tenant_id = :tenantId AND is_default = true', { tenantId })
      .execute();
  }

  private async saveHandlingConflicts(
    repo: Repository<AiModelConfig>,
    config: AiModelConfig,
  ): Promise<AiModelConfig> {
    try {
      const saved = await repo.save(config);
      saved.api_key_encrypted = config.api_key_encrypted;
      return saved;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const constraint = (error as { constraint?: string })?.constraint;
      if (code === '23505' && constraint === 'uq_ai_model_configs_tenant_name') {
        throw new ConflictException('An AI model with this name already exists.');
      }
      throw error;
    }
  }

  private async logAudit(
    action: 'create' | 'update',
    config: AiModelConfig,
    before: AiModelConfigView | null,
    opts?: { manager?: EntityManager; userId?: string | null; sourceRef?: string | null },
  ): Promise<void> {
    if (!this.audit) return;
    await this.audit.log(
      {
        table: 'ai_model_configs',
        recordId: config.id,
        action,
        before,
        after: this.toView(config, { chat: false, agents: [] }),
        userId: opts?.userId ?? null,
        sourceRef: opts?.sourceRef ?? null,
      },
      { manager: opts?.manager },
    );
  }
}
