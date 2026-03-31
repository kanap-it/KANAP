import { EntityManager } from 'typeorm';
import { z } from 'zod';

export type AiSurface = 'chat' | 'mcp';
export type AiAuthMethod = 'jwt' | 'api_key';
export type AiMutationWriteToolName =
  | 'create_task'
  | 'create_document'
  | 'update_document_content'
  | 'update_document_metadata'
  | 'update_document_relations'
  | 'update_task_status'
  | 'update_task_assignee'
  | 'add_task_comment';
export type AiToolCategory = 'discovery' | 'authoritative' | 'inspection' | 'mutation';
export type AiToolName =
  | 'search_all'
  | 'query_entities'
  | 'aggregate_entities'
  | 'get_filter_values'
  | 'get_entity_context'
  | 'get_entity_comments'
  | 'search_knowledge'
  | 'get_document'
  | 'web_search'
  | AiMutationWriteToolName
  | 'undo_preview';

export const AiSearchEntityTypeSchema = z.enum([
  'applications',
  'assets',
  'companies',
  'contracts',
  'departments',
  'documents',
  'locations',
  'projects',
  'requests',
  'spend_items',
  'suppliers',
  'tasks',
  'users',
]);

export const AiQueryEntityTypeSchema = AiSearchEntityTypeSchema;
export const AiQueryScopeSchema = z.enum(['me', 'my_team']);

export const AiContextEntityTypeSchema = z.enum([
  'applications',
  'assets',
  'projects',
  'requests',
  'tasks',
]);

export type AiSearchEntityType = z.infer<typeof AiSearchEntityTypeSchema>;
export type AiContextEntityType = z.infer<typeof AiContextEntityTypeSchema>;
export type AiQueryEntityType = z.infer<typeof AiQueryEntityTypeSchema>;
export type AiQueryScope = z.infer<typeof AiQueryScopeSchema>;

export type AiExecutionContext = {
  tenantId: string;
  userId: string;
  isPlatformHost: boolean;
  surface: AiSurface;
  authMethod: AiAuthMethod;
  conversationId?: string | null;
  requestId?: string | null;
  aiApiKeyId?: string | null;
};

export type AiExecutionContextWithManager = AiExecutionContext & {
  manager: EntityManager;
};

export type AiEntityMetadataScalar = string | number | boolean | null;
export type AiEntityMetadataObject = Record<string, AiEntityMetadataScalar>;
export type AiEntityMetadataValue =
  | AiEntityMetadataScalar
  | AiEntityMetadataObject
  | AiEntityMetadataObject[];
export type AiEntityMetadata = Record<string, AiEntityMetadataValue>;

export type AiEntitySummaryDto = {
  type: AiSearchEntityType | AiContextEntityType;
  id: string;
  ref: string | null;
  label: string;
  status: string | null;
  summary: string | null;
  updated_at: string | null;
  match_context?: string | null;
  metadata?: AiEntityMetadata | null;
};

export type AiEntityRelationshipGroupDto = {
  relation: string;
  label: string;
  items: AiEntitySummaryDto[];
};

export type AiKnowledgeContextSourceDto = {
  entity_type: string;
  entity_id: string;
  ref: string | null;
  label: string;
  status: string | null;
};

export type AiKnowledgeContextItemDto = {
  id: string;
  ref: string | null;
  title: string;
  summary: string | null;
  status: string;
  updated_at: string | null;
  created_at: string | null;
  provenance: AiKnowledgeContextSourceDto[];
};

export type AiKnowledgeContextGroupDto = {
  key: string;
  label: string;
  linked_via_label: string;
  total: number;
  items: AiKnowledgeContextItemDto[];
};

export type AiKnowledgeContextDto = {
  access: 'granted' | 'restricted';
  total: number;
  groups: AiKnowledgeContextGroupDto[];
};

export type AiEntityContextPayloadDto = {
  entity: Omit<AiEntitySummaryDto, 'metadata'> & {
    metadata: AiEntityMetadata;
  };
  related: AiEntityRelationshipGroupDto[];
  knowledge: AiKnowledgeContextDto | null;
};

export type AiEntityContextDto = AiEntityContextPayloadDto & {
  complete: boolean;
};

export type AiEntityCommentDto = {
  author: string | null;
  content: string | null;
  created_at: string | null;
  updated_at: string | null;
  edited: boolean;
};

export type AiEntityCommentsDto = {
  entity: {
    type: Extract<AiContextEntityType, 'projects' | 'tasks'>;
    id: string;
    ref: string | null;
    label: string;
  };
  items: AiEntityCommentDto[];
  total: number;
  offset: number;
  limit: number;
  returned: number;
  truncated: boolean;
  complete: boolean;
};

export type AiKnowledgeSearchResultDto = {
  id: string;
  ref: string;
  title: string;
  summary: string | null;
  status: string;
  snippet: string | null;
  library: {
    id: string | null;
    name: string | null;
  };
  updated_at: string | null;
};

export type AiDocumentDto = {
  id: string;
  ref: string;
  title: string;
  summary: string | null;
  status: string;
  content_markdown: string;
  updated_at: string | null;
  library: {
    id: string | null;
    name: string | null;
    slug: string | null;
  };
  folder: {
    id: string | null;
    name: string | null;
  };
  document_type: {
    id: string | null;
    name: string | null;
  };
  relations: Record<string, AiEntitySummaryDto[]>;
  contributors: Array<{
    name: string;
    role: string;
    is_primary: boolean;
  }>;
  complete: boolean;
};

export type AiToolDefinition<TInput = unknown, TResult = unknown> = {
  name: AiToolName;
  category: AiToolCategory;
  description: string;
  inputSchema: z.ZodType<TInput>;
  inputSummary: Record<string, string>;
  surfaces: AiSurface[];
  readOnly: boolean;
  writePreview?: AiWritePreviewCapabilityDto;
  execute: (
    context: AiExecutionContextWithManager,
    input: TInput,
  ) => Promise<TResult>;
};

export type AiWritePreviewCapabilityDto = {
  entity_type: string;
  fields: string[];
  reversible: boolean;
  prompt_hint: string;
};

export type AiToolListItemDto = {
  name: AiToolName;
  category: AiToolCategory;
  description: string;
  input_summary: Record<string, string>;
  read_only: boolean;
  surfaces: AiSurface[];
  write_preview?: AiWritePreviewCapabilityDto;
};

export type AiMutationPreviewStatus =
  | 'pending'
  | 'rejected'
  | 'executed'
  | 'expired'
  | 'failed';

export type AiMutationPreviewChangeDto = {
  label?: string | null;
  from: string | null;
  to: string | null;
  format?: 'text' | 'markdown';
};

export type AiMutationPreviewDto = {
  preview_id: string;
  tool_name: AiMutationWriteToolName;
  status: AiMutationPreviewStatus;
  target: {
    entity_type: string;
    entity_id: string | null;
    ref: string | null;
    title: string | null;
  };
  changes: Record<string, AiMutationPreviewChangeDto>;
  requires_confirmation: boolean;
  actions: Array<'approve' | 'reject'>;
  summary: string;
  error_message: string | null;
  conversation_id: string | null;
  created_at: string;
  expires_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  executed_at: string | null;
};

export type AiTokenUsage = {
  input_tokens: number;
  output_tokens: number;
};

export type AiBuiltinUsageDto = {
  count: number;
  limit: number;
  year_month: string;
  reset_date: string;
};

export type ChatStreamEvent =
  | { type: 'conversation'; id: string; title: string }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; result: unknown }
  | ({ type: 'preview' } & AiMutationPreviewDto)
  | ({ type: 'preview_result' } & AiMutationPreviewDto)
  | { type: 'done'; usage?: AiTokenUsage; last_usage?: AiTokenUsage; conversation_usage?: AiTokenUsage; builtin_usage?: AiBuiltinUsageDto }
  | { type: 'error'; message: string; last_usage?: AiTokenUsage; conversation_usage?: AiTokenUsage; builtin_usage?: AiBuiltinUsageDto };

export type AiSurfaceCapabilityDto = {
  feature_enabled: boolean;
  tenant_enabled: boolean;
  permission_granted: boolean;
  provider_ready: boolean;
  available: boolean;
  reasons: string[];
};

export type AiSettingsCapabilityDto = {
  feature_enabled: boolean;
  permission_granted: boolean;
  available: boolean;
  reasons: string[];
};

export type AiCapabilitiesDto = {
  instance_features: {
    ai_chat: boolean;
    ai_mcp: boolean;
    ai_settings: boolean;
    ai_web_search: boolean;
  };
  surfaces: {
    chat: AiSurfaceCapabilityDto;
    mcp: AiSurfaceCapabilityDto;
    settings: AiSettingsCapabilityDto;
  };
};
