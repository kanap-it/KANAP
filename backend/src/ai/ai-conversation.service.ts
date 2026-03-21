import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { AiConversation } from './ai-conversation.entity';
import { AiMessage } from './ai-message.entity';

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

  async listForUser(tenantId: string, userId: string, opts?: { manager?: EntityManager }) {
    return this.getConversationRepo(opts?.manager).find({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        archived_at: IsNull(),
      },
      order: { updated_at: 'DESC' },
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
