import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { z } from 'zod';
import { KnowledgeService } from '../../../knowledge/knowledge.service';
import { AiMutationPreview } from '../../ai-mutation-preview.entity';
import { AiExecutionContextWithManager } from '../../ai.types';
import {
  AI_DOCUMENT_RELATION_INPUT_SHAPE,
  AI_DOCUMENT_RELATION_WRITE_FIELDS,
  extractAiDocumentRelationInput,
  getAiDocumentRelationInputSummary,
  hasAiDocumentRelationInput,
} from '../ai-document-relation-input';
import { AiDocumentMutationSupportService } from '../ai-document-mutation-support.service';
import {
  AiMutationOperation,
  AiMutationPreviewPresentation,
  AiPreparedMutationPreview,
} from '../ai-mutation-operation.types';

type UpdateDocumentRelationsInput = {
  document_id: string;
  relations: ReturnType<typeof extractAiDocumentRelationInput>;
};

function textOrNull(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized || null;
}

function buildTarget(preview: AiMutationPreview): AiMutationPreviewPresentation['target'] {
  const current = preview.current_values ?? {};
  return {
    entity_type: 'documents',
    entity_id: preview.target_entity_id ?? null,
    ref: typeof current.target_ref === 'string' ? current.target_ref : null,
    title: typeof current.target_title === 'string' ? current.target_title : null,
  };
}

const UpdateDocumentRelationsInputSchema = z.object({
  document_id: z.union([z.string().trim().min(1), z.null()]).optional()
    .describe('The document UUID, DOC reference, or document title. Prefer a DOC reference when available.'),
  document: z.union([z.string().trim().min(1), z.null()]).optional()
    .describe('Alias for document_id.'),
  ...AI_DOCUMENT_RELATION_INPUT_SHAPE,
}).superRefine((value, ctx) => {
  if (value.document_id == null && value.document == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'document_id is required.',
      path: ['document_id'],
    });
  }
  if (
    value.document_id != null
    && value.document != null
    && String(value.document_id) !== String(value.document)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '`document_id` and `document` must match when both are provided.',
      path: ['document'],
    });
  }

  const relations = extractAiDocumentRelationInput(value, ctx);
  if (!hasAiDocumentRelationInput(relations)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'At least one linked project, request, task, application, or asset must be provided.',
      path: ['projects'],
    });
  }
}).transform((value): UpdateDocumentRelationsInput => ({
  document_id: String(value.document_id ?? value.document ?? ''),
  relations: extractAiDocumentRelationInput(value),
}));

@Injectable()
export class UpdateDocumentRelationsAiMutationOperation implements AiMutationOperation<UpdateDocumentRelationsInput> {
  private readonly logger = new Logger(UpdateDocumentRelationsAiMutationOperation.name);

  readonly toolName = 'update_document_relations' as const;
  readonly description = 'Create a preview to add one or more linked projects, requests, tasks, applications, or assets to one knowledge document. This tool is add-only in the current milestone and requires explicit user approval before execution.';
  readonly inputSchema = UpdateDocumentRelationsInputSchema;
  readonly inputSummary = {
    document_id: 'The document UUID, DOC reference, or document title. Prefer a DOC reference when available.',
    ...getAiDocumentRelationInputSummary(),
  };
  readonly businessResource = 'knowledge';
  readonly writePreview = {
    entity_type: 'documents',
    fields: [...AI_DOCUMENT_RELATION_WRITE_FIELDS],
    reversible: false,
    prompt_hint: 'For relation-only document changes, use `update_document_relations`. This tool adds linked projects, requests, tasks, applications, or assets to one document. If the document or a relation target is ambiguous, ask the user to confirm before retrying.',
  };

  constructor(
    private readonly support: AiDocumentMutationSupportService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async prepareCreatePreview(
    context: AiExecutionContextWithManager,
    input: UpdateDocumentRelationsInput,
  ): Promise<AiPreparedMutationPreview> {
    const requestedRelations = input.relations ?? extractAiDocumentRelationInput(input as unknown as Record<string, unknown>);
    const documentRef = textOrNull(input.document_id);
    if (!documentRef) {
      throw new BadRequestException('document_id is required.');
    }

    const document = await this.support.resolveDocumentSnapshot(context, documentRef);
    await this.support.assertUpdatePreviewAllowed(context, document.document_id);
    this.support.assertRelationEditingAllowed(document);

    const resolvedRelations = await this.support.resolveRelationTargets(context, requestedRelations);
    const relationMutation = this.support.buildRelationAdditionMutation(document.relations, resolvedRelations);
    if (relationMutation.changedTypes.length === 0) {
      throw new BadRequestException('Document relations already include the requested links.');
    }

    return {
      targetEntityType: 'documents',
      targetEntityId: document.document_id,
      mutationInput: {
        relations: relationMutation.nextRelations,
        relation_labels: relationMutation.nextRelationLabels,
      },
      currentValues: {
        target_ref: document.target_ref,
        target_title: document.target_title,
        revision: document.revision,
        relation_snapshot: relationMutation.currentRelationSnapshot,
      },
    };
  }

  presentPreview(preview: AiMutationPreview): AiMutationPreviewPresentation {
    const current = preview.current_values ?? {};
    const mutation = preview.mutation_input ?? {};
    const ref = textOrNull(current.target_ref) ?? 'document';

    let summary = `Preview ${preview.id} ${preview.status}.`;
    switch (preview.status) {
      case 'pending':
        summary = `Add links to ${ref}.`;
        break;
      case 'executed':
        summary = `${ref} links updated.`;
        break;
      case 'rejected':
        summary = `Link update for ${ref} was rejected.`;
        break;
      case 'expired':
        summary = `Link update preview for ${ref} expired before approval.`;
        break;
      case 'failed':
        summary = preview.error_message || `Link update for ${ref} failed.`;
        break;
    }

    return {
      target: buildTarget(preview),
      changes: this.support.buildRelationPreviewChanges(current.relation_snapshot, mutation.relation_labels),
      summary,
    };
  }

  async executePreview(
    context: AiExecutionContextWithManager,
    preview: AiMutationPreview,
  ): Promise<void> {
    const current = preview.current_values ?? {};
    const mutation = preview.mutation_input ?? {};
    const documentId = preview.target_entity_id;
    if (!documentId) {
      throw new BadRequestException('Preview is missing the target document.');
    }

    const previewRevision = Number(current.revision);
    if (!Number.isFinite(previewRevision)) {
      throw new BadRequestException('Preview is missing the document revision.');
    }

    await this.knowledge.assertWorkflowAllowsEditing(documentId, context.manager);

    const lock = await this.knowledge.acquireLock(documentId, context.userId, {
      manager: context.manager,
    });

    try {
      const liveDocument = await this.support.resolveDocumentSnapshot(context, documentId);
      if (liveDocument.revision !== previewRevision) {
        throw new ConflictException('Document changed after the preview was created.');
      }

      this.support.assertRelationEditingAllowed(liveDocument);
      this.support.assertRelationSnapshotUnchanged(liveDocument, current.relation_snapshot);

      await this.knowledge.update(
        documentId,
        {
          relations: mutation.relations,
          revision: previewRevision,
          save_mode: 'manual',
        },
        context.userId,
        lock.lock_token,
        {
          manager: context.manager,
          audit: {
            source: 'ai_chat',
            sourceRef: preview.conversation_id ?? null,
          },
        },
      );
    } finally {
      try {
        await this.knowledge.releaseLock(documentId, context.userId, lock.lock_token, {
          manager: context.manager,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to release document lock for ${documentId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
