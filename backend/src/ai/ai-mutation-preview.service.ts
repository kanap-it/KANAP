import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import {
  AiExecutionContextWithManager,
  AiMutationPreviewDto,
  AiMutationWriteToolName,
} from './ai.types';
import { AiMutationPreview } from './ai-mutation-preview.entity';
import { AiPolicyService } from './ai-policy.service';
import { AiMutationOperationRegistry } from './mutation/ai-mutation-operation.registry';

const PREVIEW_TTL_MS = 10 * 60 * 1000;
const MAX_CONVERSATION_PREVIEWS = 20;

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

@Injectable()
export class AiMutationPreviewService {
  constructor(
    @InjectRepository(AiMutationPreview)
    private readonly previewRepo: Repository<AiMutationPreview>,
    private readonly policy: AiPolicyService,
    private readonly operations: AiMutationOperationRegistry,
  ) {}

  private getRepo(manager?: EntityManager) {
    return (manager ?? this.previewRepo.manager).getRepository(AiMutationPreview);
  }

  private assertConversationScope(
    preview: AiMutationPreview,
    conversationId: string | null | undefined,
  ): void {
    if (!conversationId) {
      return;
    }
    if (preview.conversation_id !== conversationId) {
      throw new ForbiddenException('AI preview does not belong to this conversation.');
    }
  }

  private toPreviewDto(preview: AiMutationPreview): AiMutationPreviewDto {
    const operation = this.operations.getOperation(preview.tool_name);
    const presentation = operation.presentPreview(preview);

    return {
      preview_id: preview.id,
      tool_name: preview.tool_name as AiMutationWriteToolName,
      status: preview.status,
      target: presentation.target,
      changes: presentation.changes,
      requires_confirmation: preview.status === 'pending',
      actions: preview.status === 'pending'
        ? ['approve', 'reject'] as Array<'approve' | 'reject'>
        : [],
      summary: presentation.summary,
      error_message: preview.error_message ?? null,
      conversation_id: preview.conversation_id ?? null,
      created_at: preview.created_at.toISOString(),
      expires_at: toIso(preview.expires_at),
      approved_at: toIso(preview.approved_at),
      rejected_at: toIso(preview.rejected_at),
      executed_at: toIso(preview.executed_at),
    };
  }

  async expireStalePreviews(
    manager: EntityManager,
    tenantId: string,
    opts?: { conversationId?: string | null; userId?: string | null },
  ): Promise<number> {
    const repo = this.getRepo(manager);
    const result = await repo.createQueryBuilder()
      .update(AiMutationPreview)
      .set({ status: 'expired' })
      .where('tenant_id = :tenantId', { tenantId })
      .andWhere('status = :status', { status: 'pending' })
      .andWhere('expires_at < now()')
      .andWhere(opts?.conversationId ? 'conversation_id = :conversationId' : '1=1', { conversationId: opts?.conversationId })
      .andWhere(opts?.userId ? 'user_id = :userId' : '1=1', { userId: opts?.userId })
      .execute();
    return result.affected ?? 0;
  }

  private async assertPendingSlotAvailable(
    context: AiExecutionContextWithManager,
    conversationId: string | null,
  ): Promise<void> {
    if (!conversationId) {
      return;
    }

    await this.expireStalePreviews(context.manager, context.tenantId, {
      conversationId,
      userId: context.userId,
    });

    const existing = await this.getRepo(context.manager).findOne({
      where: {
        tenant_id: context.tenantId,
        conversation_id: conversationId,
        user_id: context.userId,
        status: 'pending',
      },
    });

    if (existing) {
      throw new ConflictException('A pending AI preview already exists in this conversation.');
    }
  }

  async createPreview<TInput>(
    context: AiExecutionContextWithManager,
    toolName: AiMutationWriteToolName,
    input: TInput,
  ): Promise<AiMutationPreviewDto> {
    const operation = this.operations.getOperation<TInput>(toolName);
    await this.policy.assertWriteAccess(context, operation.businessResource, context.manager);
    await this.assertPendingSlotAvailable(context, context.conversationId ?? null);

    const prepared = await operation.prepareCreatePreview(context, input);
    const repo = this.getRepo(context.manager);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PREVIEW_TTL_MS);

    const preview = await repo.save(repo.create({
      tenant_id: context.tenantId,
      conversation_id: context.conversationId ?? null,
      user_id: context.userId,
      tool_name: operation.toolName,
      target_entity_type: prepared.targetEntityType,
      target_entity_id: prepared.targetEntityId,
      mutation_input: prepared.mutationInput,
      current_values: prepared.currentValues,
      status: 'pending',
      approved_at: null,
      rejected_at: null,
      executed_at: null,
      expires_at: expiresAt,
      error_message: null,
      created_at: now,
    }));

    return this.toPreviewDto(preview);
  }

  async getPreviewForUser(
    context: AiExecutionContextWithManager,
    previewId: string,
  ): Promise<AiMutationPreview> {
    const preview = await this.getRepo(context.manager).findOne({
      where: {
        id: previewId,
        tenant_id: context.tenantId,
        user_id: context.userId,
      },
    });

    if (!preview) {
      throw new NotFoundException('AI preview not found.');
    }

    if (!this.operations.isSupportedToolName(preview.tool_name)) {
      throw new BadRequestException('Unsupported preview type.');
    }

    return preview;
  }

  private async executePreviewInternal(
    context: AiExecutionContextWithManager,
    preview: AiMutationPreview,
  ): Promise<AiMutationPreviewDto> {
    const repo = this.getRepo(context.manager);
    const operation = this.operations.getOperation(preview.tool_name);

    try {
      await operation.executePreview(context, preview);
      preview.status = 'executed';
      preview.approved_at = new Date();
      preview.executed_at = new Date();
      preview.error_message = null;
      const saved = await repo.save(preview);
      return this.toPreviewDto(saved);
    } catch (error: any) {
      preview.status = 'failed';
      preview.approved_at = new Date();
      preview.error_message = error?.message || 'Preview execution failed.';
      const saved = await repo.save(preview);
      return this.toPreviewDto(saved);
    }
  }

  async executePreview(
    context: AiExecutionContextWithManager,
    previewId: string,
  ): Promise<AiMutationPreviewDto> {
    const preview = await this.getPreviewForUser(context, previewId);
    const operation = this.operations.getOperation(preview.tool_name);
    await this.policy.assertWriteAccess(context, operation.businessResource, context.manager);
    this.assertConversationScope(preview, context.conversationId ?? null);

    if (preview.status !== 'pending') {
      return this.toPreviewDto(preview);
    }

    if (preview.expires_at.getTime() < Date.now()) {
      preview.status = 'expired';
      preview.error_message = 'Preview expired before approval.';
      const saved = await this.getRepo(context.manager).save(preview);
      return this.toPreviewDto(saved);
    }

    return this.executePreviewInternal(context, preview);
  }

  async rejectPreview(
    context: AiExecutionContextWithManager,
    previewId: string,
  ): Promise<AiMutationPreviewDto> {
    const repo = this.getRepo(context.manager);
    const preview = await this.getPreviewForUser(context, previewId);
    const operation = this.operations.getOperation(preview.tool_name);
    await this.policy.assertWriteAccess(context, operation.businessResource, context.manager);
    this.assertConversationScope(preview, context.conversationId ?? null);

    if (preview.status === 'pending') {
      if (preview.expires_at.getTime() < Date.now()) {
        preview.status = 'expired';
        preview.error_message = 'Preview expired before approval.';
      } else {
        preview.status = 'rejected';
        preview.rejected_at = new Date();
        preview.error_message = null;
      }
      await repo.save(preview);
    }

    return this.toPreviewDto(preview);
  }

  async createReversePreview(
    context: AiExecutionContextWithManager,
    previewId: string,
  ): Promise<AiMutationPreviewDto> {
    const original = await this.getPreviewForUser(context, previewId);
    const operation = this.operations.getOperation(original.tool_name);
    await this.policy.assertWriteAccess(context, operation.businessResource, context.manager);
    this.assertConversationScope(original, context.conversationId ?? null);

    if (original.status !== 'executed') {
      throw new BadRequestException('Only executed previews can be undone.');
    }
    if (!operation.writePreview.reversible || !operation.prepareReversePreview) {
      throw new BadRequestException('Undo is not supported for this preview type.');
    }

    await this.assertPendingSlotAvailable(context, original.conversation_id ?? null);

    const prepared = await operation.prepareReversePreview(context, original);
    const repo = this.getRepo(context.manager);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PREVIEW_TTL_MS);

    const preview = await repo.save(repo.create({
      tenant_id: context.tenantId,
      conversation_id: original.conversation_id ?? null,
      user_id: context.userId,
      tool_name: original.tool_name,
      target_entity_type: prepared.targetEntityType,
      target_entity_id: prepared.targetEntityId,
      mutation_input: prepared.mutationInput,
      current_values: prepared.currentValues,
      status: 'pending',
      approved_at: null,
      rejected_at: null,
      executed_at: null,
      expires_at: expiresAt,
      error_message: null,
      created_at: now,
    }));

    return this.toPreviewDto(preview);
  }

  async listConversationPreviews(
    context: AiExecutionContextWithManager,
    conversationId: string,
  ): Promise<AiMutationPreviewDto[]> {
    await this.expireStalePreviews(context.manager, context.tenantId, {
      conversationId,
      userId: context.userId,
    });

    const previews = await this.getRepo(context.manager).find({
      where: {
        tenant_id: context.tenantId,
        conversation_id: conversationId,
        user_id: context.userId,
      },
      order: {
        created_at: 'DESC',
      },
      take: MAX_CONVERSATION_PREVIEWS,
    });

    return previews
      .slice()
      .reverse()
      .map((preview) => this.toPreviewDto(preview));
  }

  async hasExecutedUndoablePreviewInConversation(
    context: AiExecutionContextWithManager,
    conversationId: string | null | undefined,
  ): Promise<boolean> {
    if (!conversationId) {
      return false;
    }

    const undoableToolNames = this.operations.getReversibleToolNames();
    if (undoableToolNames.length === 0) {
      return false;
    }

    const count = await this.getRepo(context.manager).count({
      where: {
        tenant_id: context.tenantId,
        conversation_id: conversationId,
        user_id: context.userId,
        status: 'executed',
        tool_name: In(undoableToolNames),
      },
    });

    return count > 0;
  }
}
