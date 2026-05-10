import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatStreamRequestError, streamChat, aiConversationsApi } from './aiApi';
import { AiMutationPreview, BuiltinUsage, ChatAttachment, ChatMessage, StoredChatMessage, TokenUsage } from './aiTypes';
import i18n from '../i18n';

let msgCounter = 0;
const CONTROL_MARKER_RE = /^\[(APPROVE|REJECT):[0-9a-f-]{36}\]$/i;
/** Hard cap on attachments per message — matches multimodal model practical limit. */
export const MAX_PENDING_ATTACHMENTS = 8;

export type PendingAttachment = {
  /** Local-only id, used to remove the attachment before send. */
  localId: string;
  file: File;
  previewUrl: string;
};

function nextId() {
  return `local-${++msgCounter}-${Date.now()}`;
}

function isControlMarker(text: string): boolean {
  return CONTROL_MARKER_RE.test(String(text || '').trim());
}

function upsertPreview(prev: AiMutationPreview[], next: AiMutationPreview): AiMutationPreview[] {
  const index = prev.findIndex((item) => item.preview_id === next.preview_id);
  if (index === -1) {
    return [...prev, next];
  }
  const copy = [...prev];
  copy[index] = next;
  return copy;
}

function normalizeConversationUsage(usage?: TokenUsage | null): TokenUsage | null {
  if (!usage) {
    return null;
  }

  const inputTokens = Number(usage.input_tokens);
  const outputTokens = Number(usage.output_tokens);
  const normalized = {
    input_tokens: Number.isFinite(inputTokens) ? inputTokens : 0,
    output_tokens: Number.isFinite(outputTokens) ? outputTokens : 0,
  };

  return normalized.input_tokens + normalized.output_tokens > 0 ? normalized : null;
}

function findLastUsage(messages: Array<Pick<StoredChatMessage, 'role' | 'usage_json'>>): TokenUsage | null {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== 'assistant') {
      continue;
    }
    const usage = normalizeConversationUsage(message.usage_json);
    if (usage) {
      return usage;
    }
  }
  return null;
}

/**
 * Reconstruct the UI-facing message timeline from the flat StoredChatMessage[] returned
 * by the backend. Coalesces consecutive assistant+tool message rows into a single
 * ChatMessage with toolCalls + toolResults populated, so the chat thread renders the
 * tool ribbon panel as one block per assistant turn (matching the streaming behavior).
 *
 * Used by both loadConversation (initial load) and the post-stream refresh that swaps
 * local-* ids for real DB UUIDs after a turn completes.
 */
function rebuildMessagesFromStored(rawMessages: StoredChatMessage[], conversationId: string): ChatMessage[] {
  const buildAttachments = (msg: StoredChatMessage): ChatAttachment[] | undefined => {
    if (!msg.attachments || !msg.attachments.length) return undefined;
    return msg.attachments.map((a) => ({
      id: a.id,
      mime_type: a.mime_type,
      size: a.size,
      kind: a.kind,
      preview_url: aiConversationsApi.buildAttachmentUrl(conversationId, a.id),
    }));
  };

  const loaded: ChatMessage[] = [];
  let i = 0;
  while (i < rawMessages.length) {
    const msg = rawMessages[i];

    if (msg.role === 'user') {
      loaded.push({
        id: msg.id,
        role: 'user',
        content: msg.content,
        hidden: isControlMarker(msg.content),
        attachments: buildAttachments(msg),
      });
      i++;
    } else if (msg.role === 'assistant' && msg.tool_calls?.length) {
      const merged: ChatMessage = {
        id: msg.id,
        role: 'assistant',
        content: '',
        toolCalls: [...msg.tool_calls],
        toolResults: [],
        usage: msg.usage_json || undefined,
      };
      i++;
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
          merged.toolCalls!.push(...next.tool_calls);
          if (next.usage_json) merged.usage = next.usage_json;
          i++;
        } else if (next.role === 'assistant' && !next.tool_calls?.length) {
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
      i++;
    }
  }
  return loaded;
}

function normalizeBuiltinUsage(usage?: BuiltinUsage | null): BuiltinUsage | null {
  if (!usage) {
    return null;
  }

  const count = Number(usage.count);
  const limit = Number(usage.limit);

  return {
    count: Number.isFinite(count) ? count : 0,
    limit: Number.isFinite(limit) ? limit : 0,
    year_month: String(usage.year_month || ''),
    reset_date: String(usage.reset_date || ''),
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [previews, setPreviews] = useState<AiMutationPreview[]>([]);
  const [conversationUsage, setConversationUsage] = useState<TokenUsage | null>(null);
  const [lastRequestUsage, setLastRequestUsage] = useState<TokenUsage | null>(null);
  const [builtinUsage, setBuiltinUsage] = useState<BuiltinUsage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  // The id of the message currently being edited (a user message). When set, the next
  // sendMessage call truncates the conversation tail from that message before streaming.
  // Cleared on send completion or explicit cancel.
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const conversationIdRef = useRef<string | null>(null);
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

  // Revoke pending object URLs on unmount to avoid leaks
  useEffect(() => {
    return () => {
      for (const att of pendingAttachments) {
        try { URL.revokeObjectURL(att.previewUrl); } catch { /* ignore */ }
      }
    };
  }, [pendingAttachments]);

  const refreshConversationUsage = useCallback(async (id: string) => {
    try {
      const response = await aiConversationsApi.getMessages(id);
      if (conversationIdRef.current === id) {
        setConversationUsage(normalizeConversationUsage(response.conversation_usage));
        setLastRequestUsage(findLastUsage(response.messages));
      }
    } catch {
      // Ignore usage refresh failures after a terminal stream event.
    }
  }, []);

  const addPendingFiles = useCallback((files: File[]): { added: number; rejected: number } => {
    let added = 0;
    let rejected = 0;
    setPendingAttachments((prev) => {
      const remaining = MAX_PENDING_ATTACHMENTS - prev.length;
      if (remaining <= 0) {
        rejected = files.length;
        return prev;
      }
      const accepted = files.slice(0, remaining);
      rejected = files.length - accepted.length;
      const next = accepted.map((file) => ({
        localId: nextId(),
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      added = next.length;
      return [...prev, ...next];
    });
    return { added, rejected };
  }, []);

  const removePendingAttachment = useCallback((localId: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) {
        try { URL.revokeObjectURL(target.previewUrl); } catch { /* ignore */ }
      }
      return prev.filter((p) => p.localId !== localId);
    });
  }, []);

  const clearPendingAttachments = useCallback(() => {
    setPendingAttachments((prev) => {
      for (const p of prev) {
        try { URL.revokeObjectURL(p.previewUrl); } catch { /* ignore */ }
      }
      return [];
    });
  }, []);

  /**
   * Internal sender shared by `sendMessage` and `regenerate`. Skipping the persist of a
   * new user message (regenerate flow) is opted in via `text === ''` + a non-null
   * truncateFromMessageId. The orchestrator on the backend mirrors that contract.
   */
  const runStream = useCallback(async (
    text: string,
    opts: { truncateFromMessageId?: string | null; isRegenerate?: boolean } = {},
  ) => {
    if (isStreaming) return;
    if (!opts.isRegenerate && !text.trim()) return;
    setError(null);
    setIsStreaming(true);

    const generation = ++streamGenerationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    // Snapshot pending attachments so subsequent UI changes don't mutate the in-flight send.
    const attachmentsToSend = pendingAttachments;

    let activeConversationId = conversationId;
    const truncateFromMessageId = opts.truncateFromMessageId ?? null;

    // Local truncation for immediate UI feedback. Backend will mirror via the
    // truncate_from_message_id param on the stream call.
    if (truncateFromMessageId) {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === truncateFromMessageId);
        return idx >= 0 ? prev.slice(0, idx) : prev;
      });
    }

    // Skip the optimistic user message on regenerate — the previous user message is
    // already in the conversation tail and we're re-streaming against it unchanged.
    let userMsgId: string | null = null;
    if (!opts.isRegenerate) {
      userMsgId = nextId();
      const optimisticUserAttachments: ChatAttachment[] = attachmentsToSend.map((a) => ({
        id: a.localId,
        mime_type: a.file.type || 'image/png',
        size: a.file.size,
        kind: 'image',
        preview_url: a.previewUrl,
      }));
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: text,
        hidden: isControlMarker(text),
        attachments: optimisticUserAttachments.length > 0 ? optimisticUserAttachments : undefined,
      };
      setMessages((prev) => [...prev, userMsg]);
    }

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
      let attachmentIds: string[] | undefined;

      if (attachmentsToSend.length > 0) {
        // Need a conversation_id before we can upload (attachments are conv-scoped for tenant safety).
        if (!activeConversationId) {
          const conv = await aiConversationsApi.create();
          activeConversationId = conv.id;
          conversationIdRef.current = conv.id;
          setConversationId(conv.id);
        }
        const uploaded = await Promise.all(
          attachmentsToSend.map(async (att) => {
            const result = await aiConversationsApi.uploadInlineAttachment(activeConversationId!, att.file);
            return {
              localId: att.localId,
              serverId: result.id,
              mime_type: result.mime_type,
              size: result.size,
              kind: result.kind,
            };
          }),
        );
        attachmentIds = uploaded.map((u) => u.serverId);

        // Upgrade the optimistic user message to use server-side attachment URLs.
        const serverAttachments: ChatAttachment[] = uploaded.map((u) => ({
          id: u.serverId,
          mime_type: u.mime_type,
          size: u.size,
          kind: u.kind,
          preview_url: aiConversationsApi.buildAttachmentUrl(activeConversationId!, u.serverId),
        }));
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsgId ? { ...m, attachments: serverAttachments } : m)),
        );
        // Pending attachments have been uploaded; clear them so the composer is reset.
        clearPendingAttachments();
      }

      const stream = streamChat({
        message: text,
        conversation_id: activeConversationId || undefined,
        attachment_ids: attachmentIds,
        truncate_from_message_id: truncateFromMessageId,
        signal: controller.signal,
      });

      for await (const event of stream) {
        if (generation !== streamGenerationRef.current) {
          break;
        }

        switch (event.type) {
          case 'conversation':
            activeConversationId = event.id;
            conversationIdRef.current = event.id;
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

          case 'preview':
          case 'preview_result':
            setPreviews((prev) => upsertPreview(prev, event));
            break;

          case 'done':
            if (event.conversation_usage !== undefined) {
              setConversationUsage(normalizeConversationUsage(event.conversation_usage));
            }
            if (event.last_usage !== undefined) {
              setLastRequestUsage(normalizeConversationUsage(event.last_usage));
            }
            if (event.builtin_usage !== undefined) {
              setBuiltinUsage(normalizeBuiltinUsage(event.builtin_usage));
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, isStreaming: false, usage: event.usage }
                  : m,
              ),
            );
            break;

          case 'error':
            if (event.conversation_usage !== undefined) {
              setConversationUsage(normalizeConversationUsage(event.conversation_usage));
            } else if (activeConversationId) {
              void refreshConversationUsage(activeConversationId);
            }
            if (event.last_usage !== undefined) {
              setLastRequestUsage(normalizeConversationUsage(event.last_usage));
            }
            if (event.builtin_usage !== undefined) {
              setBuiltinUsage(normalizeBuiltinUsage(event.builtin_usage));
            }
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
        if (activeConversationId) {
          void refreshConversationUsage(activeConversationId);
        }
      } else {
        setError(err.message || i18n.t('ai:errors.sendFailed'));
        if (err instanceof ChatStreamRequestError && err.builtin_usage !== undefined) {
          setBuiltinUsage(normalizeBuiltinUsage(err.builtin_usage));
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m,
          ),
        );
        if (activeConversationId) {
          void refreshConversationUsage(activeConversationId);
        }
      }
    } finally {
      if (generation === streamGenerationRef.current) {
        abortRef.current = null;
        setIsStreaming(false);
      }
      // Refresh messages from the server so optimistic local ids (`local-N-…`) get
      // swapped for real DB UUIDs. That way the next edit/regenerate click can target
      // the right message via truncate_from_message_id.
      const finalConvId = conversationIdRef.current;
      if (finalConvId && generation === streamGenerationRef.current) {
        try {
          const refreshed = await aiConversationsApi.getMessages(finalConvId);
          if (conversationIdRef.current === finalConvId) {
            const rebuilt = rebuildMessagesFromStored(refreshed.messages, finalConvId);
            setMessages(rebuilt);
            setConversationUsage(normalizeConversationUsage(refreshed.conversation_usage));
            setLastRequestUsage(findLastUsage(refreshed.messages));
          }
        } catch {
          // Refresh failure is non-fatal — local state stays as-is, just edit/regen
          // on this just-streamed message will be unavailable until next reload.
        }
      }
    }
  }, [conversationId, isStreaming, pendingAttachments, refreshConversationUsage, clearPendingAttachments]);

  const sendMessage = useCallback(async (text: string) => {
    const truncateFromMessageId = editingMessageId;
    if (truncateFromMessageId) setEditingMessageId(null);
    await runStream(text, { truncateFromMessageId });
  }, [editingMessageId, runStream]);

  const startEdit = useCallback((messageId: string): string | null => {
    const target = messages.find((m) => m.id === messageId && m.role === 'user');
    if (!target) return null;
    setEditingMessageId(messageId);
    return target.content;
  }, [messages]);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
  }, []);

  const regenerate = useCallback(async (assistantMessageId: string) => {
    if (isStreaming) return;
    const idx = messages.findIndex((m) => m.id === assistantMessageId);
    if (idx <= 0) return;
    // Find the most recent user message before this assistant — that's the prompt
    // the LLM should re-answer. The orchestrator deletes the assistant + everything
    // after it, then re-streams against the existing history (no new user persist).
    const previousUser = [...messages].slice(0, idx).reverse().find((m) => m.role === 'user');
    if (!previousUser) return;
    setEditingMessageId(null);
    await runStream('', { truncateFromMessageId: assistantMessageId, isRegenerate: true });
  }, [isStreaming, messages, runStream]);

  const loadConversation = useCallback(async (id: string) => {
    abortActiveStream();
    setError(null);
    conversationIdRef.current = id;
    setConversationId(id);
    setIsStreaming(false);
    clearPendingAttachments();

    const [loadedConversation, loadedPreviews] = await Promise.all([
      aiConversationsApi.getMessages(id),
      aiConversationsApi.getPreviews(id),
    ]);
    const { messages: rawMessages, conversation_usage } = loadedConversation;
    setMessages(rebuildMessagesFromStored(rawMessages, id));
    setPreviews(loadedPreviews);
    setConversationUsage(normalizeConversationUsage(conversation_usage));
    setLastRequestUsage(findLastUsage(rawMessages));
  }, [abortActiveStream, clearPendingAttachments]);

  const newConversation = useCallback(() => {
    abortActiveStream();
    conversationIdRef.current = null;
    setMessages([]);
    setPreviews([]);
    setConversationUsage(null);
    setLastRequestUsage(null);
    setConversationId(null);
    setError(null);
    setIsStreaming(false);
    clearPendingAttachments();
  }, [abortActiveStream, clearPendingAttachments]);

  const cancelStream = useCallback(() => {
    const activeConversationId = conversationIdRef.current;
    abortActiveStream();
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m,
      ),
    );
    setIsStreaming(false);
    if (activeConversationId) {
      void refreshConversationUsage(activeConversationId);
    }
  }, [abortActiveStream, refreshConversationUsage]);

  return useMemo(() => ({
    messages,
    previews,
    conversationUsage,
    lastRequestUsage,
    builtinUsage,
    isStreaming,
    error,
    conversationId,
    pendingAttachments,
    editingMessageId,
    sendMessage,
    loadConversation,
    newConversation,
    cancelStream,
    addPendingFiles,
    removePendingAttachment,
    clearPendingAttachments,
    startEdit,
    cancelEdit,
    regenerate,
  }), [
    messages,
    previews,
    conversationUsage,
    lastRequestUsage,
    builtinUsage,
    isStreaming,
    error,
    conversationId,
    pendingAttachments,
    editingMessageId,
    sendMessage,
    loadConversation,
    newConversation,
    cancelStream,
    addPendingFiles,
    removePendingAttachment,
    clearPendingAttachments,
    startEdit,
    cancelEdit,
    regenerate,
  ]);
}
