import React, { useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { IconButton, Stack, TextField } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
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

    return (
      <Stack spacing={1} sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            maxRows={6}
            placeholder={t('input.placeholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            size="small"
            inputRef={inputRef}
            autoFocus={autoFocus}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            aria-label={t('input.send')}
            title={t('input.send')}
            sx={{ mb: 0.5 }}
          >
            <SendIcon />
          </IconButton>
        </Stack>
        {helperText}
      </Stack>
    );
  },
);

export default ChatInput;
