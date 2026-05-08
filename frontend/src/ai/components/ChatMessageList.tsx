import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';
import { MarkdownContent } from '../../components/MarkdownContent';
import { AiMutationPreview, ChatMessage } from '../aiTypes';
import PreviewCard from './PreviewCard';
import ChatToolRibbon from './ChatToolRibbon';

type ChatMessageListProps = {
  messages: ChatMessage[];
  previews: AiMutationPreview[];
  disabled?: boolean;
  onSend: (text: string) => void;
};

function isMutationPreview(value: unknown): value is AiMutationPreview {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.preview_id === 'string'
    && typeof candidate.status === 'string'
    && typeof candidate.tool_name === 'string'
    && candidate.target != null
    && candidate.changes != null;
}

function MessageActions({
  text,
  ariaLabel,
  copiedLabel,
}: {
  text: string;
  ariaLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be unavailable in non-secure contexts
    }
  }, [text]);

  if (!text) return null;

  return (
    <Stack
      className="kanap-chat-message-actions"
      direction="row"
      spacing={0.25}
      sx={{
        mt: 0.5,
        opacity: 0,
        transition: 'opacity 120ms ease',
        '.kanap-chat-message-row:hover &, .kanap-chat-message-row:focus-within &': {
          opacity: 1,
        },
      }}
    >
      <Tooltip title={copied ? copiedLabel : ariaLabel} placement="bottom">
        <IconButton
          size="small"
          onClick={handleCopy}
          aria-label={ariaLabel}
          sx={{
            color: 'kanap.text.tertiary',
            '&:hover': { color: 'kanap.text.secondary', bgcolor: 'kanap.bg.hover' },
            width: 24,
            height: 24,
          }}
        >
          {copied
            ? <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
            : <ContentCopyIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

function MessageRow({
  role,
  children,
  copyText,
}: {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  copyText?: string;
}) {
  const { t } = useTranslation(['ai']);
  const roleLabel = role === 'user' ? t('messageList.userRole') : t('messageList.assistantRole');

  return (
    <Box className="kanap-chat-message-row" sx={{ pt: 0, pb: 1 }}>
      <Typography
        component="div"
        sx={{
          fontSize: 12,
          fontWeight: 500,
          color: 'kanap.text.secondary',
          mb: 0.5,
          letterSpacing: 0.1,
        }}
      >
        {roleLabel}
      </Typography>
      <Box>{children}</Box>
      {copyText && (
        <MessageActions
          text={copyText}
          ariaLabel={t('messageList.copy')}
          copiedLabel={t('messageList.copied')}
        />
      )}
    </Box>
  );
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <MessageRow role="user" copyText={message.content}>
      <Box
        sx={{
          fontSize: 14,
          lineHeight: 1.6,
          color: 'kanap.text.primary',
          '& p:first-of-type': { mt: 0 },
          '& p:last-of-type': { mb: 0 },
        }}
      >
        <MarkdownContent content={message.content} />
      </Box>
    </MessageRow>
  );
}

function AssistantMessage({
  message,
  previews,
  disabled,
  onSend,
}: {
  message: ChatMessage;
  previews: AiMutationPreview[];
  disabled?: boolean;
  onSend: (text: string) => void;
}) {
  const toolCalls = message.toolCalls || [];
  const toolResults = message.toolResults || [];

  const previewResults = useMemo(() => (
    toolResults
      .filter((toolResult) => toolResult.name !== 'preview_execution_result')
      .map((toolResult) => toolResult.result)
      .filter(isMutationPreview)
      .map((preview) => previews.find((item) => item.preview_id === preview.preview_id) || preview)
  ), [toolResults, previews]);

  const handleApprove = useCallback((previewId: string) => {
    onSend(`[APPROVE:${previewId}]`);
  }, [onSend]);

  const handleReject = useCallback((previewId: string) => {
    onSend(`[REJECT:${previewId}]`);
  }, [onSend]);

  // Filter out tool calls that are mutation previews (those render as PreviewCard)
  const visibleToolCalls = toolCalls.filter((toolCall) => {
    const result = toolResults.find((item) => item.id === toolCall.id);
    return !isMutationPreview(result?.result);
  });

  const showInitialSpinner = message.isStreaming
    && !message.content
    && visibleToolCalls.length === 0;

  return (
    <MessageRow role="assistant" copyText={message.content}>
      <Stack spacing={0.5}>
        {visibleToolCalls.length > 0 && (
          <Stack spacing={0}>
            {visibleToolCalls.map((toolCall) => {
              const matchingResult = toolResults.find((item) => item.id === toolCall.id);
              return (
                <ChatToolRibbon
                  key={toolCall.id || toolCall.name}
                  toolName={toolCall.name}
                  toolArgs={toolCall.arguments}
                  result={matchingResult ? matchingResult.result : undefined}
                  isStreaming={message.isStreaming}
                />
              );
            })}
          </Stack>
        )}

        {message.content && (
          <Box
            sx={{
              fontSize: 14,
              lineHeight: 1.6,
              color: 'kanap.text.primary',
              mt: visibleToolCalls.length > 0 ? 0.5 : 0,
            }}
          >
            <MarkdownContent content={message.content} />
          </Box>
        )}

        {previewResults.map((preview) => (
          <PreviewCard
            key={preview.preview_id}
            preview={preview}
            disabled={disabled}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}

        {showInitialSpinner && (
          <Box sx={{ py: 0.5 }}>
            <CircularProgress size={14} thickness={5} sx={{ color: 'kanap.text.tertiary' }} />
          </Box>
        )}
      </Stack>
    </MessageRow>
  );
}

export default function ChatMessageList({ messages, previews, disabled, onSend }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  if (!messages.length) return null;

  return (
    <Stack spacing={3} sx={{ py: 3, pb: 4 }}>
      {messages.map((msg) =>
        msg.hidden ? null : msg.role === 'user' ? (
          <UserMessage key={msg.id} message={msg} />
        ) : msg.role === 'assistant' ? (
          <AssistantMessage
            key={msg.id}
            message={msg}
            previews={previews}
            disabled={disabled}
            onSend={onSend}
          />
        ) : null,
      )}
      <div ref={bottomRef} />
    </Stack>
  );
}
