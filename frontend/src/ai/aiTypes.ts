export type ChatStreamEvent =
  | { type: 'conversation'; id: string; title: string }
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string; name: string; arguments: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; result: unknown }
  | { type: 'done'; usage?: { input_tokens: number; output_tokens: number } }
  | { type: 'error'; message: string };

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ id: string; name: string; result: unknown }>;
  usage?: { input_tokens: number; output_tokens: number };
  isStreaming?: boolean;
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
