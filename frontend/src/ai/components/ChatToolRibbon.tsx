import React, { useState } from 'react';
import { Box, Collapse, CircularProgress, Stack, Typography } from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useTranslation } from 'react-i18next';
import { ToolResultBody, getToolResultSummary } from './ToolResultRenderer';

type ChatToolRibbonProps = {
  toolName: string;
  toolArgs?: Record<string, unknown>;
  result?: unknown;
  isStreaming?: boolean;
};

const MONO_FAMILY = "'JetBrains Mono Variable', ui-monospace, monospace";

function formatArgsHint(args?: Record<string, unknown>): string {
  if (!args) return '';
  const entries = Object.entries(args).filter(([, value]) => value != null && value !== '');
  if (!entries.length) return '';
  const parts = entries.slice(0, 2).map(([key, value]) => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return `${key}=${stringValue}`;
  });
  const joined = parts.join(' ');
  return joined.length > 60 ? `${joined.slice(0, 57)}…` : joined;
}

export default function ChatToolRibbon({ toolName, toolArgs, result, isStreaming }: ChatToolRibbonProps) {
  const { t } = useTranslation(['ai']);
  const [expanded, setExpanded] = useState(false);

  const displayName = t(`toolResults.toolNames.${toolName}`, {
    defaultValue: toolName.replace(/_/g, ' '),
  });

  const hasResult = result !== undefined;
  const summary = !isStreaming && hasResult ? getToolResultSummary(toolName, result) : null;
  const argsHint = formatArgsHint(toolArgs);
  const isLoading = isStreaming && !hasResult;

  const labelText = isLoading
    ? t('messageList.toolCallStreaming', { name: displayName })
    : t('messageList.toolCallLabel', { name: displayName });

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        onClick={() => hasResult && setExpanded(!expanded)}
        sx={{
          py: 0.5,
          cursor: hasResult ? 'pointer' : 'default',
          color: 'kanap.text.tertiary',
          fontSize: 12,
          minHeight: 24,
          transition: 'color 120ms ease',
          '&:hover': hasResult ? { color: 'kanap.text.secondary' } : undefined,
          userSelect: 'none',
        }}
      >
        {isLoading ? (
          <CircularProgress size={10} thickness={5} sx={{ color: 'kanap.text.tertiary' }} />
        ) : (
          <KeyboardArrowRightIcon
            sx={{
              fontSize: 16,
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 120ms ease',
              opacity: hasResult ? 1 : 0.4,
            }}
          />
        )}

        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 0.75,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Typography
            component="span"
            sx={{
              fontSize: 12,
              color: 'inherit',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {labelText}
          </Typography>

          {argsHint && !isLoading && (
            <Typography
              component="span"
              sx={{
                fontSize: 11,
                color: 'inherit',
                opacity: 0.75,
                fontFamily: MONO_FAMILY,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 240,
                flexShrink: 1,
              }}
            >
              · {argsHint}
            </Typography>
          )}

          {summary && summary.count > 0 && (
            <Typography
              component="span"
              sx={{ fontSize: 12, color: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              · {t('messageList.toolCallResults', { count: summary.count })}
            </Typography>
          )}
          {summary && summary.count === 0 && (
            <Typography
              component="span"
              sx={{ fontSize: 12, color: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              · {t('messageList.toolCallNoResult')}
            </Typography>
          )}
        </Box>
      </Stack>

      {hasResult && (
        <Collapse in={expanded} unmountOnExit>
          <Box
            sx={{
              ml: 2.25,
              mt: 0.5,
              mb: 1,
              pl: 1.5,
              borderLeft: 1,
              borderColor: 'kanap.border.soft',
              fontSize: 13,
            }}
          >
            <ToolResultBody name={toolName} result={result} />
          </Box>
        </Collapse>
      )}
    </Box>
  );
}
