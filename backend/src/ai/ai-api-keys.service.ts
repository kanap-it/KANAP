import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { AiApiKey } from './ai-api-key.entity';
import { AiSettingsService } from './ai-settings.service';
import { McpApiKeyHashService } from './auth/mcp-api-key-hash.service';

export type CreateAiApiKeyInput = {
  tenantId: string;
  userId: string;
  label: string;
  expiresAt?: Date | null;
  createdByUserId: string;
};

export type AiApiKeyRecordDto = {
  id: string;
  tenant_id: string;
  user_id: string;
  key_prefix: string;
  label: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
  created_by_user_id: string;
};

export type AiApiKeyAuthentication = {
  apiKey: AiApiKey;
  user: Awaited<ReturnType<UsersService['findById']>>;
};

@Injectable()
export class AiApiKeysService {
  constructor(
    @InjectRepository(AiApiKey)
    private readonly repo: Repository<AiApiKey>,
    private readonly users: UsersService,
    private readonly hashService: McpApiKeyHashService,
    private readonly aiSettings: AiSettingsService,
  ) {}

  private getRepo(manager?: EntityManager) {
    return (manager ?? this.repo.manager).getRepository(AiApiKey);
  }

  private async findWithHash(
    keyPrefix: string,
    opts?: { manager?: EntityManager; tenantId?: string },
  ): Promise<AiApiKey[]> {
    const repo = this.getRepo(opts?.manager);
    const qb = repo
      .createQueryBuilder('api_key')
      .addSelect('api_key.key_hash')
      .where('api_key.key_prefix = :keyPrefix', { keyPrefix });

    if (opts?.tenantId) {
      qb.andWhere('api_key.tenant_id = :tenantId', { tenantId: opts.tenantId });
    }

    return qb.getMany();
  }

  toView(record: AiApiKey): AiApiKeyRecordDto {
    return {
      id: record.id,
      tenant_id: record.tenant_id,
      user_id: record.user_id,
      key_prefix: record.key_prefix,
      label: record.label,
      expires_at: record.expires_at?.toISOString() ?? null,
      last_used_at: record.last_used_at?.toISOString() ?? null,
      revoked_at: record.revoked_at?.toISOString() ?? null,
      created_at: record.created_at.toISOString(),
      created_by_user_id: record.created_by_user_id,
    };
  }

  async createKey(input: CreateAiApiKeyInput, opts?: { manager?: EntityManager }) {
    const normalizedLabel = input.label.trim();
    if (!normalizedLabel) {
      throw new BadRequestException('A label is required for MCP API keys.');
    }

    // Enforce key max lifetime from tenant settings
    const settings = await this.aiSettings.find(input.tenantId, { manager: opts?.manager });
    let expiresAt = input.expiresAt ?? null;
    if (settings?.mcp_key_max_lifetime_days) {
      const maxExpiry = new Date(Date.now() + settings.mcp_key_max_lifetime_days * 86400000);
      if (!expiresAt || expiresAt.getTime() > maxExpiry.getTime()) {
        expiresAt = maxExpiry;
      }
    }

    const { rawKey, keyHash, keyPrefix } = this.hashService.generate();
    const repo = this.getRepo(opts?.manager);
    const record = await repo.save(repo.create({
      tenant_id: input.tenantId,
      user_id: input.userId,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label: normalizedLabel,
      expires_at: expiresAt,
      created_by_user_id: input.createdByUserId,
    }));

    return {
      key: rawKey,
      record: this.toView(record),
    };
  }

  async listForUser(tenantId: string, userId: string, opts?: { manager?: EntityManager }) {
    const items = await this.getRepo(opts?.manager).find({
      where: { tenant_id: tenantId, user_id: userId },
      order: { created_at: 'DESC' },
    });
    return items.map((item) => this.toView(item));
  }

  async listForTenant(tenantId: string, opts?: { manager?: EntityManager }) {
    const items = await this.getRepo(opts?.manager).find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
    return items.map((item) => this.toView(item));
  }

  async findById(id: string, opts?: { manager?: EntityManager }) {
    return this.getRepo(opts?.manager).findOne({ where: { id } });
  }

  async revokeKey(id: string, opts?: { manager?: EntityManager }) {
    const repo = this.getRepo(opts?.manager);
    const record = await repo.findOne({ where: { id } });
    if (!record) return null;
    record.revoked_at = new Date();
    return this.toView(await repo.save(record));
  }

  async authenticatePresentedKey(
    presentedKey: string,
    opts?: { manager?: EntityManager; tenantId?: string },
  ): Promise<AiApiKeyAuthentication> {
    const keyPrefix = this.hashService.extractPrefix(presentedKey);
    if (!keyPrefix) {
      throw new UnauthorizedException('Invalid MCP API key.');
    }

    const repo = this.getRepo(opts?.manager);
    const records = await this.findWithHash(keyPrefix, opts);
    const record = records.find(
      (candidate) => !!candidate.key_hash && this.hashService.matches(presentedKey, candidate.key_hash),
    );
    if (!record || !record.key_hash) {
      throw new UnauthorizedException('Invalid MCP API key.');
    }
    if (record.revoked_at) {
      throw new UnauthorizedException('MCP API key has been revoked.');
    }
    if (record.expires_at && record.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('MCP API key has expired.');
    }

    const user = await this.users.findById(record.user_id, { manager: opts?.manager });
    const roleName = (user?.role?.role_name ?? '').toLowerCase();
    const canAuthenticate = !!user
      && user.status === 'enabled'
      && (!!user.role && (!user.role.is_system || roleName === 'administrator'));
    if (!canAuthenticate) {
      throw new UnauthorizedException('The MCP API key owner is not allowed to authenticate.');
    }

    record.last_used_at = new Date();
    await repo.save(record);

    return {
      apiKey: record,
      user,
    };
  }
}
