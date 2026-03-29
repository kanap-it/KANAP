import { z } from 'zod';
import { AiMutationPreview } from '../ai-mutation-preview.entity';
import {
  AiExecutionContextWithManager,
  AiMutationPreviewChangeDto,
  AiMutationPreviewDto,
  AiMutationWriteToolName,
  AiWritePreviewCapabilityDto,
} from '../ai.types';

export type AiPreparedMutationPreview = {
  targetEntityType: string;
  targetEntityId: string | null;
  mutationInput: Record<string, unknown>;
  currentValues: Record<string, unknown> | null;
};

export type AiMutationPreviewPresentation = {
  target: AiMutationPreviewDto['target'];
  changes: Record<string, AiMutationPreviewChangeDto>;
  summary: string;
};

export interface AiMutationOperation<TInput = unknown> {
  readonly toolName: AiMutationWriteToolName;
  readonly description: string;
  readonly inputSchema: z.ZodTypeAny;
  readonly inputSummary: Record<string, string>;
  readonly businessResource: string;
  readonly writePreview: AiWritePreviewCapabilityDto;

  prepareCreatePreview(
    context: AiExecutionContextWithManager,
    input: TInput,
  ): Promise<AiPreparedMutationPreview>;

  presentPreview(preview: AiMutationPreview): AiMutationPreviewPresentation;

  executePreview(
    context: AiExecutionContextWithManager,
    preview: AiMutationPreview,
  ): Promise<void>;

  prepareReversePreview?(
    context: AiExecutionContextWithManager,
    preview: AiMutationPreview,
  ): Promise<AiPreparedMutationPreview>;
}
