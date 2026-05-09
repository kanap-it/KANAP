import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import CheckIcon from '@mui/icons-material/Check';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { useTranslation } from 'react-i18next';
import { MarkdownContent } from '../../components/MarkdownContent';
import { AiMutationPreview, ChatMessage } from '../aiTypes';
import { isLongPreview } from '../utils/previewClassification';
import ArtifactPreviewChip from './ArtifactPreviewChip';
import AttachmentImage from './AttachmentImage';
import PreviewCard from './PreviewCard';
import ChatToolRibbon from './ChatToolRibbon';

type ChatMessageListProps = {
  messages: ChatMessage[];
  previews: AiMutationPreview[];
  disabled?: boolean;
  onSend: (text: string) => void;
  /** When provided, long markdown previews are routed to the artifact panel via this callback. */
  onOpenArtifact?: (previewId: string) => void;
  /** Used to highlight the chip whose artifact is currently visible in the panel. */
  selectedArtifactId?: string | null;
  /** Called when the user clicks the Edit pencil on one of their own messages. */
  onEdit?: (messageId: string) => void;
  /** Submit the new text for the user message currently being edited. */
  onSubmitEdit?: (messageId: string, newText: string) => void;
  /** Called when the user clicks Cancel on an in-progress inline edit. */
  onCancelEdit?: () => void;
  /** Called when the user clicks the Regenerate icon on an assistant reply. */
  onRegenerate?: (messageId: string) => void;
  /** When this id matches a user message, render it inline as an editor. */
  editingMessageId?: string | null;
};

// A message id is editable/regenerable only once we have its DB id (not a local-* placeholder).
// The post-stream refresh in useChat swaps local ids for real UUIDs.
function isPersistedMessage(id: string): boolean {
  return !id.startsWith('local-');
}

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

function ActionIconButton({
  icon,
  label,
  onClick,
  disabled,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  iconColor?: string;
}) {
  return (
    <Tooltip title={label} placement="bottom">
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          sx={{
            color: iconColor || 'kanap.text.tertiary',
            '&:hover': { color: 'kanap.text.secondary', bgcolor: 'kanap.bg.hover' },
            width: 24,
            height: 24,
          }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function MessageActions({
  copyText,
  copyLabel,
  copiedLabel,
  onEdit,
  editLabel,
  onRegenerate,
  regenerateLabel,
}: {
  copyText?: string;
  copyLabel: string;
  copiedLabel: string;
  onEdit?: () => void;
  editLabel?: string;
  onRegenerate?: () => void;
  regenerateLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be unavailable in non-secure contexts
    }
  }, [copyText]);

  const hasAnyAction = !!copyText || !!onEdit || !!onRegenerate;
  if (!hasAnyAction) return null;

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
      {copyText && (
        <ActionIconButton
          icon={copied
            ? <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
            : <ContentCopyIcon sx={{ fontSize: 14 }} />}
          label={copied ? copiedLabel : copyLabel}
          onClick={handleCopy}
        />
      )}
      {onEdit && editLabel && (
        <ActionIconButton
          icon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
          label={editLabel}
          onClick={onEdit}
        />
      )}
      {onRegenerate && regenerateLabel && (
        <ActionIconButton
          icon={<RefreshOutlinedIcon sx={{ fontSize: 14 }} />}
          label={regenerateLabel}
          onClick={onRegenerate}
        />
      )}
    </Stack>
  );
}

function RoleHeader({ role }: { role: 'user' | 'assistant' }) {
  const { t } = useTranslation(['ai']);
  const label = role === 'user' ? t('messageList.userRole') : t('messageList.assistantRole');

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={0.75}
      sx={{ mb: 0.5, height: 18 }}
    >
      {role === 'assistant' && (
        <Box
          sx={(theme) => ({
            width: 16,
            height: 16,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: theme.palette.primary.light,
            color: theme.palette.primary.main,
            flexShrink: 0,
          })}
        >
          <AutoAwesomeOutlinedIcon sx={{ fontSize: 10 }} />
        </Box>
      )}
      <Typography
        component="span"
        sx={{
          fontSize: 12,
          fontWeight: 500,
          color: 'kanap.text.secondary',
          letterSpacing: 0.1,
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Stack>
  );
}

function MessageRow({
  role,
  children,
  copyText,
  onEdit,
  onRegenerate,
}: {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  copyText?: string;
  onEdit?: () => void;
  onRegenerate?: () => void;
}) {
  const { t } = useTranslation(['ai']);

  return (
    <Box className="kanap-chat-message-row">
      <RoleHeader role={role} />
      <Box>{children}</Box>
      <MessageActions
        copyText={copyText}
        copyLabel={t('messageList.copy')}
        copiedLabel={t('messageList.copied')}
        onEdit={onEdit}
        editLabel={onEdit ? t('messageList.edit') : undefined}
        onRegenerate={onRegenerate}
        regenerateLabel={onRegenerate ? t('messageList.regenerate') : undefined}
      />
    </Box>
  );
}

function MessageAttachments({ message }: { message: ChatMessage }) {
  const attachments = message.attachments || [];
  if (!attachments.length) return null;
  return (
    <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}>
      {attachments.map((att) => {
        if (!att.preview_url) return null;
        const isLocalObjectUrl = att.preview_url.startsWith('blob:');
        return (
          <AttachmentImage
            key={att.id}
            fetchUrl={isLocalObjectUrl ? '' : att.preview_url}
            localObjectUrl={isLocalObjectUrl ? att.preview_url : null}
          />
        );
      })}
    </Stack>
  );
}

function InlineEditor({
  initialValue,
  onSubmit,
  onCancel,
  saveLabel,
  cancelLabel,
}: {
  initialValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  saveLabel: string;
  cancelLabel: string;
}) {
  const [value, setValue] = useState(initialValue);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Auto-focus + caret to end on mount.
    const el = taRef.current;
    if (!el) return;
    el.focus();
    try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* ignore */ }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const canSave = value.trim().length > 0;

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={20}
        variant="standard"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        inputRef={taRef}
        InputProps={{ disableUnderline: true }}
        sx={(theme) => ({
          '& .MuiInputBase-root': {
            fontSize: 14,
            lineHeight: 1.6,
            color: theme.palette.kanap.text.primary,
            padding: 0,
          },
        })}
      />
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          onClick={onCancel}
          sx={{ textTransform: 'none', fontSize: 12 }}
        >
          {cancelLabel}
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => onSubmit(value)}
          disabled={!canSave}
          sx={{ textTransform: 'none', fontSize: 12 }}
        >
          {saveLabel}
        </Button>
      </Stack>
    </Stack>
  );
}

function UserMessage({
  message,
  onEdit,
  isEditing,
  onSubmitEdit,
  onCancelEdit,
}: {
  message: ChatMessage;
  onEdit?: () => void;
  isEditing?: boolean;
  onSubmitEdit?: (newText: string) => void;
  onCancelEdit?: () => void;
}) {
  const { t } = useTranslation(['ai']);
  return (
    <MessageRow
      role="user"
      copyText={isEditing ? undefined : message.content}
      onEdit={isEditing ? undefined : onEdit}
    >
      <Box
        sx={(theme) => ({
          bgcolor: theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(15,17,23,0.05)',
          borderRadius: '10px',
          px: 1.75,
          py: 1.25,
          fontSize: 14,
          lineHeight: 1.6,
          color: theme.palette.kanap.text.primary,
          ...(isEditing
            ? {
                outline: (theme as any).palette.primary.main
                  ? `1px solid ${(theme as any).palette.primary.main}`
                  : undefined,
                outlineOffset: 0,
              }
            : {}),
          '& p:first-of-type': { mt: 0 },
          '& p:last-of-type': { mb: 0 },
        })}
      >
        {isEditing ? (
          <InlineEditor
            initialValue={message.content}
            onSubmit={(value) => onSubmitEdit?.(value)}
            onCancel={() => onCancelEdit?.()}
            saveLabel={t('messageList.save')}
            cancelLabel={t('messageList.cancel')}
          />
        ) : (
          <>
            {message.content && <MarkdownContent content={message.content} />}
            <MessageAttachments message={message} />
          </>
        )}
      </Box>
    </MessageRow>
  );
}

function AssistantMessage({
  message,
  previews,
  disabled,
  onSend,
  onOpenArtifact,
  selectedArtifactId,
  onRegenerate,
}: {
  message: ChatMessage;
  previews: AiMutationPreview[];
  disabled?: boolean;
  onSend: (text: string) => void;
  onOpenArtifact?: (previewId: string) => void;
  selectedArtifactId?: string | null;
  onRegenerate?: () => void;
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
    <MessageRow role="assistant" copyText={message.content} onRegenerate={onRegenerate}>
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

        {previewResults.map((preview) => {
          if (onOpenArtifact && isLongPreview(preview)) {
            return (
              <ArtifactPreviewChip
                key={preview.preview_id}
                preview={preview}
                active={selectedArtifactId === preview.preview_id}
                onOpen={onOpenArtifact}
              />
            );
          }
          return (
            <PreviewCard
              key={preview.preview_id}
              preview={preview}
              disabled={disabled}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          );
        })}

        {showInitialSpinner && (
          <Box sx={{ py: 0.5 }}>
            <CircularProgress size={14} thickness={5} sx={{ color: 'kanap.text.tertiary' }} />
          </Box>
        )}
      </Stack>
    </MessageRow>
  );
}

export default function ChatMessageList({
  messages,
  previews,
  disabled,
  onSend,
  onOpenArtifact,
  selectedArtifactId,
  onEdit,
  onSubmitEdit,
  onCancelEdit,
  onRegenerate,
  editingMessageId,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  if (!messages.length) return null;

  return (
    <Stack spacing={3} sx={{ py: 3, pb: 4 }}>
      {messages.map((msg) =>
        msg.hidden ? null : msg.role === 'user' ? (
          <UserMessage
            key={msg.id}
            message={msg}
            onEdit={onEdit && isPersistedMessage(msg.id) && !disabled
              ? () => onEdit(msg.id)
              : undefined}
            isEditing={editingMessageId === msg.id}
            onSubmitEdit={onSubmitEdit ? (text) => onSubmitEdit(msg.id, text) : undefined}
            onCancelEdit={onCancelEdit}
          />
        ) : msg.role === 'assistant' ? (
          <AssistantMessage
            key={msg.id}
            message={msg}
            previews={previews}
            disabled={disabled}
            onSend={onSend}
            onOpenArtifact={onOpenArtifact}
            selectedArtifactId={selectedArtifactId}
            onRegenerate={onRegenerate && isPersistedMessage(msg.id) && !disabled && !msg.isStreaming
              ? () => onRegenerate(msg.id)
              : undefined}
          />
        ) : null,
      )}
      <div ref={bottomRef} />
    </Stack>
  );
}
