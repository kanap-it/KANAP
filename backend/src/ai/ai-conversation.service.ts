import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { AiConversation } from './ai-conversation.entity';
import { AiMessage } from './ai-message.entity';
import { AiTokenUsage } from './ai.types';

export type CreateAiConversationInput = {
  tenantId: string;
  userId: string;
  title?: string | null;
  provider?: string | null;
  model?: string | null;
};

export type AppendAiMessageInput = {
  conversationId: string;
  tenantId: string;
  conversationUserId: string;
  userId?: string | null;
  role: string;
  content: string;
  toolCalls?: Record<string, unknown>[] | null;
  usage?: Record<string, unknown> | null;
};

function toUsage(value: unknown): AiTokenUsage {
  if (!value || typeof value !== 'object') {
    return {
      input_tokens: 0,
      output_tokens: 0,
    };
  }

  const row = value as Record<string, unknown>;
  const inputTokens = Number(row.input_tokens);
  const outputTokens = Number(row.output_tokens);

  return {
    input_tokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    output_tokens: Number.isFinite(outputTokens) ? outputTokens : 0,
  };
}

@Injectable()
export class AiConversationService {
  constructor(
    @InjectRepository(AiConversation)
    private readonly conversationRepo: Repository<AiConversation>,
    @InjectRepository(AiMessage)
    private readonly messageRepo: Repository<AiMessage>,
  ) {}

  private getConversationRepo(manager?: EntityManager) {
    return (manager ?? this.conversationRepo.manager).getRepository(AiConversation);
  }

  private getMessageRepo(manager?: EntityManager) {
    return (manager ?? this.messageRepo.manager).getRepository(AiMessage);
  }

  createConversation(input: CreateAiConversationInput, opts?: { manager?: EntityManager }) {
    const repo = this.getConversationRepo(opts?.manager);
    return repo.save(repo.create({
      tenant_id: input.tenantId,
      user_id: input.userId,
      title: input.title?.trim() || null,
      provider: input.provider ?? null,
      model: input.model ?? null,
    }));
  }

  async listForUser(
    tenantId: string,
    userId: string,
    opts?: { manager?: EntityManager; page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(opts?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(opts?.limit) || 100));
    const skip = (page - 1) * limit;

    return this.getConversationRepo(opts?.manager).find({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        archived_at: IsNull(),
      },
      order: { updated_at: 'DESC' },
      skip,
      take: limit,
    });
  }

  async getConversationForTenant(
    id: string,
    tenantId: string,
    opts?: { manager?: EntityManager },
  ) {
    const conversation = await this.getConversationRepo(opts?.manager).findOne({
      where: {
        id,
        tenant_id: tenantId,
      },
    });
    if (!conversation) {
      throw new NotFoundException('AI conversation not found.');
    }
    return conversation;
  }

  async getConversationForUser(
    id: string,
    tenantId: string,
    userId: string,
    opts?: { manager?: EntityManager },
  ) {
    const conversation = await this.getConversationRepo(opts?.manager).findOne({
      where: {
        id,
        tenant_id: tenantId,
        user_id: userId,
      },
    });
    if (!conversation) {
      throw new NotFoundException('AI conversation not found.');
    }
    return conversation;
  }

  async listMessagesForConversation(
    conversationId: string,
    tenantId: string,
    opts?: { manager?: EntityManager },
  ) {
    return this.getMessageRepo(opts?.manager).find({
      where: { conversation_id: conversationId, tenant_id: tenantId },
      order: { created_at: 'ASC' },
    });
  }

  async listMessagesForUser(
    conversationId: string,
    tenantId: string,
    userId: string,
    opts?: { manager?: EntityManager },
  ) {
    await this.getConversationForUser(conversationId, tenantId, userId, opts);
    return this.listMessagesForConversation(conversationId, tenantId, opts);
  }

  async getConversationUsage(
    conversationId: string,
    tenantId: string,
    opts?: { manager?: EntityManager },
  ): Promise<AiTokenUsage> {
    const row = await this.getMessageRepo(opts?.manager)
      .createQueryBuilder('m')
      .select(
        "COALESCE(SUM(COALESCE((m.usage_json->>'input_tokens')::bigint, 0)), 0)::bigint",
        'input_tokens',
      )
      .addSelect(
        "COALESCE(SUM(COALESCE((m.usage_json->>'output_tokens')::bigint, 0)), 0)::bigint",
        'output_tokens',
      )
      .where('m.conversation_id = :conversationId', { conversationId })
      .andWhere('m.tenant_id = :tenantId', { tenantId })
      .getRawOne();

    return toUsage(row);
  }

  async archiveConversation(
    id: string,
    tenantId: string,
    userId: string,
    opts?: { manager?: EntityManager },
  ) {
    const repo = this.getConversationRepo(opts?.manager);
    const conversation = await repo.findOne({
      where: {
        id,
        tenant_id: tenantId,
        user_id: userId,
      },
    });
    if (!conversation) {
      throw new NotFoundException('AI conversation not found.');
    }
    conversation.archived_at = new Date();
    return repo.save(conversation);
  }

  async appendMessage(input: AppendAiMessageInput, opts?: { manager?: EntityManager }) {
    const conversationRepo = this.getConversationRepo(opts?.manager);
    const messageRepo = this.getMessageRepo(opts?.manager);
    const conversation = await conversationRepo.findOne({
      where: {
        id: input.conversationId,
        tenant_id: input.tenantId,
        user_id: input.conversationUserId,
        archived_at: IsNull(),
      },
    });
    if (!conversation) {
      throw new NotFoundException('AI conversation not found.');
    }

    const message = await messageRepo.save(messageRepo.create({
      conversation_id: input.conversationId,
      tenant_id: input.tenantId,
      user_id: input.userId ?? null,
      role: input.role,
      content: input.content,
      tool_calls: input.toolCalls ?? null,
      usage_json: input.usage ?? null,
    }));

    conversation.updated_at = new Date();
    await conversationRepo.save(conversation);

    return message;
  }
}
