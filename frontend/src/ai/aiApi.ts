import { getAccessToken } from '../auth/accessTokenStore';
import api from '../api';
import { ChatStreamEvent, AiApiKeyRecord, ChatConversation } from './aiTypes';

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
    const text = await response.text().catch(() => 'Stream request failed.');
    throw new Error(text);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body.');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

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
}

export const aiConversationsApi = {
  async list(): Promise<ChatConversation[]> {
    const res = await api.get('/ai/conversations');
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
