export type AiMutationWriteToolName =
  | 'create_document'
  | 'update_document_content'
  | 'update_document_metadata'
  | 'update_document_relations'
  | 'update_task_status'
  | 'update_task_assignee'
  | 'add_task_comment';

export type AiMutationPreviewStatus =
  | 'pending'
  | 'rejected'
  | 'executed'
  | 'expired'
  | 'failed';

export type AiMutationPreview = {
  preview_id: string;
  tool_name: AiMutationWriteToolName;
  status: AiMutationPreviewStatus;
  target: {
    entity_type: string;
    entity_id: string | null;
    ref: string | null;
    title: string | null;
  };
  changes: Record<string, {
    label?: string | null;
    from: string | null;
    to: string | null;
    format?: 'text' | 'markdown';
  }>;
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

export type TokenUsage = {
  input_tokens: number;
  output_tokens: number;
};

export type BuiltinUsage = {
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
  | ({ type: 'preview' } & AiMutationPreview)
  | ({ type: 'preview_result' } & AiMutationPreview)
  | { type: 'done'; usage?: TokenUsage; last_usage?: TokenUsage; conversation_usage?: TokenUsage; builtin_usage?: BuiltinUsage }
  | { type: 'error'; message: string; last_usage?: TokenUsage; conversation_usage?: TokenUsage; builtin_usage?: BuiltinUsage };

export type StoredChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }> | null;
  usage_json?: TokenUsage | null;
  created_at?: string;
};

export type ConversationMessagesResponse = {
  messages: StoredChatMessage[];
  conversation_usage: TokenUsage;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ id: string; name: string; result: unknown }>;
  usage?: TokenUsage;
  isStreaming?: boolean;
  hidden?: boolean;
};

export type ChatConversation = {
  id: string;
  title: string | null;
  provider?: string | null;
  model?: string | null;
  created_at: string;
  updated_at: string;
};

export type AiApiKeyRecord = {
  id: string;
  tenant_id: string;
  user_id: string;
  key_prefix: string;
  label: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  revocation_reason: string | null;
  created_at: string;
  created_by_user_id: string;
};
