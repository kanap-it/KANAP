import { AiMutationPreview } from '../ai-mutation-preview.entity';

export type AiMutationAuditOptions = {
  source: 'ai_chat';
  sourceRef: string;
};

export function buildAiMutationAudit(
  preview: Pick<AiMutationPreview, 'id'>,
): AiMutationAuditOptions {
  return {
    source: 'ai_chat',
    sourceRef: preview.id,
  };
}
