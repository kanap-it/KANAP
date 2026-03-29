import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from '../useChat';
import { aiConversationsApi, streamChat } from '../aiApi';

let capturedSignal: AbortSignal | null = null;

function abortError() {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

function waitForAbort(signal?: AbortSignal | null) {
  return new Promise<void>((_, reject) => {
    if (!signal) {
      reject(abortError());
      return;
    }

    if (signal.aborted) {
      reject(abortError());
      return;
    }

    const onAbort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(abortError());
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

vi.mock('../aiApi', () => ({
  streamChat: vi.fn(),
  aiConversationsApi: {
    getMessages: vi.fn(),
    getPreviews: vi.fn(),
  },
}));

describe('useChat', () => {
  beforeEach(() => {
    capturedSignal = null;
    vi.clearAllMocks();
  });

  it('aborts an in-flight stream when loading another conversation', async () => {
    vi.mocked(streamChat).mockImplementation(async function* ({ signal }: { signal?: AbortSignal }) {
      capturedSignal = signal ?? null;
      yield { type: 'conversation', id: 'conversation-old', title: 'Old conversation' };
      await waitForAbort(signal);
      yield { type: 'text_delta', text: 'late text' };
    });
    vi.mocked(aiConversationsApi.getMessages).mockResolvedValue({
      messages: [
        { id: 'msg-1', role: 'user', content: 'Loaded user message' },
        { id: 'msg-2', role: 'assistant', content: 'Loaded assistant reply' },
      ],
      conversation_usage: { input_tokens: 8, output_tokens: 3 },
    });
    vi.mocked(aiConversationsApi.getPreviews).mockResolvedValue([]);

    const { result } = renderHook(() => useChat());

    act(() => {
      void result.current.sendMessage('start stream');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    await act(async () => {
      await result.current.loadConversation('conversation-new');
    });

    await waitFor(() => {
      expect(capturedSignal?.aborted).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.conversationId).toBe('conversation-new');
      expect(result.current.isStreaming).toBe(false);
      expect(result.current.conversationUsage).toEqual({ input_tokens: 8, output_tokens: 3 });
      expect(result.current.lastRequestUsage).toBeNull();
      expect(result.current.messages).toEqual([
        { id: 'msg-1', role: 'user', content: 'Loaded user message', hidden: false },
        { id: 'msg-2', role: 'assistant', content: 'Loaded assistant reply', usage: undefined },
      ]);
    });

    expect(result.current.messages).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ content: expect.stringContaining('late text') }),
      ]),
    );
  });

  it('merges stored assistant tool history into a single assistant message', async () => {
    vi.mocked(aiConversationsApi.getMessages).mockResolvedValue({
      messages: [
        { id: 'user-1', role: 'user', content: 'Find the CRM runbook' },
        {
          id: 'assistant-1',
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: 'tool-call-1',
              name: 'search_knowledge',
              arguments: { query: 'CRM runbook' },
            },
          ],
          usage_json: { input_tokens: 10, output_tokens: 4 },
        },
        {
          id: 'tool-1',
          role: 'tool',
          content: JSON.stringify({
            tool_call_id: 'tool-call-1',
            tool_name: 'search_knowledge',
            result: { items: [{ id: 'doc-1', title: 'CRM runbook' }] },
          }),
        },
        {
          id: 'assistant-2',
          role: 'assistant',
          content: 'Use the CRM runbook before restarting the service.',
          usage_json: { input_tokens: 12, output_tokens: 18 },
        },
      ],
      conversation_usage: { input_tokens: 22, output_tokens: 22 },
    });
    vi.mocked(aiConversationsApi.getPreviews).mockResolvedValue([]);

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.loadConversation('conversation-1');
    });

    expect(result.current.conversationId).toBe('conversation-1');
    expect(result.current.conversationUsage).toEqual({ input_tokens: 22, output_tokens: 22 });
    expect(result.current.lastRequestUsage).toEqual({ input_tokens: 12, output_tokens: 18 });
    expect(result.current.messages).toEqual([
      {
        id: 'user-1',
        role: 'user',
        content: 'Find the CRM runbook',
        hidden: false,
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Use the CRM runbook before restarting the service.',
        toolCalls: [
          {
            id: 'tool-call-1',
            name: 'search_knowledge',
            arguments: { query: 'CRM runbook' },
          },
        ],
        toolResults: [
          {
            id: 'tool-call-1',
            name: 'search_knowledge',
            result: { items: [{ id: 'doc-1', title: 'CRM runbook' }] },
          },
        ],
        usage: { input_tokens: 12, output_tokens: 18 },
      },
    ]);
  });

  it('surfaces streamed error events on the assistant message', async () => {
    vi.mocked(streamChat).mockImplementation(async function* () {
      yield { type: 'conversation', id: 'conversation-1', title: 'Broken stream' };
      yield {
        type: 'error',
        message: 'Provider unavailable',
        last_usage: { input_tokens: 6, output_tokens: 2 },
        conversation_usage: { input_tokens: 9, output_tokens: 4 },
      };
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('hello');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    expect(result.current.error).toBe('Provider unavailable');
    expect(result.current.conversationUsage).toEqual({ input_tokens: 9, output_tokens: 4 });
    expect(result.current.lastRequestUsage).toEqual({ input_tokens: 6, output_tokens: 2 });
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        role: 'user',
        content: 'hello',
      }),
      expect.objectContaining({
        role: 'assistant',
        content: 'An error occurred.',
        isStreaming: false,
      }),
    ]);
  });

  it('cancels an in-flight stream without surfacing an error', async () => {
    vi.mocked(streamChat).mockImplementation(async function* ({ signal }: { signal?: AbortSignal }) {
      capturedSignal = signal ?? null;
      yield { type: 'conversation', id: 'conversation-1', title: 'Cancelable' };
      await waitForAbort(signal);
    });

    const { result } = renderHook(() => useChat());

    act(() => {
      void result.current.sendMessage('start stream');
    });

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true);
    });

    act(() => {
      result.current.cancelStream();
    });

    await waitFor(() => {
      expect(capturedSignal?.aborted).toBe(true);
      expect(result.current.isStreaming).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.messages).toEqual([
      expect.objectContaining({
        role: 'user',
        content: 'start stream',
      }),
      expect.objectContaining({
        role: 'assistant',
        content: '',
        isStreaming: false,
      }),
    ]);
  });

  it('tracks preview events and hides approval markers from visible user messages', async () => {
    vi.mocked(streamChat).mockImplementation(async function* () {
      yield { type: 'conversation', id: 'conversation-1', title: 'Approval flow' };
      yield {
        type: 'preview',
        preview_id: 'preview-1',
        tool_name: 'update_task_status',
        status: 'pending',
        target: { entity_type: 'tasks', entity_id: 'task-1', ref: 'T-1', title: 'Test task' },
        changes: { status: { from: 'open', to: 'done' } },
        requires_confirmation: true,
        actions: ['approve', 'reject'],
        summary: 'Update T-1 status from open to done.',
        error_message: null,
        conversation_id: 'conversation-1',
        created_at: '2026-03-24T10:00:00.000Z',
        expires_at: '2026-03-24T10:10:00.000Z',
        approved_at: null,
        rejected_at: null,
        executed_at: null,
      };
      yield {
        type: 'done',
        usage: { input_tokens: 1, output_tokens: 1 },
        last_usage: { input_tokens: 1, output_tokens: 1 },
        conversation_usage: { input_tokens: 11, output_tokens: 6 },
      };
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage('[APPROVE:11111111-1111-4111-8111-111111111111]');
    });

    expect(result.current.messages[0]).toEqual(
      expect.objectContaining({
        role: 'user',
        hidden: true,
      }),
    );
    expect(result.current.previews).toEqual([
      expect.objectContaining({
        preview_id: 'preview-1',
        status: 'pending',
      }),
    ]);
    expect(result.current.conversationUsage).toEqual({ input_tokens: 11, output_tokens: 6 });
    expect(result.current.lastRequestUsage).toEqual({ input_tokens: 1, output_tokens: 1 });
  });
});
