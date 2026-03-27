import { EntityManager } from 'typeorm';
import { z } from 'zod';

export type AiSurface = 'chat' | 'mcp';
export type AiAuthMethod = 'jwt' | 'api_key';
export type AiToolName =
  | 'search_all'
  | 'query_entities'
  | 'aggregate_entities'
  | 'get_filter_values'
  | 'get_entity_context'
  | 'search_knowledge'
  | 'get_document'
  | 'web_search';

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

export type AiEntityContextDto = {
  entity: Omit<AiEntitySummaryDto, 'metadata'> & {
    metadata: AiEntityMetadata;
  };
  related: AiEntityRelationshipGroupDto[];
  knowledge: AiKnowledgeContextDto | null;
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
};

export type AiToolDefinition<TInput = unknown, TResult = unknown> = {
  name: AiToolName;
  description: string;
  inputSchema: z.ZodType<TInput>;
  inputSummary: Record<string, string>;
  surfaces: AiSurface[];
  readOnly: boolean;
  execute: (
    context: AiExecutionContextWithManager,
    input: TInput,
  ) => Promise<TResult>;
};

export type AiToolListItemDto = {
  name: AiToolName;
  description: string;
  input_summary: Record<string, string>;
  read_only: boolean;
  surfaces: AiSurface[];
};

export type ChatStreamEvent =
  | { type: 'conversation'; id: string; title: string }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; result: unknown }
  | { type: 'done'; usage?: { input_tokens: number; output_tokens: number } }
  | { type: 'error'; message: string };

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
