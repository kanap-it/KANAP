import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Divider, IconButton, Link, Stack, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useFeatures } from '../../config/FeaturesContext';
import { useChat } from '../../ai/useChat';
import { aiConversationsApi } from '../../ai/aiApi';
import { ChatConversation } from '../../ai/aiTypes';
import BuiltinUsageIndicator from '../../ai/components/BuiltinUsageIndicator';
import ChatMessageList from '../../ai/components/ChatMessageList';
import ChatInput, { ChatInputHandle } from '../../ai/components/ChatInput';
import ChatConversationList from '../../ai/components/ChatConversationList';
import TokenUsageBar from '../../ai/components/TokenUsageBar';

const SIDEBAR_WIDTH = 260;

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

  const handleArchive = useCallback(
    async (id: string) => {
      // Clear view first if archiving active conversation
      if (id === chat.conversationId) {
        chat.newConversation();
      }

      // Optimistically remove from list
      queryClient.setQueryData<ChatConversation[]>(
        ['ai-conversations'],
        (old) => old?.filter((c) => c.id !== id),
      );

      try {
        await aiConversationsApi.archive(id);
      } catch {
        // Restore list on failure
        queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      }
    },
    [chat.conversationId, chat.newConversation, queryClient],
  );

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

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 96px)', overflow: 'hidden' }}>
      {/* Sidebar */}
      {sidebarOpen && (
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            minWidth: SIDEBAR_WIDTH,
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
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
      <Stack sx={{ flex: 1, minWidth: 0, height: '100%' }}>
        {/* Toolbar */}
        <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5, flexShrink: 0 }}>
          <IconButton size="small" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <MenuIcon />
          </IconButton>
        </Stack>

        <Divider sx={{ flexShrink: 0 }} />

        {isEmpty ? (
          /* ── Welcome screen: centered title + input ── */
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pb: 12 }}>
            <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 500, mb: 0.5 }}>
              {t('workspace.empty.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
              {t('workspace.empty.subtitle')}
            </Typography>
            <Box sx={{ width: '100%', maxWidth: 640 }}>
              <Stack spacing={1}>
                <BuiltinUsageIndicator usage={chat.builtinUsage} />
                <ChatInput
                  ref={inputRef}
                  onSend={handleSend}
                  disabled={chat.isStreaming || builtinLimitReached}
                  autoFocus
                  helperText={builtinLimitReached ? (
                    <Typography variant="body2" color="error.main">
                      {t('usageIndicator.limitReachedCta')}{' '}
                      {config.features.aiSettings ? (
                        <Link component={RouterLink} to="/admin/ai" underline="hover">
                          {t('usageIndicator.openSettings')}
                        </Link>
                      ) : null}
                    </Typography>
                  ) : null}
                />
              </Stack>
            </Box>
          </Box>
        ) : (
          /* ── Active conversation: messages + bottom input ── */
          <>
            <Box sx={{
              flex: 1,
              overflow: 'auto',
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'action.disabled', borderRadius: 2 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              scrollbarWidth: 'thin',
              scrollbarColor: 'auto transparent',
            }}>
              <ChatMessageList
                messages={chat.messages}
                previews={chat.previews}
                disabled={chat.isStreaming}
                onSend={handleSend}
              />
            </Box>

            {chat.error && (
              <Alert severity="error" sx={{ mx: 2, mb: 1, flexShrink: 0 }} onClose={() => {}}>
                {chat.error}
              </Alert>
            )}

            <Divider sx={{ flexShrink: 0 }} />

            <Box sx={{ flexShrink: 0 }}>
              <Stack spacing={1}>
                <Box sx={{ px: 2, pt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <BuiltinUsageIndicator usage={chat.builtinUsage} />
                </Box>
                <ChatInput
                  ref={inputRef}
                  onSend={handleSend}
                  disabled={chat.isStreaming || builtinLimitReached}
                  helperText={builtinLimitReached ? (
                    <Typography variant="body2" color="error.main">
                      {t('usageIndicator.limitReachedCta')}{' '}
                      {config.features.aiSettings ? (
                        <Link component={RouterLink} to="/admin/ai" underline="hover">
                          {t('usageIndicator.openSettings')}
                        </Link>
                      ) : null}
                    </Typography>
                  ) : null}
                />
              </Stack>
            </Box>

            {chat.conversationUsage && (
              <TokenUsageBar usage={chat.conversationUsage} lastRequestUsage={chat.lastRequestUsage} />
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}
