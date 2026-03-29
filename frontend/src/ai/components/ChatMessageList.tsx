import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BuildIcon from '@mui/icons-material/Build';
import { useTranslation } from 'react-i18next';
import { MarkdownContent } from '../../components/MarkdownContent';
import { AiMutationPreview, ChatMessage } from '../aiTypes';
import PreviewCard from './PreviewCard';
import ToolResultRenderer from './ToolResultRenderer';

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

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <Box sx={{ pl: 10, pr: 2 }}>
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 2,
          py: 1,
          borderRadius: 2,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          width: 'fit-content',
          maxWidth: '85%',
        }}
      >
        <Typography variant="body2">{message.content}</Typography>
      </Box>
    </Box>
  );
}

function ToolCallsPanel({ message }: { message: ChatMessage }) {
  const { t } = useTranslation(['ai']);
  const [expanded, setExpanded] = useState(false);
  const toolCalls = (message.toolCalls || []).filter((toolCall) => {
    const result = (message.toolResults || []).find((item) => item.id === toolCall.id);
    return !isMutationPreview(result?.result);
  });
  const toolResults = message.toolResults || [];
  const count = toolCalls.length;

  if (count === 0) return null;

  const isStreaming = message.isStreaming && toolResults.length < toolCalls.length;
  const label = isStreaming
    ? t('messageList.toolUseProgress', { completed: toolResults.length, count })
    : t('messageList.toolUseCount', { count });

  return (
    <Box
      sx={{
        bgcolor: 'action.hover',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: 1.5, py: 0.5, cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <BuildIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" fontWeight={600} sx={{ flex: 1 }}>
          {label}
        </Typography>
        {isStreaming && <CircularProgress size={12} />}
        <IconButton size="small">
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Stack>
      <Collapse in={expanded}>
        <Stack spacing={0.5} sx={{ px: 1.5, pb: 1 }}>
          {toolCalls.map((tc, i) => {
            const result = toolResults.find((tr) => tr.id === tc.id);
            return (
              <ToolResultRenderer
                key={tc.id || i}
                name={tc.name}
                arguments={tc.arguments}
                result={result?.result}
              />
            );
          })}
        </Stack>
      </Collapse>
    </Box>
  );
}

function AssistantBubble({
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
  const previewResults = (message.toolResults || [])
    .filter((toolResult) => toolResult.name !== 'preview_execution_result')
    .map((toolResult) => toolResult.result)
    .filter(isMutationPreview)
    .map((preview) => previews.find((item) => item.preview_id === preview.preview_id) || preview);

  return (
    <Box sx={{ px: 2, maxWidth: '90%' }}>
      <Stack spacing={0.5}>
        <ToolCallsPanel message={message} />

        {message.content && (
          <Box>
            <MarkdownContent content={message.content} />
          </Box>
        )}

        {previewResults.map((preview) => (
          <PreviewCard
            key={preview.preview_id}
            preview={preview}
            disabled={disabled}
            onApprove={(previewId) => onSend(`[APPROVE:${previewId}]`)}
            onReject={(previewId) => onSend(`[REJECT:${previewId}]`)}
          />
        ))}

        {message.isStreaming && !message.content && !(message.toolCalls?.length) && (
          <Box sx={{ px: 1 }}>
            <CircularProgress size={16} />
          </Box>
        )}
      </Stack>
    </Box>
  );
}

export default function ChatMessageList({ messages, previews, disabled, onSend }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  if (!messages.length) return null;

  return (
    <Stack spacing={2} sx={{ py: 2, pb: 8 }}>
      {messages.map((msg) =>
        msg.hidden ? null : msg.role === 'user' ? (
          <UserBubble key={msg.id} message={msg} />
        ) : msg.role === 'assistant' ? (
          <AssistantBubble
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
