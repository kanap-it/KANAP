import React from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CloseIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from 'react-i18next';
import { AiMutationPreview } from '../aiTypes';
import { getPreviewLabel } from '../utils/previewClassification';
import PreviewCard from './PreviewCard';

const PANEL_WIDTH = 380;
const TAB_WIDTH = 28;
const TAB_HEIGHT = 132;

type ArtifactPanelProps = {
  previews: AiMutationPreview[];
  selectedId: string | null;
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onSelect: (previewId: string) => void;
  onApprove: (previewId: string) => void;
  onReject: (previewId: string) => void;
};

function ArtifactTab({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return (
    <Box sx={{ position: 'relative', width: 0, flexShrink: 0 }}>
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-label={label}
        sx={(theme) => ({
          position: 'absolute',
          top: 20,
          right: 0,
          width: TAB_WIDTH,
          height: TAB_HEIGHT,
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          border: `1px solid ${theme.palette.kanap.tab.border}`,
          borderRight: 'none',
          bgcolor: open ? theme.palette.kanap.tab.bgActive : theme.palette.kanap.tab.bg,
          color: open ? theme.palette.kanap.tab.fgActive : theme.palette.kanap.tab.fg,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 0.5,
          padding: 0,
          fontFamily: theme.typography.fontFamily,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: 0.4,
          zIndex: 2,
          transition: 'background-color 120ms ease, color 120ms ease',
          '&:focus-visible': {
            outline: 'none',
            boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
          },
        })}
      >
        {open ? (
          <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />
        ) : (
          <KeyboardArrowLeftIcon sx={{ fontSize: 16 }} />
        )}
        <Box
          component="span"
          sx={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            textTransform: 'none',
            fontWeight: 500,
          }}
        >
          {label}
        </Box>
      </Box>
    </Box>
  );
}

function ArtifactTabBar({
  previews,
  selectedId,
  onSelect,
}: {
  previews: AiMutationPreview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (previews.length <= 1) return null;
  return (
    <Stack
      direction="row"
      spacing={0}
      sx={(theme) => ({
        borderBottom: `1px solid ${theme.palette.kanap.border.default}`,
        overflowX: 'auto',
        flexShrink: 0,
      })}
    >
      {previews.map((preview) => {
        const active = preview.preview_id === selectedId;
        return (
          <Box
            key={preview.preview_id}
            component="button"
            type="button"
            onClick={() => onSelect(preview.preview_id)}
            sx={(theme) => ({
              border: 'none',
              bgcolor: 'transparent',
              cursor: 'pointer',
              fontFamily: theme.typography.fontFamily,
              fontSize: 12,
              fontWeight: active ? 500 : 400,
              color: active ? theme.palette.kanap.text.primary : theme.palette.kanap.text.secondary,
              px: 1.25,
              py: 1,
              borderBottom: `2px solid ${active ? theme.palette.primary.main : 'transparent'}`,
              whiteSpace: 'nowrap',
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'color 120ms ease, border-color 120ms ease',
              '&:hover': { color: theme.palette.kanap.text.primary },
              '&:focus-visible': {
                outline: 'none',
                boxShadow: `inset 0 0 0 2px ${theme.palette.primary.main}`,
              },
            })}
          >
            {getPreviewLabel(preview)}
          </Box>
        );
      })}
    </Stack>
  );
}

export default function ArtifactPanel({
  previews,
  selectedId,
  open,
  disabled,
  onToggle,
  onSelect,
  onApprove,
  onReject,
}: ArtifactPanelProps) {
  const { t } = useTranslation(['ai']);

  // Always render nothing if there are no artifacts at all (avoids leaking the tab into views without long previews).
  if (previews.length === 0) return null;

  const tabLabel = t('artifactPanel.tab');
  const selected = previews.find((p) => p.preview_id === selectedId) || previews[previews.length - 1];

  return (
    <Box sx={{ display: 'flex', flexShrink: 0, height: '100%' }}>
      <ArtifactTab open={open} onToggle={onToggle} label={tabLabel} />

      {open && (
        <Box
          sx={(theme) => ({
            width: PANEL_WIDTH,
            minWidth: PANEL_WIDTH,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: theme.palette.kanap.bg.drawer,
            borderLeft: `1px solid ${theme.palette.kanap.border.default}`,
            height: '100%',
            position: 'relative',
            zIndex: 1,
          })}
        >
          <Stack
            direction="row"
            alignItems="center"
            sx={(theme) => ({
              height: 36,
              px: 1.5,
              borderBottom: `1px solid ${theme.palette.kanap.border.soft}`,
              flexShrink: 0,
            })}
          >
            <Typography
              component="span"
              sx={{
                fontSize: 12,
                fontWeight: 500,
                color: 'kanap.text.secondary',
                letterSpacing: 0.2,
                flex: 1,
              }}
            >
              {t('artifactPanel.title')}
            </Typography>
            <IconButton
              size="small"
              aria-label={t('artifactPanel.close')}
              onClick={onToggle}
              sx={{ color: 'kanap.text.tertiary', width: 24, height: 24 }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>

          <ArtifactTabBar previews={previews} selectedId={selected.preview_id} onSelect={onSelect} />

          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 1.5,
              minHeight: 0,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'action.disabled', borderRadius: 2 },
              '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
              scrollbarWidth: 'thin',
              scrollbarColor: 'auto transparent',
            }}
          >
            <PreviewCard
              preview={selected}
              disabled={disabled}
              onApprove={onApprove}
              onReject={onReject}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
