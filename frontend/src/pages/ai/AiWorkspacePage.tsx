import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box, IconButton, Link, Stack, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useFeatures } from '../../config/FeaturesContext';
import { useChat, MAX_PENDING_ATTACHMENTS } from '../../ai/useChat';
import { aiConversationsApi } from '../../ai/aiApi';
import { ChatConversation } from '../../ai/aiTypes';
import ArtifactPanel from '../../ai/components/ArtifactPanel';
import BuiltinUsageIndicator from '../../ai/components/BuiltinUsageIndicator';
import ChatMessageList from '../../ai/components/ChatMessageList';
import ChatInput, { ChatInputHandle } from '../../ai/components/ChatInput';
import ChatConversationList from '../../ai/components/ChatConversationList';
import ChatEmptyState from '../../ai/components/ChatEmptyState';
import TokenUsageBar from '../../ai/components/TokenUsageBar';
import { isLongPreview } from '../../ai/utils/previewClassification';

const SIDEBAR_WIDTH = 260;
const CONTENT_MAX_WIDTH = 760;

const ARTIFACT_OPEN_STORAGE_KEY = 'kanap.ai.artifactPanelOpen';

export default function AiWorkspacePage() {
  const { config } = useFeatures();
  const queryClient = useQueryClient();
  const { t } = useTranslation(['ai']);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chat = useChat();
  const inputRef = useRef<ChatInputHandle>(null);
  const builtinLimitReached = (chat.builtinUsage?.limit ?? 0) > 0
    && (chat.builtinUsage?.count ?? 0) >= (chat.builtinUsage?.limit ?? 0);

  const isEmpty = chat.messages.length === 0;

  // The panel surfaces every preview attached to the conversation, regardless of length
  // or status — that way users can always recover an artifact view even when the inline
  // chip rendering fails (e.g. on a partial conversation reload after navigating away
  // mid-stream). Long-vs-short is only a hint for *inline* rendering inside the chat
  // thread (chip vs PreviewCard), not for what the panel shows.
  const allPreviews = chat.previews;

  const [artifactPanelOpen, setArtifactPanelOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(ARTIFACT_OPEN_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const seenArtifactIdsRef = useRef<Set<string>>(new Set());

  // Auto-open behavior:
  //   - On a freshly arriving preview during a stream → pop the panel only if the
  //     preview is long (an inline PreviewCard handles short ones in the message flow).
  //   - On any pending preview the user hasn't acknowledged → always pop the panel,
  //     because the user MUST act on it (approve/reject) and we shouldn't bury it.
  useEffect(() => {
    if (allPreviews.length === 0) return;
    const newOnes = allPreviews.filter((p) => !seenArtifactIdsRef.current.has(p.preview_id));
    if (newOnes.length === 0) return;
    for (const p of newOnes) seenArtifactIdsRef.current.add(p.preview_id);

    // Prefer a pending preview as the auto-selected artifact (most actionable).
    const pending = newOnes.find((p) => p.status === 'pending');
    const trigger = pending || newOnes.find((p) => isLongPreview(p)) || null;
    if (!trigger) return;

    setSelectedArtifactId(trigger.preview_id);
    setArtifactPanelOpen(true);
  }, [allPreviews]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ARTIFACT_OPEN_STORAGE_KEY, artifactPanelOpen ? '1' : '0');
    } catch {
      // ignore quota / privacy errors
    }
  }, [artifactPanelOpen]);

  const toggleArtifactPanel = useCallback(() => {
    setArtifactPanelOpen((prev) => !prev);
  }, []);

  const openArtifactPanel = useCallback((previewId: string) => {
    setSelectedArtifactId(previewId);
    setArtifactPanelOpen(true);
  }, []);

  const handleArtifactApprove = useCallback((previewId: string) => {
    void chat.sendMessage(`[APPROVE:${previewId}]`);
  }, [chat.sendMessage]);

  const handleArtifactReject = useCallback((previewId: string) => {
    void chat.sendMessage(`[REJECT:${previewId}]`);
  }, [chat.sendMessage]);

  // Auto-focus input when AI finishes responding
  const wasStreamingRef = useRef(false);
  useEffect(() => {
    if (wasStreamingRef.current && !chat.isStreaming) {
      inputRef.current?.focus();
    }
    wasStreamingRef.current = chat.isStreaming;
  }, [chat.isStreaming]);

  const handleSelect = useCallback(
    (id: string) => {
      chat.loadConversation(id);
    },
    [chat.loadConversation],
  );

  const handleNew = useCallback(() => {
    chat.newConversation();
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [chat.newConversation]);

  const handleSend = useCallback(
    async (text: string) => {
      await chat.sendMessage(text);
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
    [chat.sendMessage, queryClient],
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      if (text.includes('@')) {
        inputRef.current?.setText(text);
        return;
      }
      void handleSend(text);
    },
    [handleSend],
  );

  const handleArchive = useCallback(
    async (id: string) => {
      if (id === chat.conversationId) {
        chat.newConversation();
      }
      queryClient.setQueryData<ChatConversation[]>(
        ['ai-conversations'],
        (old) => old?.filter((c) => c.id !== id),
      );
      try {
        await aiConversationsApi.archive(id);
      } catch {
        queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      }
    },
    [chat.conversationId, chat.newConversation, queryClient],
  );

  const handleEditMessage = useCallback((messageId: string) => {
    // Inline edit: just flip the message into edit mode. The bubble renders an inline
    // editor; we do NOT prefill the composer below (that flow surprised users in early
    // testing because the highlighted message looked editable even though it wasn't).
    chat.startEdit(messageId);
  }, [chat.startEdit]);

  const handleSubmitEdit = useCallback((_messageId: string, newText: string) => {
    // sendMessage reads chat.editingMessageId set by startEdit and forwards it to the
    // backend as truncate_from_message_id, so this single call covers the whole edit.
    void chat.sendMessage(newText);
  }, [chat.sendMessage]);

  const handleCancelEdit = useCallback(() => {
    chat.cancelEdit();
  }, [chat.cancelEdit]);

  const handleRegenerateMessage = useCallback((messageId: string) => {
    void chat.regenerate(messageId);
  }, [chat.regenerate]);

  if (!config.features.aiChat) {
    return (
      <>
        <PageHeader title={t('workspace.title')} />
        <Alert severity="warning" sx={{ maxWidth: 600 }}>
          {t('workspace.messages.disabled')}
        </Alert>
      </>
    );
  }

  const limitReachedHelper = builtinLimitReached ? (
    <Typography variant="body2" color="error.main" sx={{ fontSize: 12 }}>
      {t('usageIndicator.limitReachedCta')}{' '}
      {config.features.aiSettings ? (
        <Link component={RouterLink} to="/admin/ai" underline="hover">
          {t('usageIndicator.openSettings')}
        </Link>
      ) : null}
    </Typography>
  ) : null;

  const composer = (
    <ChatInput
      ref={inputRef}
      onSend={handleSend}
      disabled={chat.isStreaming || builtinLimitReached}
      autoFocus={isEmpty}
      helperText={limitReachedHelper}
      pendingAttachments={chat.pendingAttachments}
      onAddFiles={chat.addPendingFiles}
      onRemoveAttachment={chat.removePendingAttachment}
      attachmentLimit={MAX_PENDING_ATTACHMENTS}
      isStreaming={chat.isStreaming}
      onStop={chat.cancelStream}
    />
  );

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 96px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <Box
          sx={(theme) => ({
            width: SIDEBAR_WIDTH,
            minWidth: SIDEBAR_WIDTH,
            borderRight: `1px solid ${theme.palette.kanap.border.default}`,
            bgcolor: theme.palette.kanap.bg.page,
            display: 'flex',
            flexDirection: 'column',
          })}
        >
          <ChatConversationList
            activeId={chat.conversationId}
            onSelect={handleSelect}
            onNew={handleNew}
            onArchive={handleArchive}
          />
        </Box>
      )}

      {/* Main chat area */}
      <Stack sx={{ flex: 1, minWidth: 0, height: '100%', position: 'relative' }}>
        {/* Toolbar */}
        <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5, flexShrink: 0 }}>
          <IconButton
            size="small"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            sx={{ color: 'kanap.text.secondary' }}
          >
            <MenuIcon />
          </IconButton>
        </Stack>

        {isEmpty ? (
          /* ── Welcome screen: centered empty state + input ── */
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              px: 3,
              pb: 6,
            }}
          >
            <Box sx={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH }}>
              <Stack spacing={4}>
                <ChatEmptyState
                  onSuggestion={handleSuggestion}
                  disabled={chat.isStreaming || builtinLimitReached}
                />
                <Stack spacing={1}>
                  <BuiltinUsageIndicator usage={chat.builtinUsage} />
                  {composer}
                </Stack>
              </Stack>
            </Box>
          </Box>
        ) : (
          /* ── Active conversation: messages + bottom input ── */
          <>
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                minHeight: 0,
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'action.disabled', borderRadius: 2 },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                scrollbarWidth: 'thin',
                scrollbarColor: 'auto transparent',
              }}
            >
              <Box sx={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, mx: 'auto', px: 3 }}>
                <ChatMessageList
                  messages={chat.messages}
                  previews={chat.previews}
                  disabled={chat.isStreaming}
                  onSend={handleSend}
                  onOpenArtifact={openArtifactPanel}
                  selectedArtifactId={artifactPanelOpen ? selectedArtifactId : null}
                  onEdit={handleEditMessage}
                  onSubmitEdit={handleSubmitEdit}
                  onCancelEdit={handleCancelEdit}
                  onRegenerate={handleRegenerateMessage}
                  editingMessageId={chat.editingMessageId}
                />
              </Box>
            </Box>

            {chat.error && (
              <Box sx={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, mx: 'auto', px: 3, flexShrink: 0 }}>
                <Alert severity="error" sx={{ mb: 1 }} onClose={() => {}}>
                  {chat.error}
                </Alert>
              </Box>
            )}

            <Box
              sx={{
                flexShrink: 0,
                pt: 1,
                pb: 2,
              }}
            >
              <Box sx={{ width: '100%', maxWidth: CONTENT_MAX_WIDTH, mx: 'auto', px: 3 }}>
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="flex-end" alignItems="center" sx={{ minHeight: 18 }}>
                    <BuiltinUsageIndicator usage={chat.builtinUsage} />
                  </Stack>
                  {composer}
                  {chat.conversationUsage && (
                    <Box sx={{ pt: 0.25 }}>
                      <TokenUsageBar usage={chat.conversationUsage} lastRequestUsage={chat.lastRequestUsage} />
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>
          </>
        )}
      </Stack>

      <ArtifactPanel
        previews={allPreviews}
        selectedId={selectedArtifactId}
        open={artifactPanelOpen}
        disabled={chat.isStreaming || builtinLimitReached}
        onToggle={toggleArtifactPanel}
        onSelect={openArtifactPanel}
        onApprove={handleArtifactApprove}
        onReject={handleArtifactReject}
      />
    </Box>
  );
}
