import React from 'react';
import { Box, IconButton } from '@mui/material';
import { MONO_FONT_FAMILY } from '../../../config/ThemeContext';
import { taskDetailTokens } from '../theme/taskDetailTokens';

interface TaskNavChipProps {
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export default function TaskNavChip({ currentIndex, totalCount, onPrev, onNext, hasPrev, hasNext }: TaskNavChipProps) {
  if (totalCount <= 0) return null;

  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        py: '3px',
        px: '9px',
        borderRadius: taskDetailTokens.borderRadius.pill,
        bgcolor: theme.palette.kanap.navChip.bg,
        border: `1px solid ${theme.palette.kanap.navChip.border}`,
        ml: '6px',
      })}
    >
      <IconButton
        onClick={onPrev}
        disabled={!hasPrev}
        aria-label="Previous task"
        sx={(theme) => ({
          p: 0,
          color: theme.palette.kanap.navChip.fg,
          fontSize: '11px',
          lineHeight: 1,
          minWidth: 0,
          '&.Mui-disabled': { opacity: 0.35 },
        })}
        size="small"
      >
        ‹
      </IconButton>
      <Box
        component="span"
        sx={(theme) => ({
          fontFamily: MONO_FONT_FAMILY,
          fontSize: '11px',
          fontWeight: 500,
          color: theme.palette.kanap.navChip.fg,
          userSelect: 'none',
        })}
      >
        {currentIndex} of {totalCount}
      </Box>
      <IconButton
        onClick={onNext}
        disabled={!hasNext}
        aria-label="Next task"
        sx={(theme) => ({
          p: 0,
          color: theme.palette.kanap.navChip.fg,
          fontSize: '11px',
          lineHeight: 1,
          minWidth: 0,
          '&.Mui-disabled': { opacity: 0.35 },
        })}
        size="small"
      >
        ›
      </IconButton>
    </Box>
  );
}
