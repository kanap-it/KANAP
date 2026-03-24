import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { streamChat, aiConversationsApi } from './aiApi';
import { ChatMessage, ChatStreamEvent } from './aiTypes';
import i18n from '../i18n';

let msgCounter = 0;
function nextId() {
  return `local-${++msgCounter}-${Date.now()}`;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamGenerationRef = useRef(0);

  const abortActiveStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    streamGenerationRef.current += 1;
  }, []);

  // Abort in-flight stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, [abortActiveStream]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setError(null);
    setIsStreaming(true);

    const generation = ++streamGenerationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = nextId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      toolCalls: [],
      toolResults: [],
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const stream = streamChat({
        message: text,
        conversation_id: conversationId || undefined,
        signal: controller.signal,
      });

      for await (const event of stream) {
        if (generation !== streamGenerationRef.current) {
          break;
        }

        switch (event.type) {
          case 'conversation':
            setConversationId(event.id);
            break;

          case 'text_delta':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.text }
                  : m,
              ),
            );
            break;

          case 'tool_call':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: [
                        ...(m.toolCalls || []),
                        { id: event.id, name: event.name, arguments: event.arguments },
                      ],
                    }
                  : m,
              ),
            );
            break;

          case 'tool_result':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolResults: [
                        ...(m.toolResults || []),
                        { id: event.id, name: event.name, result: event.result },
                      ],
                    }
                  : m,
              ),
            );
            break;

          case 'done':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, isStreaming: false, usage: event.usage }
                  : m,
              ),
            );
            break;

          case 'error':
            setError(event.message);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, isStreaming: false, content: m.content || i18n.t('ai:errors.generic') }
                  : m,
              ),
            );
            break;
        }
      }

      if (generation !== streamGenerationRef.current) {
        return;
      }
    } catch (err: any) {
      if (generation !== streamGenerationRef.current) {
        return;
      }
      if (err.name === 'AbortError') {
        // Navigation away or manual cancel — mark assistant as done, no error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        );
      } else {
        setError(err.message || i18n.t('ai:errors.sendFailed'));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        );
      }
    } finally {
      if (generation === streamGenerationRef.current) {
        abortRef.current = null;
        setIsStreaming(false);
      }
    }
  }, [conversationId, isStreaming]);

  const loadConversation = useCallback(async (id: string) => {
    abortActiveStream();
    setError(null);
    setConversationId(id);
    setIsStreaming(false);

    const rawMessages = await aiConversationsApi.getMessages(id);
    const loaded: ChatMessage[] = [];

    let i = 0;
    while (i < rawMessages.length) {
      const msg = rawMessages[i];

      if (msg.role === 'user') {
        loaded.push({
          id: msg.id,
          role: 'user',
          content: msg.content,
        });
        i++;
      } else if (msg.role === 'assistant' && msg.tool_calls?.length) {
        // Start merging: assistant with tool_calls + following tool/assistant messages
        const merged: ChatMessage = {
          id: msg.id,
          role: 'assistant',
          content: '',
          toolCalls: [...msg.tool_calls],
          toolResults: [],
          usage: msg.usage_json || undefined,
        };
        i++;

        // Consume following tool messages and additional assistant+tool_calls iterations
        while (i < rawMessages.length) {
          const next = rawMessages[i];

          if (next.role === 'tool') {
            try {
              const parsed = JSON.parse(next.content);
              merged.toolResults!.push({
                id: parsed.tool_call_id,
                name: parsed.tool_name,
                result: parsed.result,
              });
            } catch {
              // skip malformed tool messages
            }
            i++;
          } else if (next.role === 'assistant' && next.tool_calls?.length) {
            // Another iteration of tool calls — merge them in
            merged.toolCalls!.push(...next.tool_calls);
            if (next.usage_json) merged.usage = next.usage_json;
            i++;
          } else if (next.role === 'assistant' && !next.tool_calls?.length) {
            // Final response text
            merged.content = next.content;
            if (next.usage_json) merged.usage = next.usage_json;
            i++;
            break;
          } else {
            break;
          }
        }

        loaded.push(merged);
      } else if (msg.role === 'assistant') {
        loaded.push({
          id: msg.id,
          role: 'assistant',
          content: msg.content,
          usage: msg.usage_json || undefined,
        });
        i++;
      } else {
        // Skip unexpected roles (standalone tool messages without preceding assistant)
        i++;
      }
    }

    setMessages(loaded);
  }, [abortActiveStream]);

  const newConversation = useCallback(() => {
    abortActiveStream();
    setMessages([]);
    setConversationId(null);
    setError(null);
    setIsStreaming(false);
  }, [abortActiveStream]);

  const cancelStream = useCallback(() => {
    abortActiveStream();
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m,
      ),
    );
    setIsStreaming(false);
  }, [abortActiveStream]);

  return useMemo(() => ({
    messages,
    isStreaming,
    error,
    conversationId,
    sendMessage,
    loadConversation,
    newConversation,
    cancelStream,
  }), [messages, isStreaming, error, conversationId, sendMessage, loadConversation, newConversation, cancelStream]);
}
