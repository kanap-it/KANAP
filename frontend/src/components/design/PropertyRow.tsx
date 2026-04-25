import React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { drawerFieldValueSx } from '../../theme/formSx';

type PropertyRowProps = {
  children: React.ReactNode;
  label: React.ReactNode;
  labelSx?: SxProps<Theme>;
  required?: boolean;
  sx?: SxProps<Theme>;
  valueSx?: SxProps<Theme>;
};

type PropertyGroupProps = {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
};

function mergeSx(...items: Array<SxProps<Theme> | undefined>): SxProps<Theme> {
  return items.flatMap((sx) => {
    if (!sx) return [];
    return Array.isArray(sx) ? sx : [sx];
  }) as SxProps<Theme>;
}

export function PropertyRow({
  children,
  label,
  labelSx,
  required = false,
  sx,
  valueSx,
}: PropertyRowProps) {
  return (
    <Box
      sx={mergeSx(
        {
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          py: '5px',
        },
        sx,
      )}
    >
      <Box
        sx={mergeSx(
          (theme) => ({
            fontSize: 12,
            lineHeight: 1.3,
            color: theme.palette.kanap.text.tertiary,
          }),
          labelSx,
        )}
      >
        {label}
        {required && (
          <Box component="span" sx={{ color: 'warning.main', ml: 0.25 }}>
            *
          </Box>
        )}
      </Box>
      <Box
        sx={mergeSx(
          drawerFieldValueSx,
          (theme) => ({ color: theme.palette.kanap.text.primary }),
          valueSx,
        )}
      >
        {children}
      </Box>
    </Box>
  );
}

export function PropertyGroup({ children, sx }: PropertyGroupProps) {
  return (
    <Box
      sx={mergeSx(
        (theme) => ({
          padding: '6px 18px 8px',
          '& + &': {
            borderTop: `1px solid ${theme.palette.kanap.border.soft}`,
            marginTop: '6px',
            paddingTop: '10px',
          },
        }),
        sx,
      )}
    >
      {children}
    </Box>
  );
}
