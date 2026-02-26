import type { PaperProps } from '@mui/material';
import { Paper, ThemeProvider } from '@mui/material';
import { lightIslandTheme } from '../config/ThemeContext';

export default function LightModeIsland({ children, sx, variant, ...paperProps }: PaperProps) {
  return (
    <ThemeProvider theme={lightIslandTheme}>
      <Paper
        {...paperProps}
        variant={variant ?? 'outlined'}
        sx={[
          {
            bgcolor: 'background.default',
            borderRadius: 1,
            overflow: 'hidden',
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
        ]}
      >
        {children}
      </Paper>
    </ThemeProvider>
  );
}
