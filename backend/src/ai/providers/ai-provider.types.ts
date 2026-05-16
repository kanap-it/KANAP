export type AiProviderId = 'anthropic' | 'openai' | 'ollama' | 'custom';
export type AiSystemPromptRole = 'system' | 'developer';
export type AiMaxTokensParam = 'max_completion_tokens' | 'max_tokens';

export interface AiProviderCapabilities {
  supportsStreaming: boolean;
  supportsToolCalling: boolean;
  requiresApiKey: boolean;
  allowsCustomEndpoint: boolean;
  contextWindow?: number | null;
}

export interface AiProviderDescriptor {
  id: AiProviderId;
  label: string;
  description: string;
  capabilities: AiProviderCapabilities;
}

export interface AiProviderSettingsSnapshot {
  llm_provider: string | null;
  llm_model: string | null;
  llm_endpoint_url: string | null;
  has_llm_api_key: boolean;
}

export type AiProviderTestResult = {
  ok: boolean;
  provider: string | null;
  model: string | null;
  latency_ms: number | null;
  message: string;
  validation_errors: string[];
};

export type AiProviderImageAttachment = {
  mime_type: string;
  /** Base64-encoded image bytes (no data: prefix). */
  base64_data: string;
};

export type AiProviderMessage = {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  /**
   * Image attachments for multimodal models. Only honored by providers that advertise
   * multimodal support (currently Anthropic). Other providers ignore the field and send
   * text-only messages — this keeps the type flexible without breaking existing adapters.
   */
  images?: AiProviderImageAttachment[] | null;
  tool_calls?: AiProviderToolCall[] | null;
  tool_call_id?: string | null;
};

export type AiProviderToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type AiProviderToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type AiStreamParams = {
  providerId?: AiProviderId;
  model: string;
  apiKey: string | null;
  endpointUrl: string | null;
  systemPrompt: string;
  systemPromptRole?: AiSystemPromptRole;
  messages: AiProviderMessage[];
  tools: AiProviderToolDef[];
  maxTokens: number;
  maxTokensParam?: AiMaxTokensParam;
  signal?: AbortSignal | null;
  timeoutMs?: number;
  maxRetries?: number;
  parallelToolCalls?: boolean;
  debugTrace?: boolean;
};

export type AiProviderDebugTraceName =
  | 'provider_stream_opened'
  | 'provider_first_raw_chunk'
  | 'provider_first_text_delta'
  | 'provider_first_tool_delta'
  | 'provider_tool_call_completed';

export type AiStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_delta'; id: string; arguments: string }
  | { type: 'tool_call_end'; id: string }
  | { type: 'debug_trace'; name: AiProviderDebugTraceName; tool_name?: string | null }
  | { type: 'done'; usage?: { input_tokens: number; output_tokens: number } }
  | { type: 'error'; message: string };

export interface AiProviderAdapter {
  readonly descriptor: AiProviderDescriptor;
  validateConfiguration(settings: AiProviderSettingsSnapshot): string[];
  createStream(params: AiStreamParams): AsyncGenerator<AiStreamEvent>;
}
