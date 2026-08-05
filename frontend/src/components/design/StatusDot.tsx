import React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

function mergeSx(...items: Array<SxProps<Theme> | undefined>): SxProps<Theme> {
  return items.flatMap((sx) => {
    if (!sx) return [];
    return Array.isArray(sx) ? sx : [sx];
  }) as SxProps<Theme>;
}

type StatusDotProps = {
  /** Resolved CSS color — typically `getDotColor(colorKey, theme.palette.mode)`. */
  color: string;
  /** Diameter in px. Tables/lists use 6 (default); metadata bars use 8. */
  size?: number;
  sx?: SxProps<Theme>;
};

/**
 * The charter status dot: a small colored circle rendered inline before a
 * status label (dot + text pattern). Color semantics come from
 * `utils/statusColors.ts` — pass the resolved color, not the palette key.
 */
export function StatusDot({ color, size = 6, sx }: StatusDotProps) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={mergeSx(
        {
          width: size,
          height: size,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'inline-block',
          bgcolor: color,
        },
        sx,
      )}
    />
  );
}
