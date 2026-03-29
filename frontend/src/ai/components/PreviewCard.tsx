import React from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AiMutationPreview } from '../aiTypes';
import { MarkdownContent } from '../../components/MarkdownContent';

type PreviewCardProps = {
  preview: AiMutationPreview;
  disabled?: boolean;
  onApprove: (previewId: string) => void;
  onReject: (previewId: string) => void;
};

function getStatusColor(status: AiMutationPreview['status']): 'default' | 'success' | 'error' | 'warning' {
  switch (status) {
    case 'executed':
      return 'success';
    case 'failed':
      return 'error';
    case 'expired':
      return 'warning';
    default:
      return 'default';
  }
}

function renderValue(diff: AiMutationPreview['changes'][string], value: string | null, noneLabel: string) {
  if (!value) {
    return (
      <Typography variant="body2" color="text.secondary">
        {noneLabel}
      </Typography>
    );
  }

  if (diff.format === 'markdown') {
    return <MarkdownContent content={value} variant="compact" />;
  }

  return (
    <Typography variant="body2">
      {value}
    </Typography>
  );
}

export default function PreviewCard({
  preview,
  disabled,
  onApprove,
  onReject,
}: PreviewCardProps) {
  const { t } = useTranslation(['ai']);
  const isPending = preview.status === 'pending';

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        bgcolor: isPending ? 'background.paper' : 'action.hover',
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip label={t('ai:previewCard.preview')} size="small" variant="outlined" />
          <Chip label={preview.status} size="small" color={getStatusColor(preview.status)} />
          {preview.target.ref && (
            <Typography variant="body2" fontWeight={600}>
              {preview.target.ref}
            </Typography>
          )}
          {preview.target.title && (
            <Typography variant="body2">
              {preview.target.title}
            </Typography>
          )}
        </Stack>

        <Stack spacing={0.5}>
          {Object.entries(preview.changes).map(([field, diff]) => (
            diff.format === 'markdown' ? (
              <Stack key={field} spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {diff.label || field}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('ai:previewCard.before')}
                </Typography>
                {renderValue(diff, diff.from, t('ai:previewCard.none'))}
                <Typography variant="body2" color="text.secondary">
                  {t('ai:previewCard.after')}
                </Typography>
                <Box>
                  {renderValue(diff, diff.to, t('ai:previewCard.none'))}
                </Box>
              </Stack>
            ) : (
              <Stack key={field} direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 72 }}>
                  {diff.label || field}
                </Typography>
                {renderValue(diff, diff.from, t('ai:previewCard.none'))}
                <Typography variant="body2" color="text.secondary">
                  →
                </Typography>
                <Box sx={{ fontWeight: 600 }}>
                  {renderValue(diff, diff.to, t('ai:previewCard.none'))}
                </Box>
              </Stack>
            )
          ))}
        </Stack>

        <Typography variant="caption" color={preview.error_message ? 'error.main' : 'text.secondary'}>
          {preview.error_message || preview.summary}
        </Typography>

        {isPending && (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="contained"
              disabled={disabled}
              onClick={() => onApprove(preview.preview_id)}
            >
              {t('ai:previewCard.approve')}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={disabled}
              onClick={() => onReject(preview.preview_id)}
            >
              {t('ai:previewCard.reject')}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
