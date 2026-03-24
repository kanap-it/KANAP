import { getAccessToken } from '../auth/accessTokenStore';
import api from '../api';
import { ChatStreamEvent, AiApiKeyRecord, ChatConversation } from './aiTypes';
import i18n from '../i18n';

const MAX_STREAM_BUFFER_CHARS = 1_048_576;

export type ProviderDescriptor = {
  id: string;
  label: string;
  description: string;
  capabilities: {
    supportsStreaming: boolean;
    supportsToolCalling: boolean;
    requiresApiKey: boolean;
    allowsCustomEndpoint: boolean;
  };
};

export type AiWebSearchTestResult = {
  ok: boolean;
  message: string;
  latency_ms: number | null;
};

export type AiSettingsPayload = {
  instance_features: { ai_chat: boolean; ai_mcp: boolean; ai_settings: boolean; ai_web_search: boolean };
  settings: {
    chat_enabled: boolean;
    mcp_enabled: boolean;
    llm_provider: string | null;
    llm_endpoint_url: string | null;
    llm_model: string | null;
    mcp_key_max_lifetime_days: number | null;
    conversation_retention_days: number | null;
    web_search_enabled: boolean;
    web_enrichment_enabled: boolean;
    has_llm_api_key: boolean;
    provider_secret_writable: boolean;
    provider_validation_errors: string[];
    chat_ready: boolean;
    created_at: string;
    updated_at: string;
  };
  available_providers: ProviderDescriptor[];
};

export type AiProviderTestResult = {
  ok: boolean;
  provider: string | null;
  model: string | null;
  latency_ms: number | null;
  message: string;
  validation_errors: string[];
};

export type AiUsageWindow = {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  message_count: number;
};

export type AiAdminOverview = {
  totals: {
    conversations_all: number;
    conversations_7d: number;
    conversations_30d: number;
    active_users_30d: number;
  };
  usage: {
    current_month: AiUsageWindow;
    last_30_days: AiUsageWindow;
  };
  recent_activity: Array<{
    conversation_id: string;
    title: string | null;
    user_id: string | null;
    provider: string | null;
    model: string | null;
    updated_at: string;
  }>;
};

function getBaseURL(): string {
  const env = import.meta.env.VITE_API_URL as string | undefined;
  if (!env) return 'http://localhost:8080';
  // If relative path (e.g. "/api"), resolve against current origin
  if (env.startsWith('/')) return window.location.origin + env;
  return env;
}

export async function* streamChat(params: {
  message: string;
  conversation_id?: string;
  signal?: AbortSignal;
}): AsyncGenerator<ChatStreamEvent> {
  const { signal, ...body } = params;
  const token = getAccessToken();
  const response = await fetch(`${getBaseURL()}/ai/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => i18n.t('ai:errors.streamRequestFailed'));
    throw new Error(text);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error(i18n.t('ai:errors.noResponseBody'));

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > MAX_STREAM_BUFFER_CHARS) {
        throw new Error(i18n.t('ai:errors.streamBufferExceeded'));
      }

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      if (buffer.length > MAX_STREAM_BUFFER_CHARS) {
        throw new Error(i18n.t('ai:errors.streamBufferExceeded'));
      }

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          yield JSON.parse(trimmed) as ChatStreamEvent;
        } catch {
          // skip malformed lines
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer.trim()) as ChatStreamEvent;
      } catch {
        // skip
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore reader cleanup errors
    }
  }
}

export const aiConversationsApi = {
  async list(params?: { page?: number; limit?: number }): Promise<ChatConversation[]> {
    const res = await api.get('/ai/conversations', { params });
    return res.data;
  },
  async getMessages(id: string) {
    const res = await api.get(`/ai/conversations/${id}/messages`);
    return res.data;
  },
  async archive(id: string) {
    const res = await api.delete(`/ai/conversations/${id}`);
    return res.data;
  },
};

export const aiAdminApi = {
  async getSettings(): Promise<AiSettingsPayload> {
    const res = await api.get('/ai/settings');
    return res.data;
  },
  async updateSettings(payload: Record<string, unknown>): Promise<{ settings: AiSettingsPayload['settings'] }> {
    const res = await api.patch('/ai/settings', payload);
    return res.data;
  },
  async testProvider(payload: Record<string, unknown>): Promise<AiProviderTestResult> {
    const res = await api.post('/ai/settings/test-provider', payload);
    return res.data;
  },
  async testWebSearch(): Promise<AiWebSearchTestResult> {
    const res = await api.post('/ai/settings/test-web-search');
    return res.data;
  },
  async getOverview(): Promise<AiAdminOverview> {
    const res = await api.get('/ai/admin/overview');
    return res.data;
  },
};

export const aiKeysApi = {
  async create(params: { label: string; expires_at?: string }): Promise<{ key: string; record: AiApiKeyRecord }> {
    const res = await api.post('/ai/keys', params);
    return res.data;
  },
  async list(): Promise<AiApiKeyRecord[]> {
    const res = await api.get('/ai/keys');
    return res.data;
  },
  async revoke(id: string): Promise<AiApiKeyRecord> {
    const res = await api.delete(`/ai/keys/${id}`);
    return res.data;
  },
  async adminList(): Promise<AiApiKeyRecord[]> {
    const res = await api.get('/ai/admin/keys');
    return res.data;
  },
  async adminRevoke(id: string): Promise<AiApiKeyRecord> {
    const res = await api.delete(`/ai/admin/keys/${id}`);
    return res.data;
  },
};
