import React, { useCallback, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Box, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/ArrowUpwardRounded';
import StopIcon from '@mui/icons-material/StopRounded';
import AttachFileIcon from '@mui/icons-material/AttachFileOutlined';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';
import type { PendingAttachment } from '../useChat';

const ACCEPTED_IMAGE_MIME_PREFIX = 'image/';
const ACCEPTED_IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp)$/i;

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  helperText?: React.ReactNode;
  pendingAttachments?: PendingAttachment[];
  onAddFiles?: (files: File[]) => { added: number; rejected: number };
  onRemoveAttachment?: (localId: string) => void;
  attachmentLimit?: number;
  /**
   * When true, the send button morphs into a red Stop button. Clicking it triggers
   * onStop instead of onSend. The textarea remains usable so the user can prepare
   * the next message while cancelling.
   */
  isStreaming?: boolean;
  onStop?: () => void;
};

export type ChatInputHandle = {
  focus: () => void;
};

function isAcceptableImage(file: File): boolean {
  if (file.type && file.type.toLowerCase().startsWith(ACCEPTED_IMAGE_MIME_PREFIX)) return true;
  return ACCEPTED_IMAGE_EXT_RE.test(file.name || '');
}

function PendingThumbnail({
  attachment,
  onRemove,
  removeLabel,
}: {
  attachment: PendingAttachment;
  onRemove: (localId: string) => void;
  removeLabel: string;
}) {
  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: '8px',
        overflow: 'hidden',
        flexShrink: 0,
        border: `1px solid ${theme.palette.kanap.border.default}`,
        bgcolor: theme.palette.kanap.bg.composer,
      })}
    >
      <Box
        component="img"
        src={attachment.previewUrl}
        alt={attachment.file.name}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      <Tooltip title={removeLabel} placement="top">
        <IconButton
          size="small"
          aria-label={removeLabel}
          onClick={() => onRemove(attachment.localId)}
          sx={(theme) => ({
            position: 'absolute',
            top: 2,
            right: 2,
            width: 18,
            height: 18,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.55)',
            color: '#fff',
            '&:hover': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.7)',
            },
          })}
        >
          <CloseIcon sx={{ fontSize: 12 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput(
    {
      onSend,
      disabled,
      autoFocus,
      helperText,
      pendingAttachments,
      onAddFiles,
      onRemoveAttachment,
      attachmentLimit,
      isStreaming,
      onStop,
    },
    ref,
  ) {
    const { t } = useTranslation(['ai']);
    const [value, setValue] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const hasPending = !!(pendingAttachments && pendingAttachments.length > 0);
    const attachmentsEnabled = !!onAddFiles;
    const attachmentSlotsRemaining = attachmentLimit
      ? attachmentLimit - (pendingAttachments?.length ?? 0)
      : Infinity;

    const handleSend = () => {
      const text = value.trim();
      if ((!text && !hasPending) || disabled) return;
      onSend(text);
      setValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const acceptFiles = useCallback(
      (files: File[]): boolean => {
        if (!onAddFiles || disabled) return false;
        const images = files.filter(isAcceptableImage);
        if (!images.length) return false;
        onAddFiles(images);
        return true;
      },
      [onAddFiles, disabled],
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        if (!attachmentsEnabled) return;
        const dt = e.clipboardData;
        if (!dt) return;
        const files: File[] = [];
        for (const item of Array.from(dt.items || [])) {
          if (item.kind === 'file') {
            const f = item.getAsFile();
            if (f) files.push(f);
          }
        }
        if (acceptFiles(files)) {
          e.preventDefault();
        }
      },
      [acceptFiles, attachmentsEnabled],
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        if (!attachmentsEnabled) return;
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length) acceptFiles(files);
      },
      [acceptFiles, attachmentsEnabled],
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        if (!attachmentsEnabled) return;
        const types = Array.from(e.dataTransfer?.types || []);
        if (!types.includes('Files')) return;
        e.preventDefault();
        if (!dragOver) setDragOver(true);
      },
      [attachmentsEnabled, dragOver],
    );

    const handleDragLeave = useCallback(() => {
      if (!attachmentsEnabled) return;
      setDragOver(false);
    }, [attachmentsEnabled]);

    const handleFilePick = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const list = e.target.files;
        if (list && list.length > 0) {
          acceptFiles(Array.from(list));
        }
        // Reset so the same file can be re-selected
        e.target.value = '';
      },
      [acceptFiles],
    );

    const canSend = !disabled && (value.trim().length > 0 || hasPending);
    const canAddMore = attachmentsEnabled && !disabled && attachmentSlotsRemaining > 0;

    return (
      <Stack spacing={0.75}>
        <Box
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          sx={(theme) => ({
            border: `1px solid ${dragOver ? theme.palette.primary.main : theme.palette.kanap.border.default}`,
            borderRadius: '10px',
            bgcolor: theme.palette.kanap.bg.composer,
            transition: 'border-color 120ms ease, box-shadow 120ms ease',
            position: 'relative',
            '&:focus-within': {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
            },
          })}
        >
          {hasPending && (
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                px: 1.5,
                pt: 1.25,
                pb: 0.5,
                overflowX: 'auto',
                '&::-webkit-scrollbar': { height: 4 },
              }}
            >
              {pendingAttachments!.map((att) => (
                <PendingThumbnail
                  key={att.localId}
                  attachment={att}
                  onRemove={(id) => onRemoveAttachment?.(id)}
                  removeLabel={t('input.removeAttachment')}
                />
              ))}
            </Stack>
          )}

          <Box sx={{ px: 1.75, pt: hasPending ? 0.75 : 1.25, pb: 0.5 }}>
            <TextField
              fullWidth
              multiline
              minRows={1}
              maxRows={10}
              variant="standard"
              placeholder={t('input.placeholder')}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={disabled}
              inputRef={inputRef}
              autoFocus={autoFocus}
              InputProps={{
                disableUnderline: true,
              }}
              sx={(theme) => ({
                '& .MuiInputBase-root': {
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: theme.palette.kanap.text.primary,
                  padding: 0,
                },
                '& textarea::placeholder': {
                  color: theme.palette.kanap.text.tertiary,
                  opacity: 1,
                },
              })}
            />
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            sx={{ px: 1.5, pb: 1, pt: 0.5, minHeight: 36 }}
          >
            {attachmentsEnabled && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  multiple
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleFilePick}
                />
                <Tooltip title={t('input.attach')} placement="top">
                  <span>
                    <IconButton
                      size="small"
                      aria-label={t('input.attach')}
                      disabled={!canAddMore}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        width: 28,
                        height: 28,
                        color: 'kanap.text.tertiary',
                        '&:hover': { color: 'kanap.text.secondary', bgcolor: 'kanap.bg.hover' },
                      }}
                    >
                      <AttachFileIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            )}

            <Typography
              component="span"
              sx={{
                fontSize: 11,
                color: 'kanap.text.tertiary',
                flex: 1,
                ml: attachmentsEnabled ? 0.5 : 0,
                userSelect: 'none',
              }}
            >
              {t('input.hintEnter')} · {t('input.hintShiftEnter')}
            </Typography>

            {isStreaming && onStop ? (
              <IconButton
                onClick={onStop}
                aria-label={t('input.stop')}
                title={t('input.stop')}
                sx={(theme) => ({
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  bgcolor: theme.palette.error.main,
                  color: '#fff',
                  '&:hover': { bgcolor: theme.palette.error.dark },
                })}
              >
                <StopIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : (
              <IconButton
                onClick={handleSend}
                disabled={!canSend}
                aria-label={t('input.send')}
                title={t('input.send')}
                sx={(theme) => ({
                  width: 28,
                  height: 28,
                  borderRadius: '6px',
                  bgcolor: canSend ? theme.palette.primary.main : theme.palette.kanap.pill.bg,
                  color: canSend ? theme.palette.primary.contrastText : theme.palette.kanap.text.tertiary,
                  transition: 'background-color 120ms ease, color 120ms ease',
                  '&:hover': {
                    bgcolor: canSend ? theme.palette.primary.dark : theme.palette.kanap.pill.hoverBg,
                  },
                  '&.Mui-disabled': {
                    bgcolor: theme.palette.kanap.pill.bg,
                    color: theme.palette.kanap.text.tertiary,
                  },
                })}
              >
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Stack>

          {dragOver && (
            <Box
              sx={(theme) => ({
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                borderRadius: '10px',
                bgcolor: 'rgba(77,184,201,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.primary.main,
                fontSize: 13,
                fontWeight: 500,
              })}
            >
              {t('input.dropHint')}
            </Box>
          )}
        </Box>

        {helperText}
      </Stack>
    );
  },
);

export default ChatInput;
