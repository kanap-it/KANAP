import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { useTranslation } from 'react-i18next';

type ChatEmptyStateProps = {
  onSuggestion: (prompt: string) => void;
  disabled?: boolean;
};

const SUGGESTION_KEYS = [
  'overdueTasks',
  'myProjects',
  'applicationMention',
  'knowledgeSearch',
] as const;

export default function ChatEmptyState({ onSuggestion, disabled }: ChatEmptyStateProps) {
  const { t } = useTranslation(['ai']);

  return (
    <Stack
      alignItems="center"
      spacing={3}
      sx={{
        textAlign: 'center',
        width: '100%',
        maxWidth: 640,
        mx: 'auto',
      }}
    >
      <Stack alignItems="center" spacing={1.5}>
        <Box
          sx={(theme) => ({
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: theme.palette.primary.light,
            color: theme.palette.primary.main,
          })}
        >
          <AutoAwesomeOutlinedIcon sx={{ fontSize: 22 }} />
        </Box>
        <Typography
          component="div"
          sx={(theme) => ({
            fontSize: 22,
            fontWeight: 500,
            lineHeight: 1.3,
            color: theme.palette.kanap.text.primary,
          })}
        >
          {t('workspace.empty.title')}
        </Typography>
        <Typography
          component="div"
          sx={(theme) => ({
            fontSize: 14,
            color: theme.palette.kanap.text.secondary,
            maxWidth: 460,
          })}
        >
          {t('workspace.empty.subtitle')}
        </Typography>
      </Stack>

      <Stack spacing={1} sx={{ width: '100%' }}>
        <Typography
          component="div"
          sx={(theme) => ({
            fontSize: 11,
            fontWeight: 500,
            color: theme.palette.kanap.text.secondary,
            letterSpacing: 0.2,
            textAlign: 'left',
          })}
        >
          {t('workspace.empty.suggestionsTitle')}
        </Typography>
        <Stack spacing={0.75} sx={{ width: '100%' }}>
          {SUGGESTION_KEYS.map((key) => {
            const text = t(`workspace.suggestions.${key}`);
            return (
              <Box
                key={key}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && onSuggestion(text)}
                onKeyDown={(e) => {
                  if (disabled) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSuggestion(text);
                  }
                }}
                sx={(theme) => ({
                  textAlign: 'left',
                  px: 1.5,
                  py: 1,
                  borderRadius: '8px',
                  border: `1px solid ${theme.palette.kanap.border.default}`,
                  bgcolor: theme.palette.kanap.bg.primary,
                  color: theme.palette.kanap.text.primary,
                  fontSize: 13,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  transition: 'background-color 120ms ease, border-color 120ms ease',
                  '&:hover': disabled ? undefined : {
                    bgcolor: theme.palette.kanap.bg.hover,
                    borderColor: theme.palette.primary.main,
                  },
                  '&:focus-visible': {
                    outline: 'none',
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
                  },
                })}
              >
                {text}
              </Box>
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
}
