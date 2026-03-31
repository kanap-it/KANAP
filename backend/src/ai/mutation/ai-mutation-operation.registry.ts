import { BadRequestException, Injectable } from '@nestjs/common';
import { AiMutationWriteToolName } from '../ai.types';
import { AddTaskCommentAiMutationOperation } from './operations/add-task-comment.ai-mutation-operation';
import { CreateDocumentAiMutationOperation } from './operations/create-document.ai-mutation-operation';
import { CreateTaskAiMutationOperation } from './operations/create-task.ai-mutation-operation';
import { UpdateDocumentContentAiMutationOperation } from './operations/update-document-content.ai-mutation-operation';
import { UpdateDocumentMetadataAiMutationOperation } from './operations/update-document-metadata.ai-mutation-operation';
import { UpdateDocumentRelationsAiMutationOperation } from './operations/update-document-relations.ai-mutation-operation';
import { UpdateTaskAssigneeAiMutationOperation } from './operations/update-task-assignee.ai-mutation-operation';
import { UpdateTaskStatusAiMutationOperation } from './operations/update-task-status.ai-mutation-operation';
import { AiMutationOperation } from './ai-mutation-operation.types';

@Injectable()
export class AiMutationOperationRegistry {
  private readonly operations = new Map<AiMutationWriteToolName, AiMutationOperation<any>>();

  constructor(
    createDocument: CreateDocumentAiMutationOperation,
    createTask: CreateTaskAiMutationOperation,
    updateDocumentContent: UpdateDocumentContentAiMutationOperation,
    updateDocumentMetadata: UpdateDocumentMetadataAiMutationOperation,
    updateDocumentRelations: UpdateDocumentRelationsAiMutationOperation,
    updateTaskStatus: UpdateTaskStatusAiMutationOperation,
    updateTaskAssignee: UpdateTaskAssigneeAiMutationOperation,
    addTaskComment: AddTaskCommentAiMutationOperation,
  ) {
    for (const operation of [
      createDocument,
      createTask,
      updateDocumentContent,
      updateDocumentMetadata,
      updateDocumentRelations,
      updateTaskStatus,
      updateTaskAssignee,
      addTaskComment,
    ]) {
      this.operations.set(operation.toolName, operation);
    }
  }

  listOperations(): AiMutationOperation<any>[] {
    return Array.from(this.operations.values());
  }

  getOperation<TInput = unknown>(toolName: string): AiMutationOperation<TInput> {
    const operation = this.operations.get(toolName as AiMutationWriteToolName);
    if (!operation) {
      throw new BadRequestException('Unsupported preview type.');
    }
    return operation as AiMutationOperation<TInput>;
  }

  getOperationOrNull(toolName: string): AiMutationOperation<any> | null {
    return this.operations.get(toolName as AiMutationWriteToolName) ?? null;
  }

  isSupportedToolName(toolName: string): toolName is AiMutationWriteToolName {
    return this.operations.has(toolName as AiMutationWriteToolName);
  }

  getReversibleToolNames(): AiMutationWriteToolName[] {
    return this.listOperations()
      .filter((operation) => operation.writePreview.reversible)
      .map((operation) => operation.toolName);
  }
}
