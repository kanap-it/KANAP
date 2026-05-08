import React, { useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Box, IconButton, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/ArrowUpwardRounded';
import { useTranslation } from 'react-i18next';

type ChatInputProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  helperText?: React.ReactNode;
};

export type ChatInputHandle = {
  focus: () => void;
};

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput({ onSend, disabled, autoFocus, helperText }, ref) {
    const { t } = useTranslation(['ai']);
    const [value, setValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const handleSend = () => {
      const text = value.trim();
      if (!text || disabled) return;
      onSend(text);
      setValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const canSend = !disabled && value.trim().length > 0;

    return (
      <Stack spacing={0.75}>
        <Box
          sx={(theme) => ({
            border: `1px solid ${theme.palette.kanap.border.default}`,
            borderRadius: '10px',
            bgcolor: theme.palette.kanap.bg.composer,
            transition: 'border-color 120ms ease, box-shadow 120ms ease',
            '&:focus-within': {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
            },
          })}
        >
          <Box sx={{ px: 1.75, pt: 1.25, pb: 0.5 }}>
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
            sx={{
              px: 1.5,
              pb: 1,
              pt: 0.5,
              minHeight: 36,
            }}
          >
            <Typography
              component="span"
              sx={{
                fontSize: 11,
                color: 'kanap.text.tertiary',
                flex: 1,
                userSelect: 'none',
              }}
            >
              {t('input.hintEnter')} · {t('input.hintShiftEnter')}
            </Typography>

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
          </Stack>
        </Box>

        {helperText}
      </Stack>
    );
  },
);

export default ChatInput;
